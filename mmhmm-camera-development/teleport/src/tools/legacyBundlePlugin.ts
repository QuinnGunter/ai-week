//
//  legacyBundlePlugin.ts
//  mmhmm
//
//  Copyright 2025 mmhmm inc. All rights reserved.
//
//

import { resolve, basename, join } from "path";
import { stringToUUID, getDebugIdSnippet } from "@sentry/bundler-plugin-core";
import * as fs from "fs";
import { createHash } from "crypto";
import { transform, TransformOptions } from "esbuild";
import type { Plugin } from "vite";
import { tmpdir } from "os";
import { execFileSync } from "child_process";

export interface LegacyBundlePluginOptions {
    /**
     * esbuild transformation options that will be merged with the plugin's
     * own defaults. "sourcemap" and "sourcefile" are managed internally and
     * therefore ignored if provided here.
     */
    esbuild?: Omit<TransformOptions, "sourcemap" | "sourcefile">;

    /**
     * Generate and prepend the localization table using
     * teleport/localizations/make_table.js.
     *
     * Default: true
     */
    generateLocalizationTable?: boolean;
}

/**
 * Concatenate and minify legacy <script> tags into a single bundle.
 * The resulting file is hashed and injected into the HTML output.
 *
 * In dev-mode the plugin is ignored; it only runs for production builds.
 */
export function legacyBundlePlugin(options: LegacyBundlePluginOptions = {}): Plugin {
    const esbuildUserOptions = options.esbuild ?? {};

    return {
        name: "legacy-bundle-concat",
        apply: "build",
        enforce: "post",

        // See https://rollupjs.org/plugin-development/#generatebundle
        async generateBundle(output, bundle) {
            for (const [fileName, asset] of Object.entries(bundle)) {
                if (!fileName.endsWith(".html") || asset.type !== "asset") continue;

                let html = asset.source.toString();

                // Capture the entire <script> tag *plus* a potential inline HTML comment
                // that may directly follow it (e.g. "<!-- no-ship -->"). We keep the
                // whole match so we can later remove/replace it verbatim from the HTML.
                //   1st capture group (index 1) → full tag (+ optional comment)
                //   2nd capture group (index 2) → value of the src attribute
                const scriptRe =
                    /(<script[^>]+src="([^"]+)"[^>]*><\/script>(?:<!--[^>]*-->)?)/g;

                const locals: { tag: string; src: string }[] = [];
                let m: RegExpExecArray | null;
                while ((m = scriptRe.exec(html))) {
                    const tag = m[1];
                    const src = m[2];

                    // Skip ESM modules and remote URLs – we only bundle classic local
                    // scripts that ship with Teleport.
                    if (/type="module"/i.test(tag)) continue;
                    if (/^(https?:)?\/\//.test(src)) continue;

                    // Historical exclusions from makedeploy.sh --------------------------------
                    //  • Paths beginning with "./" (third-party libs, worker helpers, …)
                    //  • Anything that lives under tests/
                    //  • Tags marked with "no-ship" comment
                    if (/^\./.test(src)) continue;
                    if (/^tests\//.test(src) || /no-ship/i.test(tag)) {
                        continue;
                    }

                    locals.push({ tag, src });
                }
                if (!locals.length) continue;

                let cookiesCode = "";
                let localizationCode = "";
                const otherParts: string[] = [];
                const scanParts: string[] = [];
                for (const { src } of locals) {
                    const abs = resolve("teleport", src.replace(/^\.\//, ""));
                    if (!fs.existsSync(abs)) {
                        this.warn(`legacy-bundle: missing ${abs}`);
                        continue;
                    }
                    const fileContents = fs.readFileSync(abs, "utf8");

                    // Keep track of cookies.js and localization.js separately so that we
                    // can guarantee their relative ordering (cookies → localization →
                    // generated table → rest) to mirror makedeploy.sh.
                    if (/utils[\/]cookies\.js$/.test(abs)) {
                        cookiesCode = fileContents;
                        continue;
                    }

                    if (/core[\/]localization\.js$/.test(abs)) {
                        localizationCode = fileContents;
                        continue;
                    }

                    otherParts.push(`// === ${src} ===`);
                    otherParts.push(fileContents);

                    // Only non-special sources participate in the localisation scan.
                    scanParts.push(fileContents);
                }

                const baseName = basename(fileName, ".html");

                // Localization table generation ------------------------------------------------
                const scanSource = scanParts.join("\n\n");

                let tableJS = "";

                if (options.generateLocalizationTable !== false) {
                    try {
                        // Write the concatenated legacy sources to a temporary file so that
                        // teleport/localizations/make_table.js can analyse them and emit the
                        // minimal translation table needed for this entry point.
                        const tmpDir = fs.mkdtempSync(join(tmpdir(), "malk-loc-"));
                        const tmpFile = join(tmpDir, "bundle.js");
                        fs.writeFileSync(tmpFile, scanSource, "utf8");

                        // Run the generator and capture its stdout (the localisation JS).
                        tableJS = execFileSync(
                            "node",
                            [
                                resolve(
                                    process.cwd(),
                                    "teleport/localizations/make_table.js"
                                ),
                                resolve(process.cwd(), "teleport/localizations"),
                                tmpFile
                            ],
                            { encoding: "utf8" }
                        );

                        // Cleanup.
                        fs.rmSync(tmpDir, { recursive: true, force: true });
                    } catch (e) {
                        throw new Error("Failed to generate localization table", {
                            cause: e
                        });
                    }
                }

                // Build the final source in the desired order: cookies.js → localization.js
                // → generated table → everything else (preserving original order for those
                // remaining parts).
                const assembled: string[] = [];
                if (cookiesCode) assembled.push(cookiesCode);
                if (localizationCode) assembled.push(localizationCode);
                if (tableJS) assembled.push(tableJS);
                assembled.push(...otherParts);

                const source = assembled.join("\n\n");

                // Sentry source maps ---------------------------------------------------------------
                // Generate a stable debug id *before* running the transform so that we can
                // inject it via esbuild's `banner` option. Placing it in the banner means
                // the debug-id line is accounted for while esbuild builds the sourcemap, so
                // no post-processing line shift can occur.
                const debugId = stringToUUID(source);

                // Build the esbuild transform options, merging user overrides.
                const esOptions: TransformOptions = {
                    ...esbuildUserOptions,
                    sourcemap: output.sourcemap ? "external" : false,
                    sourcefile: `legacy-${baseName}-bundle.js`,
                    banner: `const gLocalDeployment = false;\n${getDebugIdSnippet(
                        debugId
                    )}\n`
                };

                const { code: transformedCode, map } = await transform(source, esOptions);

                // Calculate the hash from the *final* code (which already contains the
                // debug-id banner) so that the filename stays in sync with the emitted
                // bytes and the accompanying sourcemap.
                const hash = createHash("sha256")
                    .update(transformedCode)
                    .digest("hex")
                    .slice(0, 8);
                const outName = `assets/legacy-${baseName}-bundle-${hash}.js`;
                let finalCode = transformedCode;

                if (output.sourcemap && map) {
                    const mapFileName = `${basename(outName)}.map`;

                    // Add comment only when maps are *not* hidden.
                    if (output.sourcemap !== "hidden") {
                        finalCode = `${finalCode}\n//# sourceMappingURL=${mapFileName}`;
                    }

                    this.emitFile({
                        type: "asset",
                        fileName: `${outName}.map`,
                        source: map
                    });
                }

                this.emitFile({ type: "asset", fileName: outName, source: finalCode });

                // Insert the bundle into the HTML output and remove the original tags.
                if (locals.length) {
                    const firstTag = locals[0].tag;
                    html = html.replace(firstTag, `<script src="./${outName}"></script>`);

                    // Remove the rest of the local tags entirely.
                    for (const { tag } of locals.slice(1)) {
                        html = html.replace(tag, "");
                    }
                }

                // Strip out any scripts that carry a trailing `<!-- no-ship -->` comment.
                // This is applied last so it also covers inline scripts that were never
                // considered for bundling.
                html = html.replace(
                    /<script[^>]*>.*?<\/script>\s*<!--\s*no-ship\s*-->/gi,
                    ""
                );

                // Collapse blank lines left by removed tags.
                html = html.replace(/^[ \t]*\r?\n/gm, "");
                asset.source = html;
            }
        }
    };
}
