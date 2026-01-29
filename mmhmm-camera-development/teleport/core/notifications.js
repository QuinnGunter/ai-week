//
//  notifications.js
//  mmhmm
//
//  Created by Jonathan Potter on 5/15/24.
//  Copyright © 2024 mmhmm, inc. All rights reserved.
//

const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = 24 * ONE_HOUR;

// fires a notification at midnight
setTimeout(() => {
    NotificationCenter.default.postNotification(
        NotificationCenter.AT_MIDNIGHT
    );
    setInterval(() => {
        NotificationCenter.default.postNotification(
            NotificationCenter.AT_MIDNIGHT
        );
    }, ONE_DAY);
}, timeUntilMidnight())

window.addEventListener('focus', () => {
    NotificationCenter.default.postNotification(
        NotificationCenter.FOCUS_IN
    );
});
