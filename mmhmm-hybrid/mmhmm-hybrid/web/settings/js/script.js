const params = new URLSearchParams(window.location.search);
var theme = params.has('theme') ? params.get('theme') : 'light';
onThemeChanged(theme);

const airtimeSettings = {
    launchTool: "Camera",
    shortcuts: {
        createOrStopRecording: "Ctrl+Shift+2",
        recordEntireScreen: "Ctrl+Shift+6",
        recordWindow: "Ctrl+Shift+7"
    }
};

const previousSettings = JSON.parse(JSON.stringify(airtimeSettings));
const defaultSettings = JSON.parse(JSON.stringify(airtimeSettings));
const inFlightUpdates = {};


const MODIFIERS = new Set(["Control", "Shift", "Alt", "Meta"]);
function isModifierKey(key) { return MODIFIERS.has(key); }

function normalizeMainKey(e) {
    const code = e.code;
    if (code.startsWith("Digit")) return code.replace("Digit", "");
    if (code.startsWith("Key")) return code.replace("Key", "").toUpperCase();
    if (/^F\d{1,2}$/.test(code)) return code;
    if (code.startsWith("Numpad")) return code.replace("Numpad", "Num ");
    const map = {
        Escape: "Esc", Enter: "Enter", Tab: "Tab", Backspace: "Backspace",
        Space: "Space", ArrowUp: "Up", ArrowDown: "Down",
        ArrowLeft: "Left", ArrowRight: "Right", Delete: "Del",
        Insert: "Ins", Home: "Home", End: "End",
        PageUp: "PgUp", PageDown: "PgDn"
    };
    return map[code] || code;
}

function formatModifiers(e) {
    const parts = [];
    if (e.ctrlKey) parts.push("Ctrl");
    if (e.altKey) parts.push("Alt");
    if (e.shiftKey) parts.push("Shift");
    if (e.metaKey) parts.push("Win");
    return parts;
}

function recordShortcut(input, keyName) {
    let recording = false;

    input.addEventListener("focus", () => {
        recording = true;
        input.dataset.prev = input.value;
        input.value = "";
        input.placeholder = "Press keys…";
    });

    input.addEventListener("blur", () => {
        recording = false;
        input.placeholder = "";
        if (!input.value && input.dataset.prev) {
            input.value = input.dataset.prev;
        }
        input.dataset.prev = "";
    });

    input.addEventListener("keydown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!recording) return;

        if (e.key === "Escape") {
            input.blur();
            return;
        }

        if (isModifierKey(e.key)) return;

        const mods = formatModifiers(e);
        const main = normalizeMainKey(e);
        const shortcutValue = [...mods, main].join("+");
        if (mods.length === 0) {
            showToast("Please include at least one modifier key (Ctrl, Alt, Shift, Win)");
            input.blur();
            return;
        }
        input.value = shortcutValue;
        airtimeSettings.shortcuts[keyName] = shortcutValue;
        sendSettingsUpdate(`shortcuts.${keyName}`, shortcutValue);
        input.blur();
    });
}

recordShortcut(document.getElementById("shortcut1"), "createOrStopRecording");
recordShortcut(document.getElementById("shortcut2"), "recordEntireScreen");
recordShortcut(document.getElementById("shortcut3"), "recordWindow");

window.gHybrid.eventProxy.setEventEmitterCallback(handleSettingsEvent);

function handleSettingsEvent(event) {
    const { name, payload } = event;
    const key = payload.key;
    const value = payload.value;
    const reason = payload.reason;

    if (name === "settings.sync") {
        applySyncedSettings(payload);
        return;
    }

    if (!key || !inFlightUpdates[key]) return;

    const [group, subkey] = key.includes(".") ? key.split(".") : [null, key];
    const input = document.querySelector(`[data-key="${key}"]`);
    const prevValue = inFlightUpdates[key].prevValue;

    if (name === "settings.changed.success") {
        applySuccessfulUpdate(group, subkey, value);
    }

    if (name === "settings.changed.failed") {
        revertFailedUpdate(input, group, subkey, prevValue, reason);
    }

    delete inFlightUpdates[key];
}

function applySyncedSettings(payload) {
    Object.assign(airtimeSettings, payload);
    Object.assign(previousSettings, JSON.parse(JSON.stringify(payload)));

    document.getElementById("shortcut1").value = airtimeSettings.shortcuts.createOrStopRecording;
    document.getElementById("shortcut2").value = airtimeSettings.shortcuts.recordEntireScreen;
    document.getElementById("shortcut3").value = airtimeSettings.shortcuts.recordWindow;

    createDropdown("launch-tool-container", ["Camera", "Creator"], (selected) => {
        sendSettingsUpdate("launchTool", selected);
    });
}

function applySuccessfulUpdate(group, subkey, value) {
    showToast("Saved");
    if (group) previousSettings[group][subkey] = value;
    else previousSettings[subkey] = value;
}

function revertFailedUpdate(input, group, subkey, prevValue, reason) {
    showToast(reason || "Unable to save");

    if (input && prevValue !== undefined) {
        if (input.tagName === "INPUT") {
            input.value = prevValue;
        } else {
            input.textContent = prevValue;
        }

        if (group) airtimeSettings[group][subkey] = prevValue;
        else airtimeSettings[subkey] = prevValue;
    }
}



function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("visible");
    }, 10);

    setTimeout(() => {
        toast.classList.remove("visible");
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function createDropdown(containerId, options, onSelect) {
    const container = document.getElementById(containerId);
    container.innerHTML = `
        <div class="dropdown-wrapper">
            <div class="dropdown-toggle" data-key="launchTool" tabindex="0">${airtimeSettings.launchTool}</div>
            <ul class="dropdown-menu">
                ${options.map(opt => `<li class="dropdown-item">${opt}</li>`).join("")}
            </ul>
        </div>
    `;

    const toggle = container.querySelector(".dropdown-toggle");
    const menu = container.querySelector(".dropdown-menu");
    const items = container.querySelectorAll(".dropdown-item");

    let highlightedIndex = -1;

    function openMenu() {
        menu.style.display = "block";
        highlightedIndex = -1;
    }

    function closeMenu() {
        menu.style.display = "none";
        items.forEach(i => i.classList.remove("highlighted"));
        highlightedIndex = -1;
    }

    function highlightItem(index) {
        items.forEach(i => i.classList.remove("highlighted"));
        if (index >= 0 && index < items.length) {
            items[index].classList.add("highlighted");
            items[index].scrollIntoView({ block: "nearest" });
            highlightedIndex = index;
        }
    }

    toggle.addEventListener("click", () => {
        menu.style.display === "block" ? closeMenu() : openMenu();
    });

    items.forEach((item) => {
        item.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            toggle.textContent = item.textContent;
            items.forEach(i => i.classList.remove("selected"));
            item.classList.add("selected");
            onSelect(item.textContent);
            closeMenu();
        });
    });


    toggle.addEventListener("keydown", (e) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            if (menu.style.display !== "block") openMenu();
            highlightItem((highlightedIndex + 1) % items.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (menu.style.display !== "block") openMenu();
            highlightItem((highlightedIndex - 1 + items.length) % items.length);
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (highlightedIndex >= 0) {
                const selected = items[highlightedIndex];
                toggle.textContent = selected.textContent;
                items.forEach(i => i.classList.remove("selected"));
                selected.classList.add("selected");
                onSelect(selected.textContent);
            }
            closeMenu();
        } else if (e.key === "Escape") {
            closeMenu();
        }
    });

    items.forEach((item, index) => {
        item.addEventListener("click", () => {
            toggle.textContent = item.textContent;
            items.forEach(i => i.classList.remove("selected"));
            item.classList.add("selected");
            onSelect(item.textContent);
            closeMenu();
        });
    });

    toggle.addEventListener("blur", () => {
        setTimeout(() => closeMenu(), 100);
    });
}

document.querySelector(".restore-btn").addEventListener("click", () => {
    // Restore dropdown
    const dropdown = document.querySelector('[data-key="launchTool"]');
    const defaultTool = defaultSettings.launchTool;
    dropdown.textContent = defaultTool;
    sendSettingsUpdate("launchTool", defaultTool);

    // Restore shortcuts
    for (const key in defaultSettings.shortcuts) {
        const fullKey = `shortcuts.${key}`;
        const input = document.querySelector(`[data-key="${fullKey}"]`);
        const defaultValue = defaultSettings.shortcuts[key];

        if (input) {
            input.value = defaultValue;
            sendSettingsUpdate(fullKey, defaultValue);
        }
    }
});

function onThemeChanged(theme) {
    const isLight = theme === "light";
    document.body.classList.toggle("light", isLight);
    document.body.classList.toggle("dark", !isLight);
}

function sendSettingsUpdate(keyPath, value) {
    const [group, subkey] = keyPath.includes(".") ? keyPath.split(".") : [null, keyPath];

    const prevValue = group ? previousSettings[group][subkey] : previousSettings[subkey];
    inFlightUpdates[keyPath] = { value, prevValue };

    if (group) {
        airtimeSettings[group][subkey] = value;
    } else {
        airtimeSettings[subkey] = value;
    }

    window.gHybrid.eventProxy.handleEvent({
        name: `settings.${keyPath}.changed`,
        payload: value
    });
}

window.gHybrid.eventProxy.handleEvent({
    name: "settings.requestSync",
    payload: {}
});

