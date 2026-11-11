# Snag relays video requests through the app origin

Snag is the first Tool that the browser cannot run alone. The video site does not allow requests from other origins, and its media URLs work only from the IP address that asked for them. Snag therefore asks the video site from the server and carries the media through a same-origin Video Relay. A server function reads the video's streams with the visionOS client of `youtubei.js`. This client returned complete streams without a player script or PO token in the live check described below. The relay fetches one range of at most 4 MiB per call from the media hosts only, and streams it back. It keeps no data, writes no logs of Video Links, and has no account. The Save Options, the muxing, and the MP3 encoding stay in the browser.

This narrows ADR-0007 for Snag only. The relay never receives a user file. Its only input is a public Video Link, and its only output is public media. No user data crosses the network that the user did not already send to the public video site.

## Considered options

- **Server does all the work (yt-dlp or ffmpeg on the server).** Rejected. It is a backend service with CPU cost, and serverless time and size limits apply.
- **A third-party API, such as a public cobalt instance.** Rejected. Each Video Link goes to an unknown operator, and the Tool fails when that service goes down.
- **No Snag.** Rejected. The user wants it to replace paid and ad-filled downloaders.

## Consequences

- The video site can block the deploy host's data-center IP addresses. The live check used a residential IP. No check ran from a data center. We accepted this risk, and the UI shows a named refusal state when the video site refuses the host.
- The WEB clients now use SABR streaming and give no direct media URLs. Snag uses AAC audio for MP4 and M4A. It does not offer WebM or Opus.
- The relay carries the full media bandwidth. It needs limits on request size, duration, and rate.
- The Tool does not work offline.
- The page shows a rights notice: download only content that you own or have permission to use.

## Amendment: use visionOS for complete streams

**2026-11-11.** For Video Link `yh5IAUow4Hc`, iOS returned video details and direct media addresses, but the media host served only the first 256 KiB in the live check. A 4 MiB range and even 1 KiB at the end returned HTTP 403. Refreshing the address gave the same result, so Snag reported that the stream address had expired.

Android VR served the complete audio stream but still refused video. The visionOS client served the complete 17,687,615-byte audio stream and 6,928,652-byte video stream through Snag's Video Relay. Snag now uses `VISIONOS` for both the first read and address renewal. Network-boundary regression tests run the real inspection, relay, and range-fetch code for audio and video against these failure patterns. Client access can change; a readable prefix alone is not proof that a stream can be saved.
