//
//  globals.ts
//  mmhmm
//
//  Copyright 2025 mmhmm inc. All rights reserved.
//

// This file acts like an adapter for classic code that relies heavily on
// globals.
//
// Be careful about execution order. Classic script tags are parsed and
// executed immediately in the order they are encountered. This means that if
// you have a script tag that uses a global variable, these globals defined here
// are only available after load.

// Injected from the build system
globalThis.gAppBuild = __GAPP_BUILD_ID__;
globalThis.gAppBuildDate = __GAPP_BUILD_DATE__;

// Inferred
globalThis.gLocalDeployment = import.meta.env.DEV;
