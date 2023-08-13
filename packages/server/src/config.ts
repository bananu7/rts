import geckos, { iceServers } from '@geckos.io/server'
import {readFileSync } from 'fs';
import { isErrnoException } from './tsutil.js'

export function getVersion() {
    let version = "uknown version";
    try {
        version = readFileSync("version.txt", "utf8");
    }
    catch (err) { }
    return version;
}

export type Config = {
    iceServers: RTCIceServer[],
    httpPort: number,
    tickMs: number,
    baseUrl: string,
}

export function getDefaultConfig(): Config {
    return {
        iceServers: iceServers,
        httpPort: 9208,
        tickMs: 50,
        baseUrl: "",
    }
}

export function getConfig(): Config {
    console.log("[config] Getting confifg");

    const config = getDefaultConfig();

    try {
        const configOverride = JSON.parse(readFileSync("config.json", "utf8")) as Config;
        return { ...config, ...configOverride };
    }
    catch (err) {
        // rethrow if it's something else than file missing
        if (!isErrnoException(err) || err.code !== 'ENOENT') {
            throw err;
        }
    }

    return config;
}
