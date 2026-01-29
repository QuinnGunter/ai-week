// Callback-updated UI elements
const virtualCameraStateLabel = document.getElementById("install-virtual-camera").getElementsByClassName("state")[0];
const installButton = document.getElementById("install-virtual-camera-button");
const authorizeButton = document.getElementById("authorize-virtual-camera");
const uninstallButton = document.getElementById("uninstall-virtual-camera");
const relaunchButton = document.getElementById("request-relaunch");
const rebootButton = document.getElementById("request-reboot");
const clientsLabel = document.getElementById("stream-clients-list").getElementsByClassName("auto-state")[0];
const titlebarButtonLabel = document.getElementById("titlebar").getElementsByClassName("state")[0];
const toolboxButtonLabel = document.getElementById("titlebar-toolbox-button-callback").getElementsByClassName("state")[0];
const titlebarModeLabel = document.getElementById("titlebar-mode-change").getElementsByClassName("state")[0];
const virtualCameraSupportViewDidAppearButton = document.getElementById("virtual-camera-support-view-did-appear")
const virtualCameraSupportViewWillDisappearButton = document.getElementById("virtual-camera-support-view-will-disappear")
const powerStateLabel = document.getElementById("power-monitor-state").getElementsByClassName("state")[0];
const powerMethodLabel = document.getElementById("power-monitor-method").getElementsByClassName("state")[0];
const powerLockStateLabel = document.getElementById("power-monitor-lock-state").getElementsByClassName("state")[0];
const loginItemInstallerLabel = document.getElementById("login-item-installer").getElementsByClassName("state")[0];
const isPortraitEffectEnabledLabel = document.getElementById("isPortraitEffectEnabled");
const isCenterStageEnabledLabel = document.getElementById("isCenterStageEnabled");
const isStudioLightEnabledLabel = document.getElementById("isStudioLightEnabled");
const isBackgroundReplacementEnabledLabel = document.getElementById("isBackgroundReplacementEnabled");
const reactionEffectGesturesEnabledLabel = document.getElementById("reactionEffectGesturesEnabled");

const eventProxyReceivedEventLabel = document.getElementById("event-proxy-received-event");
const eventProxySendTestEventButton = document.getElementById("event-proxy-send-test-event");

// Interactive UI elements
const detailsList = document.querySelectorAll("details");
const detailsToggleButton = document.getElementById("overview").getElementsByClassName("button")[0];

const cameraCaptureAuthorizationStatusPropertyRawStateLabel = document.getElementById("camera-capture-authorization-status").getElementsByClassName("rawState")[0];
const cameraCaptureAuthorizationStatusPropertyDescriptionLabel = document.getElementById("camera-capture-authorization-status").getElementsByClassName("description")[0];
const cameraCaptureAuthorizationStatusPropertyAdditionalInfoLabel = document.getElementById("camera-capture-authorization-status").getElementsByClassName("additionalInfo")[0];
const cameraCaptureAuthorizationStatusPropertyButton = document.getElementById("camera-capture-authorization-status").getElementsByClassName("button")[0];

const microphoneCaptureAuthorizationStatusPropertyRawStateLabel = document.getElementById("microphone-capture-authorization-status").getElementsByClassName("rawState")[0];
const microphoneCaptureAuthorizationStatusPropertyDescriptionLabel = document.getElementById("microphone-capture-authorization-status").getElementsByClassName("description")[0];
const microphoneCaptureAuthorizationStatusPropertyAdditionalInfoLabel = document.getElementById("microphone-capture-authorization-status").getElementsByClassName("additionalInfo")[0];
const microphoneCaptureAuthorizationStatusPropertyButton = document.getElementById("microphone-capture-authorization-status").getElementsByClassName("button")[0];

const virtualCameraStatePropertyRawStateLabel = document.getElementById("virtual-camera-state-property").getElementsByClassName("rawState")[0];
const virtualCameraStatePropertyDescriptionLabel = document.getElementById("virtual-camera-state-property").getElementsByClassName("description")[0];
const virtualCameraStatePropertyAdditionalInfoLabel = document.getElementById("virtual-camera-state-property").getElementsByClassName("additionalInfo")[0];
const virtualCameraStatePropertyButton = document.getElementById("virtual-camera-state-property").getElementsByClassName("button")[0];

const virtualCameraClientsPropertyLabel = document.getElementById("stream-clients-list").getElementsByClassName("state")[0];
const virtualCameraClientsPropertyButton = document.getElementById("stream-clients-list").getElementsByClassName("button")[0];

const mainAppWindowIsFloatingPropertyLabel = document.getElementById("window-management-is-floating").getElementsByClassName("state")[0];
const mainAppWindowIsFloatingButton = document.getElementById("toggle-floating-style");
const mainAppWindowIsHiddenPropertyLabel = document.getElementById("window-management-is-hidden").getElementsByClassName("state")[0];
const mainAppWindowIsHiddenButton = document.getElementById("toggle-isHidden");
const mainAppWindowResizeTo1Button = document.getElementById("resize-to-1");
const mainAppWindowResizeTo2Button = document.getElementById("resize-to-2");

const hardwareInfoCpuArchPropertyLabel = document.getElementById("hardware-info").getElementsByClassName("cpuArch")[0];
const hardwareInfoCpuCoresPropertyLabel = document.getElementById("hardware-info").getElementsByClassName("cpuCores")[0];
const hardwareInfoGpuNamePropertyLabel = document.getElementById("hardware-info").getElementsByClassName("gpuName")[0];
const hardwareInfoMemoryPropertyLabel = document.getElementById("hardware-info").getElementsByClassName("memory")[0];
const hardwareInfoModelPropertyLabel = document.getElementById("hardware-info").getElementsByClassName("model")[0];
const hardwareInfoOsPropertyLabel = document.getElementById("hardware-info").getElementsByClassName("os")[0];
const hardwareInfoOsVersionPropertyLabel = document.getElementById("hardware-info").getElementsByClassName("osVersion")[0];

const apiVersionMajorLabels = document.getElementsByClassName("api-version-major");
const apiVersionMinorLabels = document.getElementsByClassName("api-version-minor");
const apiVersionPatchLabels = document.getElementsByClassName("api-version-patch");

const toolboxButton = document.getElementById("titlebar-toolbox-button").getElementsByClassName("button")[0];
const toolboxButtonIsEnabledPropertyLabel = document.getElementById("titlebar-toolbox-button").getElementsByClassName("isEnabled")[0];
const toolboxButtonInfoPropertyLabel = document.getElementById("titlebar-toolbox-button").getElementsByClassName("info")[0];
const toolboxButtonTooltipPropertyLabel = document.getElementById("titlebar-toolbox-button").getElementsByClassName("tooltip")[0];

const powerMonitorSection = document.getElementById("power-monitor-section");

const loginItemInstallerSection = document.getElementById("login-item-installer-section");
const loginItemInstallerButton = document.getElementById("login-item-installer").getElementsByClassName("button")[0];

const systemVideoEffectsMonitorButton = document.getElementById("system-video-effects-monitor").getElementsByClassName("button")[0];

// Variable state
let clickCounter = 0;
let toolboxButtonClickCounter = 0;

if (typeof gHybrid == "undefined") {
    defineGHybrid()
}

init()

function init() {
    updateApiVersionInfoLabels();
    updateHardwareInfoLabels();
    updateCameraCaptureAuthorization(gHybrid.capabilities.camera.authorization);
    updateMicrophoneCaptureAuthorization(gHybrid.capabilities.microphone.authorization);
    updateVirtualCameraInstallation(gHybrid.virtualCamera.state);
    updateVirtualCameraClients(gHybrid.virtualCamera.clients);
    updateToolboxButton();
    registerOnChangeCallbacks();
    registerOnClickHandlers();
    
    updateCameraCaptureAuthorizationStatusPropertyLabels();
    updateMicrophoneCaptureAuthorizationStatusPropertyLabels();
    updateVirtualCameraStatePropertyLabels();
    updateVirtualCameraClientsPropertyLabel();
    
    updateMainAppWindowIsFloating();
    updateMainAppWindowIsHidden();

    updatePowerState(gHybrid.powerMonitor.powerState);
    updatePowerMethod(gHybrid.powerMonitor.powerMethod);
    updateLockState(gHybrid.powerMonitor.lockState);

    updateLoginItemInstaller(gHybrid.loginItemInstaller.status)
    updateSystemVideoEffectsMonitor(gHybrid.systemVideoEffectsMonitor.status);
    LoginItemInstallerSectionVisibility(!isWindows());
}

function registerOnChangeCallbacks() {
    gHybrid.capabilities.camera.setAuthorizationChangeCallback(updateCameraCaptureAuthorization);
    gHybrid.capabilities.microphone.setAuthorizationChangeCallback(updateMicrophoneCaptureAuthorization);
    gHybrid.virtualCamera.setStateChangeCallback(updateVirtualCameraInstallation);
    gHybrid.virtualCamera.setClientsChangeCallback(updateVirtualCameraClients);
    gHybrid.setTitlebarButtonClickedCallback(flashTitlebarButtonState);
    gHybrid.windows.mainAppWindow.setIsHiddenChangedCallback(updateMainAppWindowIsHidden);
    gHybrid.setTitlebarToolboxButtonClickedCallback(flashToolbarButtonState);
    gHybrid.setTitlebarModeSelectionChangedCallback(updateTitlebarMode);
    gHybrid.setPowerStateChangedCallback(updatePowerState);
    gHybrid.setPowerMethodChangedCallback(updatePowerMethod);
    gHybrid.setLockStateChangedCallback(updateLockState);
    gHybrid.loginItemInstaller.setStatusChangedCallback(updateLoginItemInstaller);
    gHybrid.systemVideoEffectsMonitor.setStatusChangedCallback(updateSystemVideoEffectsMonitor);
    gHybrid.eventProxy.setEventEmitterCallback(handleEventFromNative);
}

function registerOnClickHandlers() {
    detailsToggleButton.addEventListener('click', toggleDetails);
    
    installButton.addEventListener('click', gHybrid.virtualCamera.install);
    authorizeButton.addEventListener('click', gHybrid.virtualCamera.authorize);
    uninstallButton.addEventListener('click', gHybrid.virtualCamera.uninstall);
    relaunchButton.addEventListener('click', gHybrid.requestRelaunch);
    rebootButton.addEventListener('click', gHybrid.requestReboot);
    captureAuthorizeButton("authorize-camera").addEventListener('click', gHybrid.capabilities.camera.authorize);
    captureAuthorizeButton("authorize-microphone").addEventListener('click', gHybrid.capabilities.microphone.authorize);
    
    cameraCaptureAuthorizationStatusPropertyButton.addEventListener('click', updateCameraCaptureAuthorizationStatusPropertyLabels);
    microphoneCaptureAuthorizationStatusPropertyButton.addEventListener('click', updateMicrophoneCaptureAuthorizationStatusPropertyLabels);
    virtualCameraStatePropertyButton.addEventListener('click', updateVirtualCameraStatePropertyLabels);
    virtualCameraClientsPropertyButton.addEventListener('click', updateVirtualCameraClientsPropertyLabel);
    
    toolboxButton.addEventListener('click', toggleToolboxButtonConfiguration);
    virtualCameraSupportViewDidAppearButton.addEventListener('click', gHybrid.onAfterVirtualCameraSupportViewOpened);
    virtualCameraSupportViewWillDisappearButton.addEventListener('click', gHybrid.onBeforeVirtualCameraSupportViewCloses);
    
    mainAppWindowIsFloatingButton.addEventListener('click', toggleMainAppWindowIsFloating);
    mainAppWindowIsHiddenButton.addEventListener('click', toggleMainAppWindowIsHidden);
    mainAppWindowResizeTo1Button.addEventListener('click', resizeMainAppWindowTo1);
    mainAppWindowResizeTo2Button.addEventListener('click', resizeMainAppWindowTo2);

    loginItemInstallerButton.addEventListener('click', toggleLoginItemInstallation);

    systemVideoEffectsMonitorButton.addEventListener('click', gHybrid.systemVideoEffectsMonitor.showSystemUI);
    eventProxySendTestEventButton.addEventListener('click', sendTestEventToNative);
}

function updateApiVersionInfoLabels() {
    for (let label of apiVersionMajorLabels) {
        label.textContent = gHybrid.apiVersion.major;
    }
    for (let label of apiVersionMinorLabels) {
        label.textContent = gHybrid.apiVersion.minor;
    }
    for (let label of apiVersionPatchLabels) {
        label.textContent = gHybrid.apiVersion.patch;
    }
}

function updateHardwareInfoLabels() {
    hardwareInfoCpuArchPropertyLabel.textContent = gHybrid.capabilities.hardwareInfo.cpuArch;
    hardwareInfoCpuCoresPropertyLabel.textContent = gHybrid.capabilities.hardwareInfo.cpuCores;
    hardwareInfoGpuNamePropertyLabel.textContent = gHybrid.capabilities.hardwareInfo.gpuName;
    hardwareInfoMemoryPropertyLabel.textContent = gHybrid.capabilities.hardwareInfo.memory;
    hardwareInfoModelPropertyLabel.textContent = gHybrid.capabilities.hardwareInfo.model;
    hardwareInfoOsPropertyLabel.textContent = gHybrid.capabilities.hardwareInfo.os;
    hardwareInfoOsVersionPropertyLabel.textContent = gHybrid.capabilities.hardwareInfo.osVersion;
}

function captureAuthorizeButton(id) {
    return document.getElementById(id).getElementsByClassName("button")[0];
}

function updateCameraCaptureAuthorization(state) {
    updateCaptureAuthorization("authorize-camera", state);
}

function updateMicrophoneCaptureAuthorization(state) {
    updateCaptureAuthorization("authorize-microphone", state);
}

function updateCaptureAuthorization(id, state) {
    let stateDescription = state.description
    let virtualCameraStateLabel = document.getElementById(id).getElementsByClassName("state")[0];
    virtualCameraStateLabel.textContent = stateDescription;
    captureAuthorizeButton(id).disabled = stateDescription == "authorized";
}

function updateVirtualCameraInstallation(state) {
    let stateDescription = state.description
    virtualCameraStateLabel.textContent = stateDescription;
    installButton.style.display = (stateDescription == "notInstalled") || (stateDescription == "needsUpdate") || (stateDescription == "uninstalling") || (stateDescription == "error") ? "inline" : "none";
    authorizeButton.style.display = stateDescription == "awaitingUserApproval" ? "inline" : "none";
    uninstallButton.style.display = (stateDescription == "installed") || (stateDescription == "needsUpdate") || (stateDescription == "installing") || (stateDescription == "error") ? "inline" : "none";
    relaunchButton.style.display = stateDescription == "needsRelaunch" ? "inline" : "none";
    rebootButton.style.display = stateDescription == "needsReboot" ? "inline" : "none";
}

function updateVirtualCameraClients(clients) {
    if (clients && clients.length) {
        clientsLabel.textContent = clients.length == 0 ? "none" : clients;
    } else {
        clientsLabel.textContent = "none"
    }
}

function flashTitlebarButtonState() {
    clickCounter++;
    titlebarButtonLabel.textContent = clickCounter;
}

function flashToolbarButtonState() {
    toolboxButtonClickCounter++;
    toolboxButtonLabel.textContent = toolboxButtonClickCounter;
}

function updateTitlebarMode(mode) {
    titlebarModeLabel.textContent = mode
}

function updatePowerMethod(method) {
    console.log("Power Method changed to " + method);
    powerMethodLabel.textContent = method;
}

function updatePowerState(state) {
    console.log("Power State changed to " + state);
    powerStateLabel.textContent = state;
}

function updateLockState(lockState) {
    console.log("Lock State changed to " + lockState);
    powerLockStateLabel.textContent = lockState;
}

function updateLoginItemInstaller(status) {
    loginItemInstallerLabel.textContent = status;
    if (status == "notInstalled") {
        loginItemInstallerButton.textContent = "Install"
        loginItemInstallerButton.disabled = false
    } else if (status == "enabled") {
        loginItemInstallerButton.textContent = "Uninstall"
        loginItemInstallerButton.disabled = false
    } else {
        loginItemInstallerButton.disabled = true
    }
}

function updateSystemVideoEffectsMonitor(status) {
    isPortraitEffectEnabledLabel.textContent = status.isPortraitEffectEnabled ? "true" : "false";
    isCenterStageEnabledLabel.textContent = status.isCenterStageEnabled ? "true" : "false";
    isStudioLightEnabledLabel.textContent = status.isStudioLightEnabled ? "true" : "false";
    isBackgroundReplacementEnabledLabel.textContent = status.isBackgroundReplacementEnabled ? "true" : "false";
    reactionEffectGesturesEnabledLabel.textContent = status.reactionEffectGesturesEnabled ? "true" : "false";
}

function updateToolboxButton() {
    toolboxButton.textContent = gHybrid.titlebar.toolboxButton.isEnabled ? "Disable toolbox button" : "Enable toolbox button"
    toolboxButtonIsEnabledPropertyLabel.textContent = gHybrid.titlebar.toolboxButton.isEnabled
    toolboxButtonInfoPropertyLabel.textContent = gHybrid.titlebar.toolboxButton.info
    toolboxButtonTooltipPropertyLabel.textContent = gHybrid.titlebar.toolboxButton.tooltip
}

function toggleToolboxButtonConfiguration() {
    gHybrid.titlebar.toolboxButton.isEnabled = !gHybrid.titlebar.toolboxButton.isEnabled
    if (gHybrid.titlebar.toolboxButton.isEnabled) {
        gHybrid.titlebar.toolboxButton.info = ""
        gHybrid.titlebar.toolboxButton.tooltip = ""
    } else {
        gHybrid.titlebar.toolboxButton.info = "REC"
        gHybrid.titlebar.toolboxButton.tooltip = "Busy with something..."
    }

    updateToolboxButton()
}

function updateCameraCaptureAuthorizationStatusPropertyLabels() {
    cameraCaptureAuthorizationStatusPropertyRawStateLabel.textContent = gHybrid.capabilities.camera.authorization.rawState;
    cameraCaptureAuthorizationStatusPropertyDescriptionLabel.textContent = gHybrid.capabilities.camera.authorization.description;
    cameraCaptureAuthorizationStatusPropertyAdditionalInfoLabel.textContent = gHybrid.capabilities.camera.authorization.additionalInfo;
}

function updateMicrophoneCaptureAuthorizationStatusPropertyLabels() {
    microphoneCaptureAuthorizationStatusPropertyRawStateLabel.textContent = gHybrid.capabilities.microphone.authorization.rawState;
    microphoneCaptureAuthorizationStatusPropertyDescriptionLabel.textContent = gHybrid.capabilities.microphone.authorization.description;
    microphoneCaptureAuthorizationStatusPropertyAdditionalInfoLabel.textContent = gHybrid.capabilities.microphone.authorization.additionalInfo;
}

function updateVirtualCameraStatePropertyLabels() {
    virtualCameraStatePropertyRawStateLabel.textContent = gHybrid.virtualCamera.state.rawState;
    virtualCameraStatePropertyDescriptionLabel.textContent = gHybrid.virtualCamera.state.description;
    virtualCameraStatePropertyAdditionalInfoLabel.textContent = gHybrid.virtualCamera.state.additionalInfo;
}

function updateVirtualCameraClientsPropertyLabel() {
    let clients = gHybrid.virtualCamera.clients.length == 0 ? "none" : gHybrid.virtualCamera.clients;
    virtualCameraClientsPropertyLabel.textContent = clients;
}

function toggleMainAppWindowIsFloating() {
    gHybrid.windows.mainAppWindow.isFloating = !gHybrid.windows.mainAppWindow.isFloating;
    updateMainAppWindowIsFloating();
}

function updateMainAppWindowIsFloating() {
    mainAppWindowIsFloatingPropertyLabel.textContent = gHybrid.windows.mainAppWindow.isFloating ? "true" : "false";
}

function toggleMainAppWindowIsHidden() {
    gHybrid.windows.mainAppWindow.isHidden = !gHybrid.windows.mainAppWindow.isHidden;
    updateMainAppWindowIsHidden(gHybrid.windows.mainAppWindow.isHidden)
}

function updateMainAppWindowIsHidden(isHidden) {
    mainAppWindowIsHiddenPropertyLabel.textContent = isHidden ? "true" : "false";
}

function resizeMainAppWindowTo1() {
    gHybrid.windows.mainAppWindow.resizeTo(800, 800);
}

function resizeMainAppWindowTo2() {
    gHybrid.windows.mainAppWindow.resizeTo(1800, 1000);
}

function toggleLoginItemInstallation() {
    if (gHybrid.loginItemInstaller.status == "notInstalled") {
        gHybrid.loginItemInstaller.install()
    } else if (gHybrid.loginItemInstaller.status == "enabled" || gHybrid.loginItemInstaller.status == "disabled") {
        gHybrid.loginItemInstaller.uninstall()
    }
}

function toggleDetails() {
    for (let details of detailsList) {
        details.open = !details.open
    }
    
    detailsToggleButton.textContent = detailsList[0].open ? "Hide all" : "Show all"
}

function handleEventFromNative(event) {
    console.log('Received event from native:', event);
    const displayText = JSON.stringify(event, null, 2);
    eventProxyReceivedEventLabel.textContent = displayText;
}

function sendTestEventToNative() {
    const testEvent = {
        name: 'test',
        payload: {
            foo: "bar",
            number: 42
        }
    };
    gHybrid.eventProxy.handleEvent(testEvent);
    console.log('Sent test event to native:', testEvent);
}

function defineGHybrid() {
    // This definition is not representative of the object exposed as `gHybrid` in the Airtime browser.
    gHybrid = {
        apiVersion: {
            major: 1,
            minor: 2,
            patch: 3,
        },
        capabilities: {
            camera: {
                authorization: {},
                setAuthorizationChangeCallback: (callback) => {},
            },
            microphone: {
                authorization: {},
                setAuthorizationChangeCallback: (callback) => {},
            },
            hardwareInfo: {
                cpuArch: "foo",
                cpuCores: "foo",
                gpuName: "foo",
                memory: "foo",
                model: "foo",
                os: "foo",
                osVersion: "foo",
            }
        },
        titlebar: {
            toolboxButton: {
                isEnabled: true,
                info: "foo",
                tooltip: "bar",
            }
        },
        virtualCamera: {
            state: {},
            clients: [],
            setStateChangeCallback: (callback) => {},
            setClientsChangeCallback: (callback) => {},
        },
        windows: {
            mainAppWindow: {
                isFloating: false,
                isHidden: false,
                setIsHiddenChangedCallback: (callback) => {},
            }
        },
        powerMonitor: {
            powerState: "Unknown",
            powerMethod: "Unknown",
            lockState: "Unknown"
        },
        loginItemInstaller: {
            status: "Unavailable",
            setStatusChangedCallback: (callback) => {},
        },
        windowOverlay: {
        },
        systemVideoEffectsMonitor: {
            status: {
                isPortraitEffectEnabled: false,
                isCenterStageEnabled: false,
                isStudioLightEnabled: false,
                isBackgroundReplacementEnabled: false,
                reactionEffectGesturesEnabled: false,
            },
            setStatusChangedCallback: (callback) => {},
        },
        eventProxy: {
            handleEvent: (event) => {},
            setEventEmitterCallback: (callback) => {},
        },
        setTitlebarButtonClickedCallback: (callback) => {},
        setTitlebarToolboxButtonClickedCallback: (callback) => {},
        setTitlebarModeSelectionChangedCallback: (callback) => {},
    }
}

function isWindows() {
    return window.navigator.userAgent.indexOf('Win') > -1
}

function togglePowerMonitorSectionVisibility(show) {
    if (show) {
        powerMonitorSection.style.display = "block";
    } else {
        powerMonitorSection.style.display = "none";
    }
}

function LoginItemInstallerSectionVisibility(show) {
    if (show) {
        loginItemInstallerSection.style.display = "block";
    } else {
        loginItemInstallerSection.style.display = "none";
    }
}
