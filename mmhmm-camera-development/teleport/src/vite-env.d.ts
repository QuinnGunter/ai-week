/// <reference types="vite/client" />

declare const __GAPP_BUILD_ID__: string;
declare const __GAPP_BUILD_DATE__: string;

interface ImportMetaEnv {
    // env vars here
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
