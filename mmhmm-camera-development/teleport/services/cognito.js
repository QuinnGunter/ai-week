//
//  cognito.js
//  mmhmm
//
//  Created by Steve White on 11/15/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

class CognitoCookies {
    get cookiePrefix() {
        return "CognitoIdentityServiceProvider."
    }
    _getCookies(stripPrefix = false) {
        var cookie = document.cookie;
        var cognitoPrefix = this.cookiePrefix;
        var cognitos = cookie.split(";").map(a => a.trim()).filter(a => a.startsWith(cognitoPrefix));
        var results = {};
        cognitos.forEach(cognito => {
            var equals = cognito.indexOf("=");
            if (equals != -1) {
                var key = cognito.substring(0, equals);
                if (stripPrefix == true) {
                    if (key.startsWith(cognitoPrefix) == true) {
                        key = key.substring(cognitoPrefix.length);
                    }
                }
                var value = cognito.substring(equals + 1);
                results[key] = value;
            }
        })
        return results;
    }
    deleteAllCookies() {
        var cookies = this._getCookies();
        for (var key in cookies) {
            this._setCookieKeyValue(key, null);
        }
    }
    _setCookieKeyValue(key, value) {
        var options = {
            path: "/",
            domain: window.location.hostname,
            sameSite: "strict",
            secure: null
        };
        if (value != null) {
            options["max-age"] = (365 * 24 * 60 * 60)
        }
        else {
            options["max-age"] = 0;
        }

        if (value == null) {
            value = ``;
        }

        var cookie = `${key}=${value}`;
        for (var optKey in options) {
            var optValue = options[optKey];
            cookie += `; ${optKey}`
            if (optValue != null) {
                cookie += `=${optValue}`
            }
        }
        document.cookie = cookie;
    }
    setCookiesFromAccount(accessToken, clientID) {
        var getCookieKeyValue = function(key) {
            var cookies = document.cookie.split(";").map(a => a.trim());
            var cookie = cookies.find(a => a.startsWith(key));
            if (cookie == null) {
                return null;
            }
            return cookie.substring(key.length + 1);
        }

        var cookiePrefix = this.cookiePrefix;
        cookiePrefix += clientID + ".";

        var lastAuthKey = cookiePrefix + "LastAuthUser";
        var lastUserID = getCookieKeyValue(lastAuthKey);
        var userID = null;
        if (accessToken != null) {
            userID = accessToken.user.id;
        }

        if (accessToken == null || lastUserID != userID) {
            this.deleteAllCookies();

            if (accessToken == null) {
                return;
            }
        }

        // Have a token, so update/create the cookies
        var tokenKeys = ["accessToken", "idToken", "refreshToken"];
        var additionalKeys = ["userData", "clockDrift"];

        this._setCookieKeyValue(lastAuthKey, userID);

        cookiePrefix += userID + ".";

        tokenKeys.forEach(key => {
            var cookieKey = cookiePrefix + key;
            this._setCookieKeyValue(cookieKey, accessToken[key]);
        });

        var userData = {
            UserAttributes: [
                {Name:"sub", Value:userID},
                {Name:"email", Value:accessToken.user.email},
                {Name:"mmhmmTVAlpha", Value:accessToken.user.mmhmmTVAlpha === true},
                {Name:"mmhmmTVBeta", Value:accessToken.user.mmhmmTVBeta === true},
            ],
            Username: userID,
        };

        this._setCookieKeyValue(cookiePrefix + "userData", escape(JSON.stringify(userData)));
        this._setCookieKeyValue(cookiePrefix + "clockDrift", 0);
    }
    getAccountsFromCookies() {
        var cognitos = this._getCookies(true);

        var lastAccountUUID = null;
        var accounts = {};

        function cookieCutter(cookieKey) {
          var first = cookieKey.indexOf(".");
          if (first == -1) {
            return null;
          }
          var clientID = cookieKey.substring(0, first);

          var last = cookieKey.lastIndexOf(".");
          if (last == -1) {
            return null;
          }

          var key = cookieKey.substring(last+1);

          var uuid = null;
          if (first != last) {
            uuid = cookieKey.substring(first+1, last);
          }
          return {clientID, uuid, key}
        }

        for (var cookieKey in cognitos) {
            var value = cognitos[cookieKey];

            var components = cookieCutter(cookieKey);
            if (components == null) {
                continue;
            }

            var clientID = components.clientID;
            var uuid = components.uuid;
            var key = components.key;

            if (key == "LastAuthUser") {
                lastAccountUUID = value;
                continue;
            }
            if (key == "userData") {
                try {
                    value = JSON.parse(unescape(value));
                }
                catch (err) {
                    gSentry.exception(err);
                    console.error("Error unpacking userData", value, err);
                    continue;
                }
            }

            var params = accounts[uuid];
            if (params == null) {
                params = {}
                accounts[uuid] = params;
            }
            if (params[key] != null) {
                console.log("Received multiple values for cookie:", cookieKey, components);
                gSentry.message(`Received multiple values for cookie: ${cookieKey}`)
                this._setCookieKeyValue(`${this.cookiePrefix}${cookieKey}`, null);
            }
            params[key] = value;
        }

        var keys = Object.keys(accounts);
        keys.forEach(key => {
            var account = accounts[key];
            if (account.refreshToken == null || account.accessToken == null || account.idToken == null) {
                delete accounts[key];
            }
        })
        return {lastAccountUUID, accounts};
    }
}
CognitoCookies.shared = new CognitoCookies();
