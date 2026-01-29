import { defineConfig } from "vite";
import { resolve } from "path";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { legacyBundlePlugin } from "./teleport/src/tools/legacyBundlePlugin";
import { minifyStaticPlugin } from "./teleport/src/tools/minifyStaticPlugin";
import { copyProcessedFilePlugin } from "./teleport/src/tools/copyProcessedFilePlugin";
import { sentryVitePlugin } from "@sentry/vite-plugin";

export default defineConfig(({ command, mode }) => ({
    root: "teleport",
    base: "./",
    appType: 'mpa',
    build: {
        outDir: resolve(process.cwd(), "deploy"),
        emptyOutDir: true,
        rollupOptions: {
            input: {
                index: resolve(process.cwd(), "teleport/index.html"),
                auth: resolve(process.cwd(), "teleport/mmhmm_auth.html")
            }
        },
        sourcemap: true
    },
    plugins: [
        {
            // Serve index.html at /camera_demo.html during development
            name: 'rewrite-camera-demo',
            apply: 'serve',
            configureServer(server) {
                server.middlewares.use((req, _, next) => {
                    if (req.url.includes("/camera_demo.html")) {
                        req.url = req.url.replace("/camera_demo.html", "/index.html");
                    }
                    next();
                });
            },
        },
        // Copy processed index.html to camera_demo.html during build
        copyProcessedFilePlugin({
            src: 'index.html',
            dest: 'camera_demo.html'
        }),
        viteStaticCopy({
            targets: [
                { src: resolve(process.cwd(), "teleport/usertest.html"), dest: "" },
                { src: resolve(process.cwd(), "teleport/assets"), dest: "" },
                {
                    src: resolve(process.cwd(), "teleport/third_party"),
                    dest: ""
                },
                // copy workers only during dev – production handled by minifyStaticPlugin
                ...(command === "serve"
                    ? [
                          {
                              src: resolve(process.cwd(), "teleport/workers"),
                              dest: "workers"
                          },
                          { src: resolve(process.cwd(), "teleport/cacher.js"), dest: "" }
                      ]
                    : [])
            ]
        }),
        minifyStaticPlugin({
            src: "teleport/workers",
            dest: "workers",
            minify: ["worker*.js"],
            esbuild: { target: "es2020" }
        }),
        minifyStaticPlugin({
            src: "teleport/cacher.js",
            dest: "",
            minify: ["cacher.js"],
            esbuild: { target: "es2020" }
        }),
        legacyBundlePlugin({
            esbuild: {
                target: "es2020",
                minify: true
            }
        }),
        sentryVitePlugin({
            disable: command !== "build",
            org: "mmhmm",
            project: "camera",
            authToken: process.env.SENTRY_AUTH_TOKEN,
            telemetry: false,
            sourcemaps: {
                filesToDeleteAfterUpload: new Promise(resolve => {
                    const isProduction = mode != 'internal';
                    if (isProduction) {
                        resolve(["deploy/**/*.{js,css}.map"]);
                    } else {
                        resolve([]);
                    }
                }),
            }
        })
    ],
    define: {
        __GAPP_BUILD_ID__: JSON.stringify(process.env.BUILD_ID ?? "local"),
        __GAPP_BUILD_DATE__: JSON.stringify(new Date())
    }
}));
