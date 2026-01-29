//
//  CxxBridge.cpp
//  mmhmm
//
//  Created by Beni Federer on 09.07.24.
//

#include "CxxBridge.h"

#include "browser/main_context_impl.h"
#include "browser/root_window.h"
#include "browser/client_app_browser.h"
#include "browser/main_message_loop_external_pump.h"
#include "browser/main_message_loop_std.h"
#include "browser/web_app_browser.h"
#include "common/client_switches.h"
#include "common/event_proxy_browser.h"
#include "common/dictionary_utils.h"
#include "Airtime-Swift-Wrapper.h"

#include <vector>
#include <dispatch/dispatch.h>

namespace CxxBridge {
	struct CEFLifetimeContextImpl {
		std::unique_ptr<client::MainMessageLoop> messageLoop;
		std::unique_ptr<client::MainContextImpl> context;
	};

	CEFLifetimeContext::CEFLifetimeContext(CEFLaunchParameters parameters) {
		CefMainArgs main_args(parameters.argc, parameters.argv);

		// Parse command-line arguments.
		CefRefPtr<CefCommandLine> command_line =
		CefCommandLine::CreateCommandLine();
		command_line->InitFromArgv(parameters.argc, parameters.argv);

		// Create a ClientApp of the correct type.
		CefRefPtr<CefApp> app;

		using namespace client;
		ClientApp::ProcessType process_type = ClientApp::GetProcessType(command_line);
		if (process_type == ClientApp::BrowserProcess) {
			app = new ClientAppBrowser();
		}

		// Create the main context object.
		std::unique_ptr<MainContextImpl> context(new MainContextImpl(command_line, true, parameters.shortVersionNumberString));

		CefSettings settings;

		// When generating projects with CMake the CEF_USE_SANDBOX value will be defined
		// automatically. Pass -DUSE_SANDBOX=OFF to the CMake command-line to disable
		// use of the sandbox.
#if !defined(CEF_USE_SANDBOX)
		settings.no_sandbox = true;
#endif

		// Populate the settings based on command line arguments.
		context->PopulateSettings(&settings);

		// Add the cache folder to the settings
		CefString(&settings.cache_path).FromString(parameters.cachePath);

		// Configure log file
		CefString(&settings.log_file).FromString(parameters.logFilePath);
		// Requires info level severity for console logs
		settings.log_severity = LOGSEVERITY_INFO;

		// Create the main message loop object.
		std::unique_ptr<MainMessageLoop> message_loop;
		if (settings.external_message_pump) {
			message_loop = MainMessageLoopExternalPump::Create();
		} else {
			message_loop.reset(new MainMessageLoopStd);
		}

		// Initialize CEF.
		if (context->Initialize(main_args, settings, app, nullptr)) {
			pimpl_ = std::make_shared<CEFLifetimeContextImpl>( CEFLifetimeContextImpl{ std::move(message_loop), std::move(context) } );
		}
	}

	int CEFLifetimeContext::runMessageLoop() const {
		int result = -1;

		if (!pimpl_) {
			return result;
		}

		// Run the message loop. This will block until Quit() is called.
		result = pimpl_->messageLoop->Run();

		// Shut down CEF.
		pimpl_->context->Shutdown();

		// Release objects in reverse order of creation.
		pimpl_->messageLoop.reset();
		pimpl_->context.reset();

		return result;
	}

	int CEFLifetimeContext::quit() const {
		if (!pimpl_) { return -1; }
		pimpl_->messageLoop->Quit();
		return 0;
	}

	bool CEFState::getSupportsRemoteControl() {
		auto context = client::MainContext::Get();
		if (!context) { return false; }

		return context->GetFeatures().IsFeatureSupported(mmhmm::feature::WebMiniRemote);
	}

	std::string CEFState::getDefaultMainAppURL() {
		auto context = client::MainContext::Get();
		if (!context) { return {}; }

		return context->GetDefaultURL();
	}

	client::RootWindowManager* getRootWindowManager() {
		auto context = client::MainContext::Get();
		if (!context) { return nullptr; }

		return context->GetRootWindowManager();
	}

	scoped_refptr<client::RootWindow> getWindowForBrowser(int browserID) {
		auto rootWindowManager = getRootWindowManager();
		if (!rootWindowManager) { return nullptr; }

		return rootWindowManager->GetWindowForBrowser(browserID);
	}

	CefRefPtr<CefBrowser> getBrowser(int browserID) {
		auto window = getWindowForBrowser(browserID);
		if (!window) { return nullptr; }

		return window->GetBrowser();
	}

	void updateAppCapabilities(mmhmm::AppCapabilities appCapabilities) {
		client::MainContext::Get()->SetAppCapabilities(appCapabilities);
	}

	void updateAppWindows(mmhmm::AppWindows appWindows) {
		client::MainContext::Get()->SetAppWindows(appWindows);
	}

	void updateVirtualCamera(mmhmm::VirtualCamera virtualCamera) {
		client::MainContext::Get()->SetVirtualCamera(virtualCamera);
	}

	void notifyHybridOfTitlebarButtonClicked() {
		client::MainContext::Get()->NotifyHybridOfTitlebarButtonClicked();
	}

	void notifyHybridOfTitlebarToolboxButtonClicked() {
		client::MainContext::Get()->NotifyHybridOfTitlebarToolboxButtonClicked();
	}

	void notifyHybridOfLoginItemStatusChange() {
		client::MainContext::Get()->NotifyHybridOfLoginItemStatusChange();
	}

	void notifyHybridOfPowerMonitorChange(mmhmm::PowerMonitor powerMonitor) {
		auto context = client::MainContext::Get();
		if (!context) { return; }

		context->SetPowerMonitor(powerMonitor);
	}

	void notifyHybridOfWebAppCallbackData(WebAppType webAppType, std::string dataString, std::string fragmentString) {
		auto context = client::MainContext::Get();
		if (!context) { return; }

		context->NotifyHybridOfWebAppCallbackData(webAppType, dataString, fragmentString);
	}

	void notifyHybridOfSystemVideoEffectsStatusChange(mmhmm::SystemVideoEffectsStatus status) {
		auto context = client::MainContext::Get();
		if (!context) { return; }

		context->SetSystemVideoEffectsStatus(status);
	}

	std::optional<WebAppType> getStartupRequestWebApp() {
		auto context = client::MainContext::Get();
		if (!context) { return std::nullopt; }
		return context->GetStartupRequestWebApp();
	}

	bool createRootWindow(CEFRootWindowConfig windowConfig) {
		auto rootWindowManager = getRootWindowManager();
		if (!rootWindowManager) { return false; }

		auto context = client::MainContext::Get();
		if (!context) { return false; }

		CefRefPtr<CefDictionaryValue> extra_info = context->GetGHybridDictionaryRepresentation();
		if (!extra_info) { return false; }

		auto config = client::RootWindowConfig();
		config.initially_hidden = windowConfig.initiallyHidden;
		config.with_controls = windowConfig.withControls;
		config.url = windowConfig.url;
		config.close_callback = base::BindOnce(&Airtime::SwiftBridge::onWebAppWindowClosed, windowConfig.webAppType);

		if (CGRectEqualToRect(windowConfig.bounds, CGRectNull) == false) {
			config.bounds = CefRect(windowConfig.bounds.origin.x,
									windowConfig.bounds.origin.y,
									windowConfig.bounds.size.width,
									windowConfig.bounds.size.height);
		}

		auto configPointer = std::make_unique<client::RootWindowConfig>(std::move(config));
		auto rootWindow = rootWindowManager->CreateRootWindow(std::move(configPointer), extra_info);

		return rootWindow != nullptr;
	}

	void closeAllWindows(bool force) {
		auto rootWindowManager = getRootWindowManager();
		if (!rootWindowManager) { return; }

		rootWindowManager->CloseAllWindows(force);
	}

	bool reloadBrowser(int browserID, ReloadStrategy strategy) {
		auto browser = getBrowser(browserID);
		if (!browser) { return false; }

		switch (strategy) {
			case ReloadStrategy::Soft:
				browser->Reload();
				return true;

			case ReloadStrategy::HardIgnoringCache:
				browser->ReloadIgnoreCache();
				return true;

			default:
				return false;
		}
	}

	bool setAccessibilityState(int browserID, bool enable) {
		auto browser = getBrowser(browserID);
		if (!browser || !browser.get()) { return false; }

		auto host = browser->GetHost();
		if (!host || !host.get()) { return false; }

		host->SetAccessibilityState(enable ? STATE_ENABLED : STATE_DISABLED);

		return true;
	}

	bool undoInBrowser(int browserID) {
		auto rootWindow = getWindowForBrowser(browserID);
		if (!rootWindow) { return false; }

		rootWindow->Undo();
		return true;
	}

	bool redoInBrowser(int browserID) {
		auto rootWindow = getWindowForBrowser(browserID);
		if (!rootWindow) { return false; }

		rootWindow->Redo();
		return true;
	}

	bool setBalancedMode(int browserID, bool isEnabled) {
		CefRefPtr<CefBrowser> browser = getBrowser(browserID);
		if (!browser || !browser.get()) { return false; }

		CefRefPtr<CefFrame> mainFrame = browser->GetMainFrame();
		if (!mainFrame || !mainFrame.get()) { return false; }

		CefString cefUrl = mainFrame->GetURL();

		std::string stdUrl = cefUrl.ToString();
		std::string toRemove = "&fps=";
		size_t pos = stdUrl.find(toRemove);
		if (pos != std::string::npos) {
			stdUrl.erase(pos, toRemove.length() + 2);
		}

		toRemove = "?fps=";
		pos = stdUrl.find(toRemove);
		if (pos != std::string::npos) {
			stdUrl.erase(pos, toRemove.length() + 2);
		}

		pos = stdUrl.find('?');
		if (pos != std::string::npos) {
			stdUrl = stdUrl.substr(0, pos);
		}

		if (isEnabled) {
			stdUrl += "?fps=24";
		} else {
			stdUrl += "?fps=30";
		}

		cefUrl = stdUrl;
		mainFrame->LoadURL(cefUrl);

		return true;
	}

	bool executeJavaScript(int browserID, std::string javaScript) {
		CefString script = CefString(javaScript);

		auto browser = getBrowser(browserID);
		if (!browser) { return false; }

		auto mainFrame = browser->GetMainFrame();
		if (!mainFrame) { return false; }

		mainFrame->ExecuteJavaScript(script, mainFrame->GetURL(), 0);

		return true;
	}

	void emitEvent(int browserID, std::string eventName, std::string jsonPayload) {
		auto browser = getBrowser(browserID);
		if (!browser) { return; }

		auto context = client::MainContext::Get();
		if (!context) { return; }

		auto eventProxy = context->GetEventProxy();
		if (!eventProxy) { return; }

		auto payload = mmhmm::ToCefDictionaryValue(jsonPayload);
		eventProxy->EmitEventInBrowser(eventName, payload, browserID);
	}

	void openHybridAPITester(int browserID) {
		auto context = client::MainContext::Get();
		if (!context) { return; }

		auto browser = getBrowser(browserID);
		if (!browser) { return; }

		context->OpenHybridApiTester(browser);
	}

	void openSegmentationPanel(int browserID) {
		auto context = client::MainContext::Get();
		if (!context) { return; }

		auto browser = getBrowser(browserID);
		if (!browser) { return; }

		context->OpenSegmentationPanel(browser);
	}

	void openToolbox(int browserID) {
		auto context = client::MainContext::Get();
		if (!context) { return; }

		auto browser = getBrowser(browserID);
		if (!browser) { return; }

		context->OpenToolbox(browser);
	}

	void showDevTools(int browserID) {
		auto window = getWindowForBrowser(browserID);
		if (!window) { return; }

		window->ShowDevTools();
	}
}
