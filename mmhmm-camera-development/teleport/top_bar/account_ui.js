//
//  account_ui.js
//  mmhmm
//
//  Created by Steve White on 4/22/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

class AccountUI extends ObservableObject {
    constructor() {
        super();
        this.helpSheet = null;
    }
    newPreviewFeaturesMenu() {
        // A menu of preview features that can be toggled on and off
        // This is shown only to internal users, not customers
        let data = {
            menu: LocalizedString("Preview Features"),
            items: [],
        };

        var updateFeatureFlag = function(flagName, menu, option) {
            if (!menu) {
                return;
            }

            // Toggle the flag
            const container = option.querySelector(".icon");
            if (container) {
                const checked = container.childNodes.length > 0;
                setFeatureFlagEnabled(flagName, !checked);
                if (checked) {
                    RemoveAllChildrenFrom(container);
                } else {
                    container.appendChild(AppIcons.Checkmark());
                }
            }
        }

        var updateUserDefault = function(key, menu, option) {
            if (!menu) {
                return false;
            }

            // Toggle the flag
            const container = option.querySelector(".icon");
            if (container) {
                const willCheck = (container.childNodes.length == 0);
                SharedUserDefaults.setValueForKey(willCheck, key);
                if (willCheck) {
                    container.appendChild(AppIcons.Checkmark());
                } else {
                    RemoveAllChildrenFrom(container);
                }
                return willCheck;
            }
            return false;
        }

        return data;
    }
    newLocaleMenu() {
        var data = {
            menu: LocalizedString("Language"),
            items: [],
        };

        // Available locales.
        const locales = [
            { name: "English", key: "en" },
            { name: "日本語", key: "ja" },
            { name: "Deutsch", key: "de" },
            { name: "Español", key: "es-419" },
            { name: "Français", key: "fr" },
            { name: "Italiano", key: "it" },
            { name: "Português", key: "pt-BR" },
        ];

        // Determine the active locale and use it to place checkmark.
        let activeLocale = LocaleToURLPrefix(gCurrentLocale);
        if (activeLocale == null) {
            activeLocale = "en";
        }

        // Loop over and add locales to menu.
        locales.forEach(locale => {
            let icon = null;
            if (locale.key == activeLocale) {
                icon = AppIcons.Checkmark();
            }
            data.items.push({
                title: locale.name,
                icon: icon,
                action: () => this.updateLocale(locale.key),
            })
        })

        return data;
    }
    updateLocale(localeKey) {
        if (!localeKey) {
            return
        }

        const map = LocaleURLMap();
        const locale = map[localeKey];
        if (locale != null) {
            Cookies.Set("locale", locale);
        }
        else {
            Cookies.Delete("locale");
        }

        const newURL = MakeLocalizedURL(window.location.href, localeKey);
        window.location = newURL;
    }
    /*
     * Actions
     */
    signInButtonClicked(button, event) {
        mmhmmAPI.defaultEndpoint().performAuthentication().catch(err => {
            var errorMessage = err.toString();
            ShowAlertView(
                LocalizedString("Sign-in Error"),
                LocalizedStringFormat("An unknown error occurred while signing in: ${errorMessage}", {errorMessage})
            )
        });
    }
    settingsButtonClicked(button, event) {
        var endpoint = mmhmmAPI.getAuthenticatedEndpoint();
        if (endpoint == null) {
            this.showUnauthenticatedSettings(button, event);
        }
        else {
            this.showAuthenticatedSettings(button, event, endpoint);
        }
    }
    _populateMenuItems(menu, options, eventName) {
        options.forEach((option, idx) => {
            if (option.divider == true) {
                menu.addDivider();
                return;
            }

            if (option.checkbox == true) {
                const checkbox = menu.addCheckbox(option.title, (evt) => {
                    if (option.action != null) {
                        option.action(menu, checkbox, evt);
                    }
                }, null, false);
                checkbox.checked = option.checked;
                return;
            }

            var view = option.view;
            if (view != null) {
                menu.addCustomView(view);
                if ('className' in option) {
                    view.className = option.className;
                }
                return;
            }

            if (option.menu != null) {
                var submenu = menu.addSubmenu(option.menu, option.icon);
                this._populateMenuItems(submenu, option.items);
                return;
            }

            var button = menu.addItem(option.title, (evt) => {
                var url = option.url;
                if (url != null) {
                    if (url.constructor == String) {
                        window.open(url, "_blank");
                    }
                    else if (url.constructor == Promise) {
                        url.then(resolved => {
                            window.open(resolved, "_blank");
                        })
                    }
                }
                else {
                    var action = option.action;
                    if (action != null) {
                        action(menu, button, evt);
                    }
                }
                var analyticsKey = option.analyticsKey
                if (analyticsKey != null) {
                    Analytics.Log(eventName ?? "avatar.navigation.click", {link: analyticsKey});
                }


            });

            if ('icon' in option) {
                var wrapper = document.createElement("span");
                wrapper.className = "icon";

                var icon = option.icon;
                if (icon != null) {
                    wrapper.appendChild(icon);
                }
                button.insertBefore(wrapper, button.childNodes[0]);
            }

            if ('className' in option && button) {
                button.className += option.className;
            }

            if ('disabled' in option) {
                button.disabled = option.disabled;
            }
        })
    }
    newListSheetWithOptions(options, eventName = null) {
        const menu = new Menu();
        menu.sheet.style.maxWidth = "95vw";
        // TODO customize this to have a max width, 95vw?
        this._populateMenuItems(menu, options, eventName);
        return menu;
    }
    newThemeMenuData() {
        var setTheme = function(theme, menu, option) {
            gApp.userPreferredTheme = theme;
            Analytics.Log("avatar.navigation.click", {link: "toggle theme", theme: theme});

            if (menu == null) {
                return;
            }

            // Update checkmark state
            AccountUI.updateOptionsListSelectedItem(menu, option);
        };
        var themes = [
            { key: "light",  title: LocalizedString("Light") },
            { key: "dark",   title: LocalizedString("Dark") },
            { key: "system", title: LocalizedString("System") },
        ];

        var data = {
            menu: LocalizedString("Theme"),
            items: [],
        };

        var currentTheme = gApp.userPreferredTheme;
        themes.forEach(theme => {
            var icon = null;
            if (theme.key == currentTheme) {
                icon = AppIcons.Checkmark();
            }
            data.items.push({
                title: theme.title,
                icon: icon,
                action: (menu, button, event) => {
                    setTheme(theme.key, menu, button);
                }
            })
        })

        return data;
    }
    getTermsOfServiceLink() {
        return "https://www.airtime.com/terms";
    }
    getPrivacyPolicyLink() {
        return "https://www.airtime.com/privacy";
    }
    unauthenticatedSettingsOptions() {
        var terms = {
            title: LocalizedString("Terms"),
            url: this.getTermsOfServiceLink(),
            analyticsKey: "terms of service"
        };

        var privacy = {
            title: LocalizedString("Privacy"),
            url: this.getPrivacyPolicyLink(),
            analyticsKey: "privacy policy"
        };

        const options = [
            this.newThemeMenuData(),
            terms,
            privacy,
            {
                divider: true
            },
            this.newLocaleMenu(),
        ];

        options.push({
            title: LocalizedString("Sign in"),
            action: () => this.signInButtonClicked(),
            analyticsKey: "sign in"
        });

        return options;
    }
    showUnauthenticatedSettings(button, event) {
        var sheet = this.accountSettingsSheet;
        if (sheet != null) {
            sheet.dismiss();
            return;
        }

        var options = this.unauthenticatedSettingsOptions();

        sheet = this.newListSheetWithOptions(options);
        sheet.addEventListener("dismiss", evt => {
            this.accountSettingsSheet = null;
        }, {once: true});
        this.accountSettingsSheet = sheet;
        sheet.displayFrom(button);

    }
    authenticatedSettingsOptions(endpoint) {
        const guest = (endpoint.user.guest == true);
        var options = [];

        if (guest == false) {
            // If we're in the hybrid app, we need to make an API call to get
            // links that include a handoff token for the web client
            var linksPromise = null;
            if (App.isHybrid == true) {
                try {
                    linksPromise = endpoint.getAuthenticatedLinks();
                }
                catch (err) {
                    console.error("Error fetching links: ", err);
                }
            }

            var getWebAppLink = async function(promise, key, defaultValue) {
                var url = null;
                if (promise != null) {
                    var links = await promise;
                    if (links != null) {
                        var result = links[key];
                        if (result != null) {
                            url = MakeLocalizedURL(result);
                        }
                    }
                }
                if (url == null) {
                    url = MakeLocalizedURL(defaultValue);
                }
                return url;
            };

            var accountSettingsPromise = getWebAppLink(linksPromise, "manageAccountUrl", endpoint.getAccountSettingsURL());

            var view = this.newAccountHeaderView(endpoint, accountSettingsPromise);
            options.push({ view: view });
            options.push({ divider: true });

            const urlBuilder = endpoint.urlBuilder;
            options.push({
                title: LocalizedString("Get help"),
                url: urlBuilder.getHelpCenterBaseURL(),
                analyticsKey: "GetHelp"
            });
            options.push({
                title: LocalizedString("Release notes"),
                action: () => gApp.displayReleaseNotes(),
                analyticsKey: "ReleaseNotes",
            });

            options.push({ title: LocalizedString("Account settings"), url: accountSettingsPromise, analyticsKey: "account settings" });

            // If they're in a team, allow them to manage it
            var workgroup = (endpoint.user.workgroup == true);
            var business = (endpoint.user.business == true);
            var role = endpoint.user.businessRole;

            if (workgroup) {
                var workgroupPromise = getWebAppLink(linksPromise, "manageWorkgroupUrl", endpoint.getManageWorkgroupURL());
                options.push({ title: LocalizedString("Manage team"), url: workgroupPromise, analyticsKey: "workgroup settings" });
            }
            else if (business && (role == "owner" || role == "admin")) {
                // They can manage the team/business
                var businessPromise = getWebAppLink(linksPromise, "manageTeamUrl", endpoint.getManageBusinessURL());
                options.push({ title: LocalizedString("Manage team"), url: businessPromise, analyticsKey: "team settings" });
            }
        }
        options.push({divider: true});

        options.push(...this.newPreferencesOptions());
        options.push({divider: true});

        options.push(this.newThemeMenuData());
        options.push(this.newLocaleMenu());
        if (endpoint.enablePreviewFeatures && getReleaseTrack() != ReleaseTrack.PRODUCTION) {
            let option = this.newPreviewFeaturesMenu();
            if (option.items.length > 0) {
                options.push(option);
            }
        }
        options.push({ divider: true });

        const toggleSettingAction = (setting, value) => {
            SharedUserDefaults.setValueForKey(value, setting);
            Analytics.Log("help_menu.setting.toggle", {setting, value});
        };

        // Legal stuff...
        options.push({ title: LocalizedString("Terms"), url: this.getTermsOfServiceLink(), analyticsKey: "terms of service" });
        options.push({ title: LocalizedString("Privacy"), url: this.getPrivacyPolicyLink(), analyticsKey: "privacy policy" });
        options.push({ divider: true });

        options.push({
            title: LocalizedString("Sign out"),
            analyticsKey: "sign out",
            action: () => this.signOut(endpoint),
        });

        return options;
    }

    signOut(endpoint) {
        if (gLocalDeployment == true) {
            // For localhost builds, its not sufficient to delete our
            // cookies, as the cookies will still exist on app.dev.airtimetools.com
            // and the new sign in app will just automatically sign back in
            // instead of the old prompt to continue using account
            // So, we'll make an extra call here to get those cookies removed.
            var childWindow = null;
            var msgHandler = (evt) => {
                var data = evt.data;
                if (data == "success") {
                    childWindow.close();
                    window.removeEventListener("message", msgHandler);
                }
            };
            window.addEventListener("message", msgHandler);

            var signOutURL = new URL("https://app.dev.airtimetools.com/camera/mmhmm_auth.html");
            signOutURL.searchParams.set("action", "signout");
            signOutURL.searchParams.set("clientID", mmhmmAPI.defaultEndpoint().clientID);
            childWindow = window.open(signOutURL, App.isHybrid ? "_external" : "_blank");
        }

        mmhmmAPI.signOutOfEndpoint(endpoint, true);
    }

    newPreferencesOptions() {
        const items = [];

        items.push(this.newCameraPreferenceMenu(
            LocalizedString("Keep window on top"),
            "miniFloatWindow",
            "no",
        ));
        items.push(this.newCameraPreferenceMenu(
            LocalizedString("Show video preview"),
            "miniShowStage",
            "yes",
        ));

        const key = "looksUseLiveThumbnails";
        const currentSetting = SharedUserDefaults.getValueForKey(key, true);
        items.push({
            title: LocalizedString("Use my image in thumbnails"),
            icon: currentSetting === true ? AppIcons.Checkmark() : null,
            action: (menu, button, event) => {
                const newValue = this.updateMenuItemPreference(key, menu, button)
                if (newValue != null) {
                    NotificationCenter.default.postNotification(
                        UserDefaults.Notifications.DefaultChanged, SharedUserDefaults, {
                            key,
                            value: newValue,
                        });
                }
            }
        });

        return items;
    }

    newCameraPreferenceMenu(title, defaultsKey, defaultSetting) {
        const data = {
            menu: title,
            items: [],
        };

        const currentSetting = SharedUserDefaults.getValueForKey(defaultsKey, defaultSetting);
        const options = [
            { key: "auto", label: LocalizedString("Auto") },
            { key: "yes", label: LocalizedString("Yes") },
            { key: "no", label: LocalizedString("No") },
        ];

        options.forEach(option => {
            const icon = (currentSetting === option.key) ? AppIcons.Checkmark() : null;
            data.items.push({
                title: option.label,
                icon: icon,
                action: (menu, button) => {
                    SharedUserDefaults.setValueForKey(option.key, defaultsKey);
                    AccountUI.updateOptionsListSelectedItem(menu, button);
                    gApp.cameraPreferencesUpdated();
                },
            });
        });

        return data;
    }

    updateMenuItemPreference(defaultsKey, menu, option) {
        if (!menu) {
            return;
        }

        // Toggle the flag
        const container = option.querySelector(".icon");
        if (container) {
            const checked = container.childNodes.length > 0;
            SharedUserDefaults.setValueForKey(!checked, defaultsKey);
            if (checked) {
                RemoveAllChildrenFrom(container);
            } else {
                container.appendChild(AppIcons.Checkmark());
            }
            return !checked;
        }
    }

    /**
     * Given a menu showing a list of options, update the checked state of the
     * selected item.
     * @param {Menu} menu - The menu containing the list of options.
     * @param {HTMLElement} button - The button representing the selected item.
     */
    static updateOptionsListSelectedItem(menu, button) {
        const options = menu.list.getAllOptions();
        options.forEach(anOption => {
            const container = anOption.querySelector(".icon");
            if (container == null) {
                return;
            }
            RemoveAllChildrenFrom(container);
            if (anOption == button.parentNode) {
                container.appendChild(AppIcons.Checkmark());
            }
        });
    }

    showAuthenticatedSettings(button, event, endpoint) {
        var sheet = this.accountSettingsSheet;
        if (sheet != null) {
            sheet.dismiss();
            return;
        }

        var options = this.authenticatedSettingsOptions(endpoint);
        sheet = this.newListSheetWithOptions(options);
        sheet.addEventListener("dismiss", evt => {
            this.destroyAccountHeaderView();
            this.accountSettingsSheet = null;
        }, {once: true});
        this.accountSettingsSheet = sheet;
        sheet.displayFrom(button);
    }
    destroyAccountHeaderView() {
        var listener = this.accountHeaderViewListener;
        if (listener != null) {
            NotificationCenter.default.removeObserver(
                mmhmmAPI.Notifications.AuthenticationChanged,
                null,
                listener,
            );
            this.accountHeaderViewListener = null;
        }
    }
    newAccountHeaderView(endpoint, accountSettingsURL) {
        var user = endpoint.user;

        var view = document.createElement("div");
        view.className = "account_header";

        var avatar = document.createElement("button");
        avatar.className = "avatar"

        avatar.addEventListener("click", evt => {
            var openURL = (urlString) => {
                window.open(urlString, "_blank");

                var sheet = this.accountSettingsSheet;
                if (sheet != null) {
                    sheet.dismiss();
                }
            }

            if (accountSettingsURL.constructor == String) {
                openURL(accountSettingsURL);
            }
            else if (accountSettingsURL.constructor == Promise) {
                accountSettingsURL.then(resolved => {
                    openURL(resolved);
                })
            }
        })
        view.appendChild(avatar);

        var wrapper = document.createElement("div");
        wrapper.className = "wrapper";
        avatar.appendChild(wrapper);

        var thumbnail = document.createElement("img");
        thumbnail.className = "thumbnail";
        wrapper.appendChild(thumbnail);

        var rolloverTip = document.createElement("div");
        rolloverTip.className = "rollover";
        wrapper.appendChild(rolloverTip);

        var rolloverText = document.createElement("div");
        rolloverText.className = "text";
        rolloverText.innerText = LocalizedString("Edit");
        rolloverTip.appendChild(rolloverText)

        var fullname = document.createElement("div");
        fullname.className = "fullname";
        view.appendChild(fullname);

        var email = document.createElement("div");
        email.className = "email";
        view.appendChild(email);

        var updateFields = function(user) {
            fullname.innerText = (user.name ?? "").trim();
            email.innerText = (user.email ?? "").trim();

            var profileThumbnail = null;
            var profilePhotoInfo = user.profilePhotoInfo;
            if (profilePhotoInfo != null) {
                var urls = profilePhotoInfo.urls;
                if (urls != null) {
                    profileThumbnail = urls.thumbnail;
                }
            }
            if (profileThumbnail == null) {
                profileThumbnail = "assets/avatars/avatar-generic-thumbnail.png"
            }
            thumbnail.src = profileThumbnail;
        }
        updateFields(user);

        this.accountHeaderViewListener = (userInfo, name, object) => {
            updateFields(object);
        }

        NotificationCenter.default.addObserver(
            mmhmmAPI.Notifications.AuthenticationChanged,
            null,
            this.accountHeaderViewListener,
        );

        return view;
    }
}
