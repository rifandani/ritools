# Tools run on local data only

A Tool reads and writes local data only: no account, no upload, no server storage. User data, and image bytes in particular, never cross the network; the shell may still load its own assets.

We took the harder path on purpose. Compression on a server is simpler, faster, and cheaper to build, but a server that receives user files needs an upload endpoint, a storage policy, a deletion policy, and a privacy promise that the user must simply trust. A local Tool needs none of that, and its promise becomes structural instead of a policy. The cost is real: every Tool must do its work in the browser, inside the memory and CPU limits of the device.
