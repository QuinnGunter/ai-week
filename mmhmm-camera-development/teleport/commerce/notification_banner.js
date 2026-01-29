//
//  notification_banner.js
//  mmhmm
//
//  Created by Jonathan Potter on 5/10/24.
//  Copyright © 2024 mmhmm, inc. All rights reserved.
//

const ONE_MINUTE = 60 * 1000;

class NotificationBanner {

    #cls = {
        container: "commerce-banner",
        banner: "banner",
    };

    constructor () {
    }

    refresh(user, dailyTrial) {
        this.populateContainer(user, dailyTrial);
    }

    showFreeTrialStatus(user) {
        if (!user) {
            return false;
        } else if (new Date(user.created) < CommerceUtils.trialStatusLaunchDate) {
            return false;
        } else if (new Date(user.created) < CommerceUtils.paywallsLaunchDate) {
            // The Airtime launch doesn't affect the trial experience for existing users
            return user.trial_group != CommerceUtils.controlGroup;
        } else {
            // Users created after the Airtime launch always see the trial status
            return true;
        }
    }

    setHidden(hidden) {
        this.container.classList.toggle("hidden", hidden);
    }

    get container() {
        const parent = document.getElementById("notifications-banner");
        let container = parent?.querySelector(`${`.${this.#cls.container}`}`);
        if (parent && !container) {
            // Our container doesn't exist yet; create it and attach it
            // to the notifications area
            container = this.#createContainer();
            parent.appendChild(container);
        }
        return container;
    }

    get leftColumn() {
        return this.container.querySelector(":scope > .left");
    }

    get centerColumn() {
        return this.container.querySelector(":scope > .center");
    }

    get rightColumn() {
        return this.container.querySelector(":scope > .right");
    }

    #createContainer() {
        const container = document.createElement("div");
        container.classList.add(this.#cls.container, this.#cls.banner);

        container.innerHTML = `
            <div class="left flex items-center justify-start gap-2"></div>
            <div class="center flex items-center justify-center gap-2"></div>
            <div class="right flex items-center justify-end gap-2"></div>`;

        return container;
    }

    /**
     * @param {?Object} user the user returned by mmhmmAPI.user
     * @param {?DailyFreeTrial} dailyTrial the daily trial object returned by mmhmmAPI.getDailyTrialState
     */
    populateContainer(user, dailyTrial) {
        if (!this.container) {
            return;
        }

        // If there's no logged in user, we don't show the banner
        // If the user is already paying, we don't show the banner
        const hidden = (user == null) ||
            (user.hasPurchasedCamera === true) ||
            (CommerceUtils.hasSubscription(user) && !CommerceUtils.subscriptionRequiresAttention(user));

        this.setHidden(hidden);
        if (hidden) {
            this.clearCountdownTimer();
        } else {
            this.renderNotification(user, dailyTrial);
        }
    }

    clearCountdownTimer() {
        if (this.countdownTimer) {
            window.clearInterval(this.countdownTimer);
            this.countdownTimer = null;
        }
    }

    renderNotification(user, dailyTrial) {
        // Reset the container class list
        const container = this.container;
        container.classList = this.#cls.container;
        container.classList.add(this.#cls.banner);

        const notificationSpan = document.createElement("span");
        notificationSpan.classList.add("text-ellipsis");

        const buyButton = this.makeBuyButton();

        if (dailyTrial && dailyTrial.hasActiveDailyTrial()) {
            // The user has an active daily trial. Show the remaining time.
            container.classList.add("active", "daily");

            notificationSpan.setAttribute("data-tippy-content", LocalizedString("Time left on daily free trial"));
            tippy(notificationSpan);

            // Left column: countdown timer
            const expires = dailyTrial.trialExpires();
            this.updateRemainingTime(expires, notificationSpan);
            this.leftColumn.replaceChildren(AppIcons.Stopwatch(), notificationSpan);

            // Right column: buy button
            this.centerColumn.replaceChildren();
            this.rightColumn.replaceChildren(buyButton);

            this.clearCountdownTimer();
            this.countdownTimer = window.setInterval(() => {
                const remaining = this.updateRemainingTime(expires, notificationSpan);
                if (remaining <= 0) {
                    this.clearCountdownTimer();
                }
            }, 500);
        } else if (CommerceUtils.subscriptionRequiresAttention(user)) {
            this.clearCountdownTimer();

            // The user has a failed payment. Show the error message.
            container.classList.add("expired");
            notificationSpan.innerText = LocalizedString("Your transaction could not be completed.");

            this.leftColumn.replaceChildren(notificationSpan);
            this.centerColumn.replaceChildren();
            this.rightColumn.replaceChildren(this.makeUpdatePaymentMethodButton());
        } else if (this.showFreeTrialStatus(user)) {
            this.clearCountdownTimer();

            // Users who aren't in the control group see
            // the number of days remaining in their new user trial
            // or a message indicating that the new user trial has ended
            if (user.freeTrial) {
                const daysLeft = daysUntil(user.freeTrialEnd);
                if (daysLeft > 2) {
                    container.classList.add("active");
                } else {
                    container.classList.add("expiring");
                }

                if (daysLeft <= 1) {
                    notificationSpan.innerText = LocalizedString("You have 1 day left on your free trial.");
                } else {
                    notificationSpan.innerText = LocalizedStringFormat("You have ${days} days left on your free trial.", { days: daysLeft });
                }
            } else  {
                container.classList.add("expired");
                notificationSpan.innerText = LocalizedString("Your free trial has expired.");
            }

            this.leftColumn.replaceChildren(notificationSpan);
            this.centerColumn.replaceChildren();
            this.rightColumn.replaceChildren(buyButton);
        } else {
            container.classList.add("active");
            notificationSpan.innerText = LocalizedString("Airtime is free to evaluate")

            this.leftColumn.replaceChildren(notificationSpan);
            this.centerColumn.replaceChildren();
            this.rightColumn.replaceChildren(buyButton);
        }
    }

    updateRemainingTime(expires, span) {
        const secondsUntilExpiration = Math.floor((expires - new Date()) / 1000);
        const minutes = Math.floor(secondsUntilExpiration / 60).toString().padStart(2, "0");
        const seconds = (secondsUntilExpiration % 60).toString().padStart(2, "0");

        if (minutes > 0) {
            span.innerText = LocalizedStringFormat("${minutes} minutes", { minutes });
        } else {
            span.replaceChildren();

            const message = LocalizedStringFormat("<0>00:${seconds}</0>", { seconds });

            EnumerateLinkifiedString(message, (tagNum, text) => {
                let node = null;
                if (tagNum == 0) {
                    node = document.createElement("span");
                    node.classList.add("expiring");
                    span.appendChild(node);
                } else {
                    node = span;
                }
                node.appendChild(document.createTextNode(text));
            });
        }

        return secondsUntilExpiration;
    }

    makeUpdatePaymentMethodButton() {
        return newIconButton(
            LocalizedString("Update payment method"),
            AppIcons.BuyNow(),
            true,
            () => CommerceUtils.openManagePaymentMethodLink("banner"),
            undefined,
            ["buy-now"],
        );
    }

    makeBuyButton() {
        const button = newIconButton(
            LocalizedString("Buy now"),
            AppIcons.BuyNow(),
            true,
            () => CommerceUtils.openBuyNowLink("banner"),
            undefined,
            ["buy-now"],
        );
        button.removeAttribute("title");
        button.setAttribute("data-tippy-content", LocalizedString("Buy now"));
        tippy(button);
        return button;
    }

}

NotificationBanner.shared = new NotificationBanner();
