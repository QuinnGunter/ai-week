
'use strict';

const params = new URLSearchParams(window.location.search)
const messageId = parseInt(params.get('id'));
var includeScreens = !params.has('filter') || params.get('filter') == 'screens';
var includeWindows = !params.has('filter') || params.get('filter') == 'windows';
function hideGroup(groupId, headerIndex) {
    const header = document.querySelectorAll(".group-header")[headerIndex];
    const container = document.getElementById(groupId);
    if (header && container) {
        header.style.display = "none";
        container.style.display = "none";
    }
}

if (!includeScreens) hideGroup("screens", 0);
if (!includeWindows) hideGroup("windows", 1);

var theme = params.get('theme');
if(!theme) {
    theme = 'light';
}
onThemeChanged(theme);

var selectedItem = null;

var allItems = null;

enumerateScreenshareMedia(includeScreens, includeWindows, handleScreenShareEnumerationSuccess, handleScreenShareError);

function handleError(error) {
  errorMsg(`getUserMedia error: ${error.name}`, error);
}

function errorMsg(msg, error) {
  const errorElement = document.querySelector('#errorMsg');
  errorElement.innerHTML += `<p>${msg}</p>`;
  if (typeof error !== 'undefined') {
    console.error(error);
  }
}

function handleScreenShareEnumerationSuccess(items) {

  allItems = items;
  const screensContainer = document.getElementById("screens");
  const windowsContainer = document.getElementById("windows");

  for (let i = 0; i < items.length; i++) {
    const rootDiv = document.createElement("div");
    rootDiv.className = "screenshare-image";
    const img = document.createElement("img");
    img.width = 128;
    img.height = 72;
    img.src = items[i].preview;
    img.onclick = onItemSelected;
    img.id = items[i].id;

    rootDiv.appendChild(img);

    const textDiv = document.createElement("div");
    textDiv.className = "label";
    textDiv.innerText = items[i].title;

    rootDiv.appendChild(textDiv);

    if (items[i].type == 'screen') {
      screensContainer.appendChild(rootDiv);
    }
    else {
      windowsContainer.appendChild(rootDiv);
    }
  }
}

function handleScreenShareError(error) {
  console.error(error);
}

function onShare() {
    if (selectedItem !== null) {
        var title = "screenshare";
        var processName = "";
        allItems.forEach(item => {
            if (item.id === selectedItem.id) {
                title = item.title;
                processName = item.processName;
            }
        });
        screenshareMediaSelected(messageId, selectedItem.id, title,processName);
    }

    window.close();
}

function onItemSelected() {

  const shareButton = document.getElementById("shareButton");
  shareButton.classList.add("dialog-button-selected");
  shareButton.disabled = false;

  if (selectedItem !== null) {
    selectedItem.classList.remove("selected-item");
  }

  selectedItem = this;
  selectedItem.classList.add("selected-item");
}

function onThemeChanged(theme) {
    const isLight = theme == "light";
    document.body.classList.toggle("light", isLight);
    document.body.classList.toggle("dark", !isLight);
}

