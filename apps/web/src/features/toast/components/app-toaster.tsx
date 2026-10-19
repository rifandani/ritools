import { useAtomValue } from "@effect/atom-react";
import { Toaster } from "sonner";

import { toasterPropsAtom } from "@/features/toast/toast.atoms";

/** The app's one `Toaster`. Call sonner's `toast()` from anywhere to show one. */
export const AppToaster = () => <Toaster {...useAtomValue(toasterPropsAtom)} />;
