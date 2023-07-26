# RTS

An OpenSource RTS game.

## Important information about building on Windows

Unfortunately, the project doesn't build on Windows straight off NPM. Because of the native `node-datachannel` dependency, it requires CMake and OpenSSL to be manually installed and present.

I personally opt to add CMake to `PATH` (both for CMD and MSYS2 shells), and to enable CMake to find OpenSSL, the easiest way is to set `OPENSSL_ROOT_DIR` before running `npm install`. The "root" directory is the one containing the `bin` folder.
