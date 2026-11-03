# Agent Actions hand data to the user's Browser Agent

Squeeze, Expose, Qraft, and Unmask offer Agent Actions through WebMCP. An Agent Action result goes to the Browser Agent, and that agent can send it to a remote model. Ritools still uploads nothing: the Browser Agent is a program the user chose and runs, like a screen reader, so it gets what the user can already see on the page. [ADR-0007](./0007-tools-run-on-local-data-only.md) stays true, because no request from Ritools carries user data.

Each Tool limits what its results carry. Expose returns Metadata Field values, because an agent cannot help with a Clean if it cannot read the Metadata Report. Squeeze and Unmask return no pixels: only settings, states, sizes, and counts. Qraft returns the Payload and the SVG text it wrote. File bytes never go into or come out of an Agent Action. An Agent Action works on the files the user put in the Batch, and a download it starts is the same download the Tool's own controls start. For the same reason, only the user picks a Qraft logo, and Qraft batch input comes in as CSV or line text, not as a file.

Results that hold text from a file (Metadata Field values, file names) set `untrustedContentHint`, because a file can carry text written to steer an agent.

## Considered Options

- **Only counts and states, no values.** Rejected: it makes the Expose Agent Actions useless.
- **File bytes as base64 arguments or results.** Rejected: slow, limited by the context window, and it puts the pixels the Unmask promise protects into the agent's context.
- **A URL argument that the page fetches.** Rejected: Ritools would make a network request for user data.
