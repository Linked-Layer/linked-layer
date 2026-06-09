import "@fontsource-variable/inter";
import "@fontsource-variable/fraunces";
import "./index.css";

import ReactDOM from "react-dom/client";
import { App } from "./App";

// StrictMode is intentionally omitted: its dev-only double-mount replays framer-motion
// `whileInView` entrances (cards flash in → out → in). Production never double-mounts,
// so this only affects the dev experience.
ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
