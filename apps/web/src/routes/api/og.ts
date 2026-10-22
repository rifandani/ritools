import { createFileRoute } from "@tanstack/react-router";

import { answerCard } from "@/features/og/og.card.server";

/**
 * The Open Graph card, drawn on request.
 *
 * Every route names its card with `ogImagePath` (`@/features/og/og.params`),
 * and this route answers it. A card that cannot be drawn is a `500` that no
 * cache may keep, so the next request tries again.
 */
const GET = async ({ request }: { request: Request }): Promise<Response> => {
  try {
    return await answerCard(request);
  } catch {
    return new Response("The card could not be drawn.", {
      headers: { "cache-control": "no-store", "content-type": "text/plain" },
      status: 500,
    });
  }
};

export const Route = createFileRoute("/api/og")({
  // A GET-only endpoint: the CSRF middleware in `start.ts` guards server
  // functions, and this route changes no state.
  server: { handlers: { GET } },
});
