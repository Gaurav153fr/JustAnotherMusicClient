use serde::Deserialize;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter};
use windows::{
    core::HSTRING,
    Foundation::{TypedEventHandler, Uri},
    Media::Playback::{
        MediaCommandEnablingRule, MediaPlaybackCommandManager,
        MediaPlaybackCommandManagerNextReceivedEventArgs,
        MediaPlaybackCommandManagerPauseReceivedEventArgs,
        MediaPlaybackCommandManagerPlayReceivedEventArgs,
        MediaPlaybackCommandManagerPreviousReceivedEventArgs, MediaPlayer,
    },
    Media::{
        MediaPlaybackStatus, MediaPlaybackType, SystemMediaTransportControls,
    },
    Storage::Streams::RandomAccessStreamReference,
};

const MEDIA_CONTROL_EVENT: &str = "windows-media-control";

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaSessionUpdate {
    title: Option<String>,
    artist: Option<String>,
    artwork_url: Option<String>,
    status: String,
}

pub struct WindowsMediaSession(Mutex<Option<NativeMediaSession>>);

struct NativeMediaSession {
    _player: MediaPlayer,
    _command_manager: MediaPlaybackCommandManager,
    controls: SystemMediaTransportControls,
    _play_token: i64,
    _pause_token: i64,
    _next_token: i64,
    _previous_token: i64,
}

impl WindowsMediaSession {
    pub fn new() -> Self {
        Self(Mutex::new(None))
    }

    fn with_session<T>(
        &self,
        app: &AppHandle,
        callback: impl FnOnce(&NativeMediaSession) -> Result<T, String>,
    ) -> Result<T, String> {
        let mut session = self.0.lock().map_err(|error| error.to_string())?;
        if session.is_none() {
            *session = Some(NativeMediaSession::new(app.clone())?);
        }
        callback(session.as_ref().expect("media session initialized"))
    }
}

impl NativeMediaSession {
    fn new(app: AppHandle) -> Result<Self, String> {
        let player = MediaPlayer::new().map_err(|error| error.to_string())?;
        let controls = player
            .SystemMediaTransportControls()
            .map_err(|error| error.to_string())?;

        controls
            .SetIsEnabled(true)
            .and_then(|_| controls.SetIsPlayEnabled(true))
            .and_then(|_| controls.SetIsPauseEnabled(true))
            .and_then(|_| controls.SetIsNextEnabled(true))
            .and_then(|_| controls.SetIsPreviousEnabled(true))
            .map_err(|error| error.to_string())?;

        let command_manager = player.CommandManager().map_err(|error| error.to_string())?;
        command_manager
            .SetIsEnabled(true)
            .and_then(|_| {
                command_manager
                    .PlayBehavior()?
                    .SetEnablingRule(MediaCommandEnablingRule::Always)
            })
            .and_then(|_| {
                command_manager
                    .PauseBehavior()?
                    .SetEnablingRule(MediaCommandEnablingRule::Always)
            })
            .and_then(|_| {
                command_manager
                    .NextBehavior()?
                    .SetEnablingRule(MediaCommandEnablingRule::Always)
            })
            .and_then(|_| {
                command_manager
                    .PreviousBehavior()?
                    .SetEnablingRule(MediaCommandEnablingRule::Always)
            })
            .map_err(|error| error.to_string())?;

        let play_app = app.clone();
        let play_token = command_manager
            .PlayReceived(&TypedEventHandler::<
                MediaPlaybackCommandManager,
                MediaPlaybackCommandManagerPlayReceivedEventArgs,
            >::new(move |_sender, args| {
                if let Some(args) = args.as_ref() {
                    args.SetHandled(true)?;
                }
                let _ = play_app.emit(MEDIA_CONTROL_EVENT, "play");
                Ok(())
            }))
            .map_err(|error| error.to_string())?;

        let pause_app = app.clone();
        let pause_token = command_manager
            .PauseReceived(&TypedEventHandler::<
                MediaPlaybackCommandManager,
                MediaPlaybackCommandManagerPauseReceivedEventArgs,
            >::new(move |_sender, args| {
                if let Some(args) = args.as_ref() {
                    args.SetHandled(true)?;
                }
                let _ = pause_app.emit(MEDIA_CONTROL_EVENT, "pause");
                Ok(())
            }))
            .map_err(|error| error.to_string())?;

        let next_app = app.clone();
        let next_token = command_manager
            .NextReceived(&TypedEventHandler::<
                MediaPlaybackCommandManager,
                MediaPlaybackCommandManagerNextReceivedEventArgs,
            >::new(move |_sender, args| {
                if let Some(args) = args.as_ref() {
                    args.SetHandled(true)?;
                }
                let _ = next_app.emit(MEDIA_CONTROL_EVENT, "next");
                Ok(())
            }))
            .map_err(|error| error.to_string())?;

        let previous_token = command_manager
            .PreviousReceived(&TypedEventHandler::<
                MediaPlaybackCommandManager,
                MediaPlaybackCommandManagerPreviousReceivedEventArgs,
            >::new(move |_sender, args| {
                if let Some(args) = args.as_ref() {
                    args.SetHandled(true)?;
                }
                let _ = app.emit(MEDIA_CONTROL_EVENT, "previous");
                Ok(())
            }))
            .map_err(|error| error.to_string())?;

        Ok(Self {
            _player: player,
            _command_manager: command_manager,
            controls,
            _play_token: play_token,
            _pause_token: pause_token,
            _next_token: next_token,
            _previous_token: previous_token,
        })
    }

    fn update(&self, update: MediaSessionUpdate) -> Result<(), String> {
        let updater = self
            .controls
            .DisplayUpdater()
            .map_err(|error| error.to_string())?;

        if let Some(title) = update.title {
            updater.ClearAll().map_err(|error| error.to_string())?;
            updater
                .SetType(MediaPlaybackType::Music)
                .and_then(|_| updater.MusicProperties())
                .and_then(|properties| {
                    properties.SetTitle(&HSTRING::from(title))?;
                    properties.SetArtist(&HSTRING::from(update.artist.unwrap_or_default()))
                })
                .map_err(|error| error.to_string())?;

            if let Some(artwork_url) = update.artwork_url {
                if let Ok(uri) = Uri::CreateUri(&HSTRING::from(artwork_url)) {
                    if let Ok(thumbnail) = RandomAccessStreamReference::CreateFromUri(&uri) {
                        updater
                            .SetThumbnail(&thumbnail)
                            .map_err(|error| error.to_string())?;
                    }
                }
            }

            updater.Update().map_err(|error| error.to_string())?;
        } else {
            updater.ClearAll().map_err(|error| error.to_string())?;
        }

        let status = match update.status.as_str() {
            "playing" => MediaPlaybackStatus::Playing,
            "paused" => MediaPlaybackStatus::Paused,
            "loading" => MediaPlaybackStatus::Changing,
            _ => MediaPlaybackStatus::Stopped,
        };
        self.controls
            .SetPlaybackStatus(status)
            .map_err(|error| error.to_string())
    }
}

#[tauri::command]
pub fn update_windows_media_session(
    app: AppHandle,
    state: tauri::State<'_, WindowsMediaSession>,
    update: MediaSessionUpdate,
) -> Result<(), String> {
    state.with_session(&app, |session| session.update(update))
}
