import { useState, useSyncExternalStore } from "react";

const subscribe = (notify: () => void) => {
  document.addEventListener("fullscreenchange", notify);
  return () => document.removeEventListener("fullscreenchange", notify);
};
const serverStatus = () => "unsupported" as const;

/** Browser events also cover Escape and the browser's own exit control. */
export const useFullscreen = () => {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [failed, setFailed] = useState(false);
  const status = useSyncExternalStore(
    subscribe,
    () => {
      if (!document.fullscreenEnabled) {
        return "unsupported";
      }
      return element && document.fullscreenElement === element
        ? "fullscreen"
        : "windowed";
    },
    serverStatus
  );
  const toggle = async () => {
    const frame = element;
    if (!frame || status === "unsupported") {
      return;
    }
    setFailed(false);
    try {
      await (document.fullscreenElement === frame
        ? document.exitFullscreen()
        : frame.requestFullscreen());
    } catch {
      setFailed(true);
    }
  };
  return {
    ref: setElement,
    element,
    active: status === "fullscreen",
    supported: status !== "unsupported",
    failed,
    toggle,
  };
};
