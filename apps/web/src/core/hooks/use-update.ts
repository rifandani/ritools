import { useState } from "react";

/**
 * A hook that returns a function which can be used to force the component to re-render.
 */
// fallow-ignore-next-line unused-export -- other hooks import this; those hooks are not app entry points yet
export const useUpdate = () => {
  const [, setState] = useState({});
  const update = () => setState({});
  return update;
};
