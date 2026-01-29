//
//  commerce/analytics.js
//  mmhmm
//
//  Created by Seth Hitchings on 5/20/2025.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

class CommerceAnalytics {

    static onPaywallShown(canActivateDailyTrial) {
        Analytics.Log("paywall.shown", {
            daily_trial_available: canActivateDailyTrial,
        });
    }

    static onPaywallDismissed() {
        Analytics.Log("paywall.dismissed");
    }

    static onManagePaymentMethodClicked(element) {
        Analytics.Log("application.element_clicked", {
            element,
            selector_type: "button",
            new_user_trial_status: "expired",
            value: "manage payment information",
        });
    }

    static onBuyNowButtonClicked(element, hasNewUserTrial) {
        Analytics.Log("application.element_clicked", {
            element,
            selector_type: "button",
            new_user_trial_status: hasNewUserTrial ? "active" : "expired",
            value: "buy now",
        });
    }

    static onStartDailyTrial(duration) {
        Analytics.Log("application.element_clicked", {
            element: "paywall",
            selector_type: "button",
            value: "start hour",
        });
        Analytics.Log("trial.initiated", {
            type: "daily",
            duration,
        });
    }

    static onEndDailyTrial() {
        Analytics.Log("trial.ended", {
            type: "daily",
        });
    }
}
