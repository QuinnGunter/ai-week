//
// minifyStaticPlugin.ts
//
//  mmhmm
//
//  Copyright 2025 mmhmm inc. All rights reserved.
// --------------------------------------------------
// Production-only plugin that copies worker assets into the build output and
// minifies JavaScript worker scripts so their source maps are picked up by
// the Sentry Vite plugin.

import * as fs from "fs";
import * as path from "path";
import micromatch from "micromatch";
import { transform, TransformOptions } from "esbuild";
import type { Plugin } from "vite";
import { stringToUUID, getDebugIdSnippet } from "@sentry/bundler-plugin-core";

export interface MinifyStaticPluginOptions {
    /** Directory containing worker files (relative to project root). */
    src: string;
    /** Folder name inside outDir where files will be written. */
    dest: string;
    /** Glob pattern(s) (relative to `src`) that should be minified. */
    minify: string[];
    /** Additional esbuild options; minify & sourcemap are fixed internally. */
    esbuild?: Omit<TransformOptions, "minify" | "sourcemap" | "sourcefile">;
}

export function minifyStaticPlugin(opts: MinifyStaticPluginOptions): Plugin {
    const srcPath = path.resolve(process.cwd(), opts.src);
    const destDir = opts.dest.replace(/^[./]+/, "");
    const minifyPatterns = opts.minify;
    const esUser = opts.esbuild ?? {};

    return {
        name: "minify-static-workers",
        apply: "build",

        async generateBundle(output) {
            const processOne = async (abs: string, relName: string) => {
                const shouldMinify = micromatch([relName], minifyPatterns).length > 0;

                const outBase = destDir ? `${destDir}/${relName}` : relName;

                let source: string | Buffer = fs.readFileSync(abs);

                if (shouldMinify && relName.endsWith(".js")) {
                    const original = source.toString();
                    const debugId = stringToUUID(original);

                    const { code, map } = await transform(original, {
                        ...esUser,
                        minify: true,
                        target: esUser.target ?? "es2020",
                        sourcemap: output.sourcemap ? "external" : false,
                        sourcefile: outBase,
                        banner: getDebugIdSnippet(debugId) + "\n"
                    });

                    let final = code;
                    if (output.sourcemap && map) {
                        if (output.sourcemap !== "hidden") {
                            final += `\n//# sourceMappingURL=${relName}.map`;
                        }
                        const mapFile = destDir
                            ? `${destDir}/${relName}.map`
                            : `${relName}.map`;
                        this.emitFile({ type: "asset", fileName: mapFile, source: map });
                    }
                    source = final;
                }

                this.emitFile({
                    type: "asset",
                    fileName: outBase.replace(/\\/g, "/"),
                    source: Buffer.isBuffer(source) ? new Uint8Array(source) : source
                });
            };

            if (!fs.existsSync(srcPath)) return;

            const stats = fs.statSync(srcPath);

            if (stats.isFile()) {
                await processOne(srcPath, path.basename(srcPath));
                return;
            }

            const entries = fs.readdirSync(srcPath, { withFileTypes: true });

            for (const entry of entries) {
                if (!entry.isFile()) continue;
                const abs = path.join(srcPath, entry.name);
                await processOne(abs, entry.name);
            }
        }
    };
}
