"use client";

import { useEffect, useState } from "react";

/**
 * An object URL for one Blob, revoked when the Blob changes or the component
 * unmounts. A server render prints null: there is no URL until the browser
 * has the bytes.
 */
export const useObjectUrl = (blob: Blob | null | undefined): string | null => {
  const [current, setCurrent] = useState<{ blob: Blob; url: string } | null>(
    null
  );
  useEffect(() => {
    if (blob === null || blob === undefined) {
      return;
    }
    const next = URL.createObjectURL(blob);
    // oxlint-disable-next-line react/set-state-in-effect -- an object URL is made by the browser, so it cannot be derived during render
    setCurrent({ blob, url: next });
    return () => {
      URL.revokeObjectURL(next);
    };
  }, [blob]);
  // A new source must never render a URL revoked by the previous cleanup.
  return current !== null && current.blob === blob ? current.url : null;
};
