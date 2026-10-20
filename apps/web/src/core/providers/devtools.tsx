import { TanStackDevtools } from "@tanstack/react-devtools";
import { useRouter } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

export const Devtools = () => {
  // Per-request instance: read it from context, never from a module singleton.
  const router = useRouter();
  return (
    <TanStackDevtools
      config={{
        position: "bottom-left",
      }}
      plugins={[
        {
          name: "TanStack Router",
          render: <TanStackRouterDevtoolsPanel router={router} />,
        },
      ]}
    />
  );
};
