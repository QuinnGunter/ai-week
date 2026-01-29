//
//  commerce/paywall.js
//  mmhmm
//
//  Created by Seth Hitchings on 5/12/2025
//  Copyright 2025 mmhmm inc. All rights reserved.
//

/**
 * Implements a full screen modal that displays our "Consequences" paywall.
 */
class PaywallSheet extends FullScreenModal {

    static #containerClass = "paywall_sheet";

    #trial = null;
    #monthlySubscriptionPrice = null;
    #cameraPrice = null;
    #paymentFailed = false;
    #buyNowCallback = null;
    #activateTrialCallback = null;
    #signOutCallback = null;
    #cooldownTimeout = null;

    /**
     * @param {DailyFreeTrial} trial
     */
    constructor(trial, monthlySubscriptionPrice, cameraPrice, paymentFailed,
        buyOrUpdateSubscriptionCallback, activateTrialCallback, signOutCallback) {
        const container = document.createElement("div");
        container.classList.add(PaywallSheet.#containerClass, "h-full", "w-full", "flex", "flex-col", "items-center", "justify-center");
        super(null, container, "paywall", false);

        this.#trial = trial;
        this.#monthlySubscriptionPrice = monthlySubscriptionPrice;
        this.#cameraPrice = cameraPrice;
        this.#paymentFailed = paymentFailed;
        this.#buyNowCallback = buyOrUpdateSubscriptionCallback;
        this.#activateTrialCallback = activateTrialCallback;
        this.#signOutCallback = signOutCallback;

        this.populateContainer(container);
    }

    destroy() {
        if (this.#cooldownTimeout) {
            window.clearInterval(this.#cooldownTimeout);
            this.#cooldownTimeout = null;
        }
        super.destroy();
    }

    populateContainer(container) {
        container.appendChild(this.buildBody());
        container.appendChild(this.buildFooter());
    }

    buildBody() {
        const container = document.createElement("div");
        container.classList.add("flex", "flex-1", "flex-col", "items-center", "justify-center", );

        container.appendChild(this.buildSpacer());
        container.appendChild(this.buildSubscribeSection());
        container.appendChild(this.buildSpacer("min"));

        container.appendChild(this.buildFreeHourSection());

        return container;
    }

    buildSpacer(...classes) {
        const spacer = document.createElement("div");
        spacer.classList.add("spacer", ...classes);
        return spacer;
    }

    repopulateContainer() {
        const container = this.contents.querySelector(`.${PaywallSheet.#containerClass}`);
        container.replaceChildren();
        this.populateContainer(container);
    }

    buildSubscribeSection() {
        const container = document.createElement("div");
        container.classList.add("buy_now", "flex", "flex-col", "items-center", "justify-center");

        const top = document.createElement("div");
        top.classList.add("flex", "flex-col", "items-center", "justify-center");
        container.appendChild(top);

        const { titleMessage, bodyMessage, cta } = this.#getBuyNowStrings();

        const title = document.createElement("div");
        title.classList.add("text-title");
        title.innerText = titleMessage;
        top.appendChild(title);

        const message = document.createElement("div");
        message.classList.add("text-body");
        message.innerText = bodyMessage;
        top.appendChild(message);

        const button = newIconButton(cta, AppIcons.BuyNow(),
            true, _ => this.#buyNowCallback(), null, ["capsule"]);
        container.appendChild(button);

        return container;
    }

    #getBuyNowStrings() {
        if (this.#paymentFailed) {
            return {
                titleMessage: LocalizedString("Payment failed"),
                bodyMessage: LocalizedString("Your transaction could not be completed. Please update your payment information in account settings."),
                cta: LocalizedString("Update payment information")
            };
        } else {
            return {
                titleMessage: LocalizedString("Trial ended"),
                bodyMessage: LocalizedStringFormat("Your 14-day free trial of Airtime is over. Get all Airtime tools for ${subscriptionPrice} per month or unlock just Airtime Camera with a ${cameraPrice} one-time purchase.",
                    {cameraPrice: this.#cameraPrice, subscriptionPrice: this.#monthlySubscriptionPrice}),
                cta: LocalizedString("Buy now")
            };
        }
    }

    buildFreeHourSection() {
        const container = document.createElement("div");
        container.classList.add("free_hour", "flex", "flex-col", "items-center", "justify-center", "gap-12px");

        container.appendChild(AppIcons.Stopwatch());


        const message = document.createElement("div");
        message.classList.add("text-body");
        message.innerText = LocalizedString("Or you can use Airtime free for up to one hour each day.");
        container.appendChild(message);

        if (this.#trial.canActivateDailyTrial()) {
            container.appendChild(this.buildStartFreeHour());
        } else {
            container.appendChild(this.buildCooldown());
        }

        return container;
    }

    buildStartFreeHour() {
        // The user can click a button to start their free hour-per-day
        const startButton = document.createElement("button");
        startButton.classList.add("capsule", "secondary");
        startButton.innerText = LocalizedString("Start hour");
        startButton.addEventListener("click", () => this.#activateTrialCallback());

        return startButton;
    }

    buildCooldown() {
        // There's nothing the user can do except wait
        const container = document.createElement("div");

        const nextStart = this.#trial.getCooldownEndTime();
        const nextStartTime = nextStart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        const message = document.createElement("div");
        message.classList.add("text-body", "paywall-unlock-message");
        container.appendChild(message);

        const unlockString = this.#isToday(nextStart) ?
            LocalizedStringFormat("Unlocks today at <0>${time}</0>", { time: nextStartTime }) :
            LocalizedStringFormat("Unlocks tomorrow at <0>${time}</0>", { time: nextStartTime });

        EnumerateLinkifiedString(unlockString, (tagNum, text) => {
            let node = null;
            if (tagNum == 0) {
                node = document.createElement("span");
                node.classList.add("text-content-primary");
                message.appendChild(node);
            } else {
                node = message;
            }
            node.appendChild(document.createTextNode(text));
        });

        const cooldownRemaining = nextStart - new Date();
        this.#cooldownTimeout = window.setTimeout(() => {
            // The user is now eligible to start their free hour
            this.#cooldownTimeout = null;
            this.repopulateContainer();
        }, cooldownRemaining);

        return container;
    }

    #isToday(date) {
        const today = new Date();
        return date.getFullYear() === today.getFullYear() &&
            date.getMonth() === today.getMonth() &&
            date.getDate() === today.getDate();
    }

    buildFooter() {
        const container = document.createElement("div");
        container.classList.add("footer", "w-full", "flex", "items-center", "justify-end");

        const button = document.createElement("button");
        button.classList.add("capsule", "secondary", "signout");
        button.innerText = LocalizedString("Sign out");
        button.addEventListener("click", () => this.#onSignOut(button));
        container.appendChild(button);

        return container;
    }

    #onSignOut(button) {
        button.disabled = true;
        this.#signOutCallback();
    }

}
