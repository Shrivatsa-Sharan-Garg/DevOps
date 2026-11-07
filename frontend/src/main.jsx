import {StrictMode} from "react";
import {createRoot} from "react-dom/client";
import {BrowserRouter} from "react-router";
import {MotionConfig} from "motion/react";
import "@fontsource-variable/inter";
import "@fontsource-variable/sora";
import "@fontsource-variable/jetbrains-mono";
import App from "./App";
import {SessionProvider} from "./context/SessionContext";
import {ToastProvider} from "./context/ToastContext";
import "./styles/index.css";

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <BrowserRouter>
            <MotionConfig reducedMotion="user">
                <SessionProvider>
                    <ToastProvider>
                        <App/>
                    </ToastProvider>
                </SessionProvider>
            </MotionConfig>
        </BrowserRouter>
    </StrictMode>
);
