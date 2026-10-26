import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { fingerprintOf } from "@/core/libs/files";
import type { DroppedFile } from "@/core/libs/files";
import { classifyWatchFailure, collectWatched } from "@/core/libs/watch-folder";
import type { DirectoryPicker } from "@/core/libs/watch-folder";

const subscribe = () => () => {
  // Browser support is fixed for this page load.
};
const serverSupported = () => false;
const browserSupported = () => {
  // SAFETY: Chromium supplies this optional API; other browsers omit it.
  const browser = globalThis as DirectoryPicker;
  return browser.showDirectoryPicker !== undefined;
};

/** One page owns the handle. A stopped or old scan cannot add files. */
export const useWatchFolder = (
  onFiles: (files: readonly DroppedFile[]) => void,
  existing: () => readonly string[]
) => {
  const supported = useSyncExternalStore(
    subscribe,
    browserSupported,
    serverSupported
  );
  const [status, setStatus] = useState<
    "idle" | "starting" | "watching" | "denied" | "revoked"
  >("idle");
  const epoch = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = useCallback(() => {
    epoch.current += 1;
    if (timer.current !== null) {
      clearTimeout(timer.current);
    }
    setStatus("idle");
  }, []);

  useEffect(
    () => () => {
      epoch.current += 1;
      if (timer.current !== null) {
        clearTimeout(timer.current);
      }
    },
    []
  );

  const start = useCallback(async () => {
    // SAFETY: the picker is optional because it is not in every browser.
    const browser = globalThis as DirectoryPicker;
    const picker = browser.showDirectoryPicker;
    if (picker === undefined) {
      return;
    }
    stop();
    const run = epoch.current;
    setStatus("starting");
    try {
      const root = await picker.call(globalThis, { mode: "read" });
      if (run !== epoch.current) {
        return;
      }
      const known = new Set(existing());
      const poll = async () => {
        try {
          const files = await collectWatched(root);
          if (run !== epoch.current) {
            return;
          }
          // Include manual uploads made while the folder scan was in flight.
          for (const key of existing()) {
            known.add(key);
          }
          const fresh = files.filter(({ file }) => {
            const key = fingerprintOf(file);
            if (known.has(key)) {
              return false;
            }
            known.add(key);
            return true;
          });
          if (fresh.length > 0) {
            onFiles(fresh);
          }
          setStatus("watching");
          // Schedule after the scan, so a slow folder cannot overlap itself.
          timer.current = setTimeout(() => {
            void poll();
          }, 2000);
        } catch {
          if (run === epoch.current) {
            stop();
            setStatus("revoked");
          }
        }
      };
      await poll();
    } catch (error) {
      if (run === epoch.current) {
        setStatus(
          classifyWatchFailure(error) === "cancelled" ? "idle" : "denied"
        );
      }
    }
  }, [existing, onFiles, stop]);

  return { start, stop, supported, status };
};
