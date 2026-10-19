import { Atom } from "effect/reactivity";

import { colorModeAtom } from "@/features/color-mode/color-mode.atoms";
import { toasterProps } from "@/features/toast/toast";

/**
 * Props of the app's one `Toaster`. The toast theme follows the color mode; the
 * server cannot read the color mode, so a server render uses `auto`.
 */
export const toasterPropsAtom = Atom.make((get) =>
  toasterProps(get(colorModeAtom))
).pipe(Atom.withServerValue(() => toasterProps("auto")));
