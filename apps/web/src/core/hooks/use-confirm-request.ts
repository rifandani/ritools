import { useCallback, useRef, useState } from "react";

/** What a confirm modal needs from `useConfirmRequest`. */
export interface ConfirmHandle {
  readonly confirm: () => void;
  readonly isOpen: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

/**
 * A confirm modal that both the user and an Agent Action can open.
 *
 * The user opens it with its trigger. An Agent Action opens it with `request`
 * and waits: the promise resolves `true` when the user confirms and `false`
 * when the user cancels or dismisses it. Only the user answers.
 */
export const useConfirmRequest = () => {
  const [isOpen, setIsOpen] = useState(false);
  const pending = useRef<((answer: boolean) => void) | null>(null);

  const answer = useCallback((value: boolean) => {
    const resolve = pending.current;
    pending.current = null;
    resolve?.(value);
  }, []);

  /** Opens the modal for an Agent Action and waits for the user's answer. */
  const request = useCallback((): Promise<boolean> => {
    // A second request replaces the first, which the user did not answer.
    answer(false);
    setIsOpen(true);
    const { promise, resolve } = Promise.withResolvers<boolean>();
    pending.current = resolve;
    return promise;
  }, [answer]);

  /**
   * The modal's `onOpenChange`. A close without confirm is a "no". A close
   * button closes the modal before its own press handler runs, so the "no"
   * waits one task and a confirm in that press wins.
   */
  const onOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);
      if (!open) {
        setTimeout(() => {
          answer(false);
        }, 0);
      }
    },
    [answer]
  );

  /** Call from the confirm control, before the modal closes. */
  const confirm = useCallback(() => {
    answer(true);
  }, [answer]);

  return { confirm, isOpen, onOpenChange, request };
};
