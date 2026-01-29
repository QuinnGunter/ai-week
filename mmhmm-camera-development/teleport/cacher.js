//
//  worker.js
//  mmhmm
//
//  Created by Steve White on 7/17/24.
//  Copyright © 2024 mmhmm, inc. All rights reserved.
//

let cache = null;

const handleCacheableRequest = async(event, request) => {
    const url = new URL(request.url);

    const pathComponents = url.pathname.split("/");
    const filename = pathComponents[pathComponents.length - 1];
    // We only support standard asset fingerprints
    if (filename.match(/^[a-z0-9]*\.[0-9]*\.sha1.[0-9a-f]*$/) == null) {
        return fetch(request);
    }

    if (cache == null) {
        cache = await caches.open("files");
    }

    // For progressively loading videos the browser may request
    // ranges.  We'll try to support that here..
    const requestHeaders = {};
    const range = request.headers.get("Range");
    if (range != null) {
        requestHeaders.Range = range;
    }

    const cachePath = "/files/" + filename;
    const cacheRequest = new Request(cachePath, requestHeaders);

    // Do we have a cached copy of this asset?
    let cached = await cache.match(cacheRequest);
    if (cached != null) {
        // Yes, we have a cached copy.

        // If the filename is the fingerprint
        const comps = filename.split(".");
        if (comps.length == 4) {
            // Then ensure the cache matches the expected length
            const expectedSize = comps[1];
            const actualSize = parseInt(cached.headers.get("Content-Length") ?? "0");
            if (expectedSize != actualSize) {
                // Size mismatches, so bypass the cache
                cached = null;
            }
        }

        if (cached != null) {
            return cached;
        }
    }

    // No, so fetch it
    const signal = request.signal;
    const response = await fetch(url, { mode: "cors", signal: signal });

    // Check the response to ensure its valid
    if (Math.floor(response.status / 100) != 2 ||
        signal?.aborted == true)
    {
        return response;
    }

    try {
        // Store the response in the cache
        await cache.put(cachePath, response);
    }
    catch (err) {
        console.error("Error storing response in cache", {response, cache, cachePath, error: err});
        return response;
    }

    // And finally return the cached data
    return await cache.match(cacheRequest);
}

self.addEventListener("fetch", (event) => {
    const request = event.request;
    if (request.method == "GET") {
        const url = new URL(request.url);
        const hostname = url.hostname;

        if ((hostname.startsWith("assets") == true && hostname.endsWith("cloud.mmhmm.app") == true) ||
            (hostname.startsWith("mmhmm-sync-assets") == true && hostname.endsWith("amazonaws.com") == true))
        {
            event.respondWith(handleCacheableRequest(event, request));
        }
    }
});
