import { createFileRoute } from "@tanstack/react-router";

import { answerRelay } from "@/features/snag/snag.relay.server";

/**
 * The Video Relay of Snag (ADR-0039). A GET-only endpoint: it changes no
 * state, and it answers only this site's own pages.
 */
const GET = ({ request }: { request: Request }): Promise<Response> =>
  answerRelay(request);

export const Route = createFileRoute("/api/snag/media")({
  server: { handlers: { GET } },
});
