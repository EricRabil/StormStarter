import { Logger, Process, LogMessage } from '../util';
import parcel = require('parcel');
import path from "path";

export const FRONTEND_DIRECTORY = path.join(__dirname, "..", "..", "src", "frontend");
export const FRONTEND_ENTRY = path.join(FRONTEND_DIRECTORY, "index.html");
export const FRONTEND_COMPILED_DIRECTORY = path.join(__dirname, "..", "frontend");

const options = {
    outDir: FRONTEND_COMPILED_DIRECTORY, // The out directory to put the build files in, defaults to dist
    outFile: 'index.html', // The name of the outputFile
    watch: true, // whether to watch the files and rebuild them on change, defaults to process.env.NODE_ENV !== 'production'
    cache: true, // Enabled or disables caching, defaults to true
    cacheDir: '.cache', // The directory cache gets put in, defaults to .cache
    minify: process.env.NODE_ENV === 'production', // Minify files, enabled if process.env.NODE_ENV === 'production'
    target: 'browser', // browser/node/electron, defaults to browser
    https: process.env.NODE_ENV === 'production', // Server files over https or http, defaults to false
    logLevel: process.env.NODE_ENV === 'production' ? 1 : 3, // 3 = log everything, 2 = log warnings & errors, 1 = log errors
    hmrPort: 0, // The port the hmr socket runs on, defaults to a random free port (0 in node.js resolves to a random free port)
    sourceMaps: process.env.NODE_ENV !== 'production', // Enable or disable sourcemaps, defaults to enabled (not supported in minified builds yet)
    hmrHostname: '', // A hostname for hot module reload, default to ''
    detailedReport: false // Prints a detailed report of the bundles, assets, filesizes and times, defaults to false, reports are only printed if watch is disabled
};

// parcel watch index.html -d ../../out/frontend


Logger.debug(options as any);

/**
 * Simple wrapper for managing parcel watch
 */
export class FrontendWatcher {

    public async start() {
        const parcel = new Process("parcel watch index.html -d ../../out/frontend", {
            cwd: FRONTEND_DIRECTORY,
            env: process.env as any
        });
        parcel.on("data", (data: LogMessage) => {
            Logger[data.stream === "stdout" ? "info" : "error"](data.content);
        })
        let code: number;
        try {
            code = await parcel.exec();
        } catch (e) {
            console.error(e);
            return;
        }
        if (code !== 0) {
            Logger.info("Dumping Parcel watch log.");
            for (let entry of parcel.log) {
                console.log(`[${entry.timestamp}] [${entry.stream}] ${entry.content}`);
            }
            throw new Error(`Parcel closed with non-zero exit code (${code})`);
        }
        await this.start();
    }
}