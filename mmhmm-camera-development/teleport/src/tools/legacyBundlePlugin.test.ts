import { describe, it, expect } from "vitest";
import { legacyBundlePlugin } from "./legacyBundlePlugin";

// helper to mock rollup bundle for plugin
function makeBundle(html: string) {
    return { "index.html": { type: "asset", source: html } } as any;
}

describe("legacyBundlePlugin", () => {
    it("replaces local script tags with a bundle", async () => {
        const html =
            "<head>\n" +
            '  <script src="src/tools/__fixtures__/tmp-a.js"></script>\n' +
            '  <script src="src/tools/__fixtures__/tmp-b.js"></script>\n' +
            "</head>";

        const bundle = makeBundle(html);
        const emitted: any[] = [];

        const plugin: any = legacyBundlePlugin({
            generateLocalizationTable: false
        });
        await plugin.generateBundle.call(
            { emitFile: (i: any) => emitted.push(i), warn() {} },
            {},
            bundle
        );

        const outHtml = bundle["index.html"].source as string;
        expect(outHtml).toMatchInlineSnapshot(
            `
          "<head>
            <script src="./assets/legacy-index-bundle-734d0d85.js"></script>
          </head>"
        `
        );
        expect(emitted).toMatchInlineSnapshot(`
          [
            {
              "fileName": "assets/legacy-index-bundle-734d0d85.js",
              "source": "const gLocalDeployment = false;
          ;{try{let e="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof globalThis?globalThis:"undefined"!=typeof self?self:{},n=(new e.Error).stack;n&&(e._sentryDebugIds=e._sentryDebugIds||{},e._sentryDebugIds[n]="c9c62436-015c-41a2-9f02-1fc12fffff20",e._sentryDebugIdIdentifier="sentry-dbid-c9c62436-015c-41a2-9f02-1fc12fffff20")}catch(e){}};

          window.A = 1;
          window.B = 2;
          ",
              "type": "asset",
            },
          ]
        `);
    });

    it("keeps CDN and main.ts tags untouched", async () => {
        const html =
            `<head>\n` +
            `  <script src="https://cdn.example.com/lib.js"></script>\n` +
            `  <script type="module" src="/src/main.ts"></script>\n` +
            `  <script src="src/tools/__fixtures__/tmp-c.js"></script>\n` +
            `  <script>a+b</script> <!-- no-ship -->\n` +
            `  <script src="https://cdn.example.com/beta.js"></script> <!-- no-ship -->\n` +
            `</head>`;

        const bundle = makeBundle(html);
        const emitted: any[] = [];

        const plugin: any = legacyBundlePlugin({
            generateLocalizationTable: false
        });
        await plugin.generateBundle.call(
            { emitFile: (i: any) => emitted.push(i), warn() {} },
            {},
            bundle
        );

        expect(bundle["index.html"].source).toMatchInlineSnapshot(
            `
          "<head>
            <script src="https://cdn.example.com/lib.js"></script>
            <script type="module" src="/src/main.ts"></script>
            <script src="./assets/legacy-index-bundle-1f6edc11.js"></script>
          </head>"
        `
        );
        expect(emitted).toMatchInlineSnapshot(`
          [
            {
              "fileName": "assets/legacy-index-bundle-1f6edc11.js",
              "source": "const gLocalDeployment = false;
          ;{try{let e="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof globalThis?globalThis:"undefined"!=typeof self?self:{},n=(new e.Error).stack;n&&(e._sentryDebugIds=e._sentryDebugIds||{},e._sentryDebugIds[n]="9a6be7b6-bb06-42b3-a90e-f80c91639cb2",e._sentryDebugIdIdentifier="sentry-dbid-9a6be7b6-bb06-42b3-a90e-f80c91639cb2")}catch(e){}};

          window.C = 3;
          ",
              "type": "asset",
            },
          ]
        `);
    });

    it("does nothing when no eligible local scripts are present", async () => {
        const originalHtml =
            `<head>\n` +
            `  <script src="https://cdn.example.com/alpha.js"></script>\n` +
            `  <script type="module" src="/src/main.ts"></script>\n` +
            `</head>`;

        const bundle = makeBundle(originalHtml);
        const emitted: any[] = [];

        const plugin: any = legacyBundlePlugin({
            generateLocalizationTable: false
        });
        await plugin.generateBundle.call(
            { emitFile: (i: any) => emitted.push(i), warn() {} },
            {},
            bundle
        );

        expect(bundle["index.html"].source).toBe(originalHtml);
        // No assets should have been emitted.
        expect(emitted).toEqual([]);
    });

    it("retains hashed module script injected by Vite", async () => {
        // Simulate HTML after Vite has converted /src/main.ts into a hashed asset and
        // appended some preload/link tags.
        const html =
            `<head>\n` +
            `  <script type="module" src="/assets/main-AAA11111.js"></script>\n` +
            `  <link rel="modulepreload" href="/assets/chunk-XYZ.js">\n` +
            `  <script src="src/tools/__fixtures__/tmp-b.js"></script>\n` +
            `</head>`;

        const bundle = makeBundle(html);
        const emitted: any[] = [];

        const plugin: any = legacyBundlePlugin({
            generateLocalizationTable: false
        });
        await plugin.generateBundle.call(
            { emitFile: (i: any) => emitted.push(i), warn() {} },
            {},
            bundle
        );

        const outHtml = bundle["index.html"].source as string;

        // The module script should still exist
        expect(outHtml).toMatchInlineSnapshot(
            `
          "<head>
            <script type="module" src="/assets/main-AAA11111.js"></script>
            <link rel="modulepreload" href="/assets/chunk-XYZ.js">
            <script src="./assets/legacy-index-bundle-4879b941.js"></script>
          </head>"
        `
        );

        // emitted bundle should contain code from tmp-b.js only.
        expect(emitted).toMatchInlineSnapshot(`
          [
            {
              "fileName": "assets/legacy-index-bundle-4879b941.js",
              "source": "const gLocalDeployment = false;
          ;{try{let e="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof globalThis?globalThis:"undefined"!=typeof self?self:{},n=(new e.Error).stack;n&&(e._sentryDebugIds=e._sentryDebugIds||{},e._sentryDebugIds[n]="e93a5e8b-bcd4-4643-ad00-75fb7aa04454",e._sentryDebugIdIdentifier="sentry-dbid-e93a5e8b-bcd4-4643-ad00-75fb7aa04454")}catch(e){}};

          window.B = 2;
          ",
              "type": "asset",
            },
          ]
        `);
    });
});
