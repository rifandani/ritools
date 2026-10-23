import { Atom } from "effect/reactivity";

import { colorModeAtom } from "@/features/color-mode/color-mode.atoms";
import { toasterProps } from "@/features/toast/toast";

/**
 * Props of the app's one `Toaster`. The toast theme follows the color mode; the
 * server cannot read the color mode, so a server render uses `auto`.
 *
 * The server value is one cached object. React compares `getServerSnapshot`
 * results during hydration, so a fresh object on every call to this getter
 * warns that the snapshot is not cached and can loop.
 */
const serverToasterProps = toasterProps("auto");

export const toasterPropsAtom = Atom.make((get) =>
  toasterProps(get(colorModeAtom))
).pipe(Atom.withServerValue(() => serverToasterProps));
