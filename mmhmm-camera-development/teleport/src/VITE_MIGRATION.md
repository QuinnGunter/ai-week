# Vite Bootstrap & Migration Guide

## How it works

**Build config** – `root = teleport/`, output into `deploy/`, copies
_assets_ / _third_party_ / _workers_ verbatim with
`vite-plugin-static-copy` so legacy paths keep working.

**Development**
_HTML files are untouched._ They still contain classic
`<script src="…">` tags in the same order as before, so development can continue on legacy files as before.

**Production**
`teleport/src/tools/legacyBundlePlugin.ts` kicks in:

1. Finds every local `<script src="…">` tag that remains in each entry point (index.html, remote.html, slidebox.html, …).
2. Concatenates those files top-to-bottom, minifies with esbuild, emits one file `assets/legacy.<hash>.js`.
3. Replaces those tags with:

    ```html
    <script src="/assets/legacy.<hash>.js"></script>
    ```

    The bundle executes in global scope, so every legacy global stays on `window` exactly as before.

**New code** lives in `teleport/src/` and enters via

```html
<script type="module" src="/src/main.ts"></script>
```

Those modules enjoy HMR, tree-shaking, TypeScript, etc.

**To preview a production build, run:**

```shell
npm run build
npm run preview
```

---

## Converting a file to a real module

1. Rewrite it with `export`/`import` (stop relying on globals).
2. Delete **its old `<script>` tag** from HTML entirely.
3. Import the module where it’s used (e.g. from `main.ts`).

---

## Pros / Cons of this approach

✔ Zero edits inside legacy source files.

✔ Dev experience unchanged (all original files visible, mimics current build script).

✔ Production still ships a single, minified bundle.

✔ Existing development can continue unchanged; new development can use modern features.

✘ The legacy bundle has no HMR; editing a legacy file in dev triggers a
full page reload (same as before migration).

✘ Code-splitting / tree-shaking do not apply to the legacy bundle until
files are rewritten as proper modules.

---

## Runtime build info (`gAppBuild`)

`src/main.ts` writes `gAppBuild` / `gAppBuildDate` to `window` (values come
from Vite `define` constants) injected at build time and attached after parsing. Legacy code first reads them from a
`window.load` handler, so the current timing works in dev and prod.

If we ever need a value earlier than module execution, inject it with a
tiny banner / `transformIndexHtml` Vite plugin. Until then, keep as-is.

---

## TODO – remaining gaps vs. `makedeploy.sh`

[ ] **Self-contained `mmhmm_auth.html` popup** – legacy deploy concatenated and
in-lined `services/cognito.js` into the HTML. Restore that behavior so the
popup works without extra network requests. Update: we will defer fully in-lining since the extra request for the bundled js is
minimal.

[x] **Localization tables** - Add step in legacy bundling to create and attach
localization tables for the generated bundle.

[x] **Sentry sourcemaps** – Generate sourcemaps when producing legacy bundles
and add upload step during CI.

[x] **Worker script minification** – `teleport/workers/*.js` were minified by
`makedeploy`; currently they are copied verbatim.
