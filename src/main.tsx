import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "@fontsource/limelight";
import "@fontsource-variable/hanken-grotesk";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
