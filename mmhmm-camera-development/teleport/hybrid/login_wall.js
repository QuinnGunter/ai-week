//
//  hybrid/login_pane.js
//  mmhmm
//
//  Created by Seth Hitchings on 1/16/2025
//  Copyright 2025 mmhmm inc. All rights reserved.
//

class LoginWall extends HybridWall {
    constructor() {
        const container = document.createElement("div");
        super(container);
        this.buildUI(container);
    }

    show(onDismiss) {
        this.startListeners();
        super.show(onDismiss);
    }

    dismiss() {
        this.stopListeners();
        this.errorSheet?.dismiss();
        super.dismiss();
    }

    startListeners() {
        NotificationCenter.default.addObserver(
            mmhmmAPI.Notifications.AuthenticationChanged,
            null,
            this.authenticationChanged,
            this
        );
    }

    stopListeners() {
        NotificationCenter.default.removeObserver(
            mmhmmAPI.Notifications.AuthenticationChanged,
            null,
            this.authenticationChanged,
            this
        );
    }

    authenticationChanged() {
        // When the browser side of sign in is complete, we open a native URL
        // that includes the handoff token. The hybrid app handles this URL
        // and calls mmhmmAPI.performAuthenticationHandoff(token). That function
        // will post an AuthenticationChanged notification regardless of whether
        // the handoff token exchange is successful, so we need to check here.
        if (mmhmmAPI.defaultEndpoint().isAuthenticated == false) {
            this.showAuthenticationFailureMessage();
            return;
        }

        this.dismiss();
    }

    showAuthenticationFailureMessage() {
        if (this.errorSheet) {
            // If we're already showing an error message, don't show another
            return;
        }

        const errorSheet = ShowMessageDialog(
            LocalizedString("Sign in failed"),
            LocalizedString("An unexpected error occurred signing in. Please try again."),
            LocalizedString("OK")
        );
        errorSheet.addEventListener("dismiss", _ => this.errorSheet = null);
        this.errorSheet = errorSheet;
    }

    buildUI(content) {
        content.classList.add("content");

        const header = document.createElement("h1");
        header.innerText = LocalizedString("Welcome to Airtime");
        content.appendChild(header);

        const signIn = document.createElement("button");
        signIn.classList.add("capsule");
        signIn.innerText = LocalizedString("Log in with browser");
        content.appendChild(signIn);

        const signUp = document.createElement("p");
        content.appendChild(signUp);

        const signUpMessage = LocalizedString("Don’t have an account? <0>Create one here</0>");
        let signUpLink = null;
        EnumerateLinkifiedString(signUpMessage, (tagNum, text) => {
            if (tagNum != 0) {
                signUp.appendChild(document.createTextNode(text));
            } else {
                signUpLink = document.createElement("a");
                signUpLink.innerText = text;
                signUp.appendChild(signUpLink);
            }
        });

        const endpoint = mmhmmAPI.defaultEndpoint();
        signIn.addEventListener("click", evt => {
            Analytics.Log("button.click", {action: "sign in", authentication_required: true});

            // Prevent additional clicks for a second
            signIn.disabled = true;
            setTimeout(_ => signIn.disabled = false, 1000);

            endpoint.performAuthentication().catch(err => {
                console.error("Error signing in", err);
            });
        })

        if (signUpLink != null) {
            signUpLink.addEventListener("click", evt => {
                Analytics.Log("button.click", {action: "sign up", authentication_required: true});
                endpoint.performCreateAccount().catch(err => {
                    console.error("Error creating account", err);
                });
            })
        }
    }
}
