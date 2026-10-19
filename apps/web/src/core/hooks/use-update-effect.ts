import { useEffect } from "react";

import { createUpdateEffect } from "@/core/hooks/create-update-effect";
/**
 * A hook alike `useEffect` but skips running the effect for the first time.
 */
// fallow-ignore-next-line unused-export -- other hooks import this; those hooks are not app entry points yet
export const useUpdateEffect = createUpdateEffect(useEffect);
