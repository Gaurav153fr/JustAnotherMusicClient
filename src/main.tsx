import React from "react";
import ReactDOM from "react-dom/client";
import App from "./ui/App";
import "./ui/styles/global.css";
import { logInternalError, logInternalInfo } from "./internal/logging";
import { applyPaperPcMode } from "./ui/settings/paperPcMode";

logInternalInfo("main.bootstrap start");
applyPaperPcMode();

window.addEventListener("error", (event) => {
  logInternalError("window.error", event.error ?? event.message, {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
});

window.addEventListener("unhandledrejection", (event) => {
  logInternalError("window.unhandledrejection", event.reason);
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
