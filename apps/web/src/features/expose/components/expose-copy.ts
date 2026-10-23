import { toast } from "sonner";

/**
 * Copy a value the page prints, and say so in one toast. A clipboard that
 * refuses (an insecure context, a denied permission) says nothing rather than
 * claiming a copy that did not happen.
 */
export const copyText = (value: string, message: string): void => {
  void (async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(message);
    } catch {
      // The value stays on the page; the user can select it.
    }
  })();
};
