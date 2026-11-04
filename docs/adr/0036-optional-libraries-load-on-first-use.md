# Optional libraries load on first use

Tool libraries load when their function first runs, including a visible default preview. The shared React, routing, Effect, accessibility, and toast libraries stay available at startup. Optional JavaScript, WASM, models, and Worker assets are cached after use, with no background download before use; this reduces first-visit transfer at the cost of offline access to functions that have not been used.

The first page can finish its asset requests before the service worker takes control. The app copies already-used public code and font responses from the browser HTTP cache into the runtime cache, without a network download. This keeps first-visit offline reloads available.

A failed library import, Worker startup, asset load, or initialization shows one translated toast per attempt: “X library failed to load — check network or ad-blocker”. This includes optional Browser Agent support. File and processing errors keep their own messages. Failed application load caches are cleared so the next user action can try again with the same inputs; when the browser cannot recover a module, the UI offers Reload.
