//
//  system_theme.js
//  mmhmm
//
//  Created by Steve White on 10/13/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

class SystemTheme extends ObservableObject {
    constructor() {
        super();

        var themeMatcher = window.matchMedia('(prefers-color-scheme: dark)');
        var onThemeUpdate = () => {
            var dark = false;
            if (themeMatcher.matches) {
                dark = true;
            }
            this.dark = dark;
            if (SystemTheme.Notifications != null) {
                NotificationCenter.default.postNotification(
                    SystemTheme.Notifications.Changed,
                    this,
                    { dark }
                );
            }
        }
        themeMatcher.addListener(onThemeUpdate);
        onThemeUpdate();
    }
}

SystemTheme.shared = new SystemTheme();
SystemTheme.Notifications = Object.freeze({
    Changed: "SystemThemeChangedNotification"
})
