import { Buffer } from "buffer";
// Polyfill Buffer for @solana/web3.js / Reown in the browser.
if (typeof window !== "undefined" && !(window as unknown as { Buffer?: unknown }).Buffer) {
  (window as unknown as { Buffer: typeof Buffer }).Buffer = Buffer;
}

import "@fontsource-variable/inter";
import "@fontsource-variable/fraunces";
import "./index.css";

import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
