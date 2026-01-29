//
//  copy_link.js
//  mmhmm
//
//  Created by Justin Juno on 1/12/23.
//  Copyright © 2023 mmhmm, inc. All rights reserved.
//

function AddCopyLinkButton(
  textToCopy,
  containerEl,
  inputEl = null,
  analyticsEvent = null,
  analyticsValues = {}
) {
  if (!textToCopy || !containerEl) {
    console.warn("Please provide the textToCopy and containerEl.");
    return;
  }

  // Create the button element.
  let copyLinkButton = document.createElement("button");
  copyLinkButton.className = "copyLinkButton";
  const copyIcon = AppIcons.Copy();
  const checkmarkIcon = AppIcons.Checkmark();
  copyLinkButton.appendChild(copyIcon);
  copyLinkButton.appendChild(checkmarkIcon);
  containerEl.appendChild(copyLinkButton);
  this.copyLinkButton = copyLinkButton;

  // Sets the desired visibility of the icon within the button.
  const setIconVisibility = function (icon, visible) {
    if (visible == true) {
      icon.removeAttributeNS(null, "style");
    } else {
      icon.setAttributeNS(null, "style", "display: none");
    }
  };

  setIconVisibility(copyIcon, true);
  setIconVisibility(checkmarkIcon, false);

  // Add the event listener to the button.
  copyLinkButton.addEventListener("click", (evt) => {
    // Copies the textToCopy to clipboard.
    navigator.clipboard.writeText(textToCopy);

    // If input element is provided, select it.
    inputEl?.select();

    // If analytics event is provided, log it and pass values if they exists.
    analyticsEvent && Analytics.Log(analyticsEvent, analyticsValues);

    // Adjust the buttons appearance in the DOM.
    copyLinkButton.disabled = true;
    copyLinkButton.style.backgroundColor = "rgb(0, 191, 131)";
    setIconVisibility(copyIcon, false);
    setIconVisibility(checkmarkIcon, true);

    // Add the copied message to the dom.
    const message = document.createElement("div");
    message.innerText = LocalizedString("Copied");
    message.className = "copyLinkButtonMessage";
    copyLinkButton.parentElement.appendChild(message);

    // Use timeout to remove the copied message and return button to original state.
    window.setTimeout(() => {
      setIconVisibility(copyIcon, true);
      setIconVisibility(checkmarkIcon, false);
      copyLinkButton.disabled = false;
      copyLinkButton.style.backgroundColor = "";
      copyLinkButton.parentElement.removeChild(message);
    }, 1500);
  });

  return;
}
