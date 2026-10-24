# The GPS map is an offline locator

ADR-0007 says user data never crosses the network. A normal tile map sends the GPS coordinates to a tile server, so Expose cannot use one. The map is an offline locator: a point on a world outline that ships with the app, with the coordinates and a copy action. It loads no tiles, does no reverse geocoding, and offers no external map link.

The cost is map detail. The locator shows where a point is, not how to navigate to it. In return, the map works offline and the coordinates never leave the device.

## Consequences

- A future map with more detail must also ship its data with the app.
- The map has a text alternative: the coordinates and the altitude, in text.
