//
//  signin_sheet.js
//  mmhmm
//
//  Created by Steve White on 10/27/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

class SignInSheet extends ActionSheet {
  constructor(title, width = 320) {
    var contents = document.createElement("div");
    super(title, contents, width, false, true, [0, 0], "sign_in_sheet");
    this.setAllowAutoDismiss();
    this.populateContents(contents);
  }
  populateContents(contents) {
    contents.id = "sign_in";

    var icon = document.createElement("img");
    icon.className = "sign_in_icon";
    icon.src = "assets/dialogs/split-pick-sign-in.png";

    var message = document.createElement("p");
    message.className = "sign_in_message";
    message.innerText = LocalizedString(
      "Make great videos quickly, watch videos on your own schedule, and talk with friends and colleagues—all with Airtime."
    );

    var options = document.createElement("div");
    options.className = "sign_in_options";

    var createAcctBtn = document.createElement("button");
    createAcctBtn.className = "capsule sign_in_create";
    createAcctBtn.innerText = LocalizedString("Create account");
    createAcctBtn.addEventListener("click", (evt) => {
      this.performCreateAccount();
    });
    options.appendChild(createAcctBtn);

    var signInBtn = document.createElement("button");
    signInBtn.className = "capsule sign_in";
    signInBtn.innerText = LocalizedString("Sign in");
    signInBtn.addEventListener("click", (evt) => {
      this.performAuthentication();
    });
    options.appendChild(signInBtn);

    contents.appendChild(icon);
    contents.appendChild(message);
    contents.appendChild(options);
  }
  performCreateAccount() {
    let promise = null;
    const endpoint = mmhmmAPI.defaultEndpoint();
    promise = endpoint.performCreateAccount();

    promise
      .then((result) => {
        if (result == null) {
          return;
        }
        this.dismiss(true);
      })
      .catch((err) => {
        var errorMessage = err.toString();
        ShowAlertView(
          LocalizedString("Create Account Error"),
          LocalizedStringFormat(
            "An unknown error occurred while creating account: ${errorMessage}",
            { errorMessage }
          )
        );
      });
  }
  performAuthentication() {
    let promise = null;
    const endpoint = mmhmmAPI.defaultEndpoint();
    promise = endpoint.performAuthentication();

    promise
      .then((result) => {
        if (result == null) {
          return;
        }
        this.dismiss(true);
      })
      .catch((err) => {
        var errorMessage = err.toString();
        ShowAlertView(
          LocalizedString("Sign In Error"),
          LocalizedStringFormat(
            "An unknown error occurred while signing in: ${errorMessage}",
            { errorMessage }
          )
        );
      });
  }
}
