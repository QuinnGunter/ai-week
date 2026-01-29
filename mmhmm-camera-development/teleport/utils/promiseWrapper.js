//
//  promiseWrapper.js
//  mmhmm
//
//  Created by Jonathan Potter on 02/29/24.
//  Copyright © 2024 mmhmm, inc. All rights reserved.
//

// externalizes resolve and reject so promises can be used more conveniently
function promiseWrapper () {
    let resolver, rejecter;

    const wrappedPromise = new Promise((resolve, reject) => {
        resolver = resolve;
        rejecter = reject;
    });

    wrappedPromise.resolve = resolver;
    wrappedPromise.reject = rejecter;

    return wrappedPromise;
}
