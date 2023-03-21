# RTS

An OpenSource RTS game.

## Windows MSYS2 workaround for node-datachannel native dependency
For inexplicable reasons this fails. To fix, get OpenSSL 3.0.5 and before doing `lerna bootstrap`, do (e.g.):

```
set OPENSSL_ROOT_DIR=C:\DEV\openssl-3.0.5\openssl-3\x64
```

The root dir is the one which has include/bin/lib directly inside.

Also make sure `cmake` is in PATH, `cmake-js` doesn't work.