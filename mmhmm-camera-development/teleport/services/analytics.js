//
//  analytics.js
//  mmhmm
//
//  Created by Steve White on 10/12/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

var Analytics = {
    _keys: {
        "dev": [4, 4, 3, 3, 15, 3, 5, 5, 5, 10, 6, 6, 6, 10, 2, 10, 9, 13, 10, 6, 8, 9, 15, 6, 2, 10, 5, 4, 1, 15, 2, 13],
        "stage": [7, 15, 8, 11, 7, 14, 11, 9, 1, 10, 4, 3, 15, 6, 15, 15, 11, 3, 3, 6, 11, 7, 5, 3, 6, 8, 1, 4, 13, 14, 7, 12],
        "": [0, 12, 2, 6, 13, 10, 7, 0, 6, 6, 10, 1, 1, 14, 10, 15, 6, 9, 2, 6, 2, 14, 5, 0, 2, 0, 14, 11, 11, 12, 12, 15],
    },
    AuxiliaryProps: {
        build: (typeof gAppBuild != "undefined" ? gAppBuild : "dev"),
        component: 'talk',
    },
    OnLoad: function(event) {
        var appID = null;
        if (App.isHybrid == false) {
            appID = 'mmhmm.web';
        }
        else {
            if (navigator.platform.startsWith("Mac") == true) {
                appID = 'mmhmm.macos.hybrid';
            }
            else {
                appID = 'mmhmm.windows.hybrid';
            }
        }
        Analytics.AuxiliaryProps.app = appID;
        Analytics.AuxiliaryProps.mode = "camera";
        Analytics.AuxiliaryProps.release_track = getReleaseTrack();
        Analytics.AuxiliaryProps.is_demo = App.isDemo ? "true" : "false";

        let hybridVersion = getHybridAppVersion();
        if (hybridVersion != "") {
            Analytics.AuxiliaryProps.hybrid_version = hybridVersion;
        }

        NotificationCenter.default.addObserver(
            mmhmmAPI.Notifications.AuthenticationChanged,
            null,
            (info, name, object) => {
                var ep = mmhmmAPI.defaultEndpoint();
                if (ep.isAuthenticated == false) {
                    Analytics.SignOut();
                }
                else {
                    var user = ep.user;
                    if (user != null) {
                        Analytics.Identify(user.id)
                    }
                }
            }
        );
    },
    AnonymizeID: async function(inputID) {
        const encoder = new TextEncoder();
        const data = encoder.encode(inputID);
        var digest = await crypto.subtle.digest('SHA-256', data);
        return DigestToHexString(digest);
    },
    Log: function(event, args) {
        var service = this.service;
        if (service == null) return;

        var properties = Object.assign({}, args);
        Object.assign(properties, Analytics.AuxiliaryProps);
        service.track(event, properties);
    },
    Identify: function(userID) {
        this.identity = userID;
        var service = this.service;
        if (service == null) return;
        service.identify(userID);
        this._pruneCookies();
    },
    SignOut: function() {
        this.identity = null;
        var service = this.service;
        if (service != null) {
            service.reset();
        }
    },
    GetDistinctID: function() {
        return this.service?.get_distinct_id();
    },
    SetService: function(service) {
        this.service = service;
        if (service == null) {
            return;
        }

        // Mixpanel might have taken long to load,
        // in which case we would not have invoked identify.
        // but we stored the value so we could use it here
        var identity = this.identity;
        if (identity != null) {
            this.Identify(identity);
        }
    },
    InitializeMixpanel: function(key, apiHost) {
        const props = {
            persistence_name: 'mmhmm',
            persistence: 'localStorage',
            // We proxy Mixpanel requests through our backend to avoid ad blockers
            api_host: 'https://' + apiHost + '/public/mp',
        };
        if (!App.isDemo) {
            props.property_blacklist = ['$current_url'];
        }
        mixpanel.init(key, props);
    },
    _pruneCookies: function() {
        // Seeing instances of people with multiple mixpanel cookies
        // that are seemingly identical except for a slight difference in device_id
        // Not sure why mixpanel is letting these linger, but this will clean up
        // after it while trying to leave watch mixpanel cookies intact
        var service = this.service;
        var identity = this.identity;
        if (service == null || identity == null) {
            return;
        }

        var current = null;
        if (service.persistence != null) {
            current = service.persistence.name;
        }
        if (current == null && service.cookie != null) {
            current = service.cookie.name;
        }
        if (current == null) {
            console.error("Couldn't determine current mixpanel cookie name");
            return;
        }

        var cookie = document.cookie;
        var mixpanelPrefix = "mp_";
        var mpCookies = cookie.split(";").map(a => a.trim()).filter(a => a.startsWith(mixpanelPrefix));
        mpCookies.forEach(aCookie => {
            if (aCookie.startsWith(current) == true) {
                return;
            }

            var separator = aCookie.indexOf("=");
            if (separator == -1) {
                return;
            }
            var key = aCookie.substring(0, separator);
            var value = aCookie.substring(separator + 1);
            try {
                value = JSON.parse(unescape(value));
                if (typeof value == "object") {
                    var distinctID = value.distinct_id;
                    if (distinctID != identity) {
                        return;
                    }
                }
            }
            catch (err) {
                // go ahead and delete it....
            }

            var past = (new Date(0)).toUTCString();
            document.cookie = key + "=0;path=/;domain=.mmhmm.app;expires=" + past;
        })
    }
};

(function(f, b) {
    if (!b.__SV) {
        var e, g, i, h;
        window.mixpanel = b;
        b._i = [];
        b.init = function(e, f, c) {
            function g(a, d) {
                var b = d.split(".");
                2 == b.length && (a = a[b[0]], d = b[1]);
                a[d] = function() {
                    a.push([d].concat(Array.prototype.slice.call(arguments, 0)))
                }
            }
            var a = b;
            "undefined" !== typeof c ? a = b[c] = [] : c = "mixpanel";
            a.people = a.people || [];
            a.toString = function(a) {
                var d = "mixpanel";
                "mixpanel" !== c && (d += "." + c);
                a || (d += " (stub)");
                return d
            };
            a.people.toString = function() {
                return a.toString(1) + ".people (stub)"
            };
            i = "disable time_event track track_pageview track_links track_forms track_with_groups add_group set_group remove_group register register_once alias unregister identify name_tag set_config reset opt_in_tracking opt_out_tracking has_opted_in_tracking has_opted_out_tracking clear_opt_in_out_tracking start_batch_senders people.set people.set_once people.unset people.increment people.append people.union people.track_charge people.clear_charges people.delete_user people.remove".split(" ");
            for (h = 0; h < i.length; h++) g(a, i[h]);
            var j = "set set_once union unset remove delete".split(" ");
            a.get_group = function() {
                function b(c) {
                    d[c] = function() {
                        var call2_args = arguments;
                        var call2 = [c].concat(Array.prototype.slice.call(call2_args, 0));
                        a.push([e, call2])
                    }
                }
                for (var d = {}, e = ["get_group"].concat(Array.prototype.slice.call(arguments, 0)), c = 0; c < j.length; c++) b(j[c]);
                return d
            };
            b._i.push([e, f, c])
        };
        b.__SV = 1.2;
        e = f.createElement("script");
        e.type = "text/javascript";
        e.async = !0;
        // XXX: start ooo addition
        // Determine the environment we're running in
        var env = null;
        if (gLocalDeployment == true) {
            env = "dev";
        }
        else {
            try {
                const hostname = window.location.hostname;
                const matches = hostname.match(/^app\.?([a-z]*)\.airtimetools\.com$/);
                if (matches != null && matches.length == 2) {
                    env = matches[1];
                } else if (hostname == "www.airtime.com" || hostname == "airtime.com") {
                    env = ""; // production
                } else if (hostname == "www.airtimetools.com" || hostname == "airtimetools.com") {
                    env = ""; // production
                }
            }
            catch (e) {
                console.error("Error parsing hostname");
            }
        }
        if (env == null || Analytics._keys[env] == null) {
            // Environments that we don't know about go to dev - fail safe
            env = "dev";
        }
        var key = Analytics._keys[env].map(a => a.toString(16)).join("");
        var apiHost = "api.mmhmm.app";
        if (env != "") {
            apiHost = env + "-" + apiHost;
        }
        // We load the Mixpanel SDK from our backend to avoid ad blockers
        var MIXPANEL_CUSTOM_LIB_URL = "https://" + apiHost + "/public/mp/lib.min.js";
        e.addEventListener("load", () => {
            Analytics.InitializeMixpanel(key, apiHost);
            Analytics.SetService(window.mixpanel);
        });
        // XXX: end ooo addition
        e.src = "undefined" !== typeof MIXPANEL_CUSTOM_LIB_URL ?
            MIXPANEL_CUSTOM_LIB_URL : "file:" === f.location.protocol && "//cdn.mxpnl.com/libs/mixpanel-2-latest.min.js".match(/^\/\//) ? "https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js" : "//cdn.mxpnl.com/libs/mixpanel-2-latest.min.js";
        g = f.getElementsByTagName("script")[0];
        g.parentNode.insertBefore(e, g)
    }
})(document, window.mixpanel || []);
