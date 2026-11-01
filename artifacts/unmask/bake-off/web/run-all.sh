#!/bin/sh
set -e
cd "$(dirname "$0")"
node run-browser.cjs isnet-int8 webgpu
node run-browser.cjs isnet-int8 wasm
node run-browser.cjs modnet-int8 webgpu
node run-browser.cjs modnet-int8 wasm
