// Copyright (c) 2013 The Chromium Embedded Framework Authors.
// Portions copyright (c) 2010 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#import <Cocoa/Cocoa.h>
#import <ScreenCaptureKit/ScreenCaptureKit.h>

#include "mac/configuration/Configuration.h"
#include "mac/logging/Logger.h"

#import "include/wrapper/cef_library_loader.h"
#include "browser/main_context_impl.h"
#include "browser/root_window.h"
#include "browser/test_runner.h"
#include "browser/client_app_browser.h"
#include "browser/main_message_loop_external_pump.h"
#include "browser/main_message_loop_std.h"
#include "common/client_switches.h"

#import "ClientApplication.h"
#import "ClientAppDelegate.h"

namespace client {
namespace {

int RunMain(int argc, char* argv[]) {
  // Load the CEF framework library at runtime instead of linking directly
  // as required by the macOS sandbox implementation.
  CefScopedLibraryLoader library_loader;
  if (!library_loader.LoadInMain())
    return 1;

  int result = -1;

  // #949: The --use-default-popup flag avoids crashing on app termination after a popup browser window
  // like the broadcast window was presented. Using the flag is a workaround that is being mentioned in
  // the respective CEF ticket https://github.com/chromiumembedded/cef/issues/3602
  // Note that adding the flag via `command_line->AppendArgument(...)` is too late.

  std::vector<char*> argv_extended { argv, argv + argc };
  argv_extended.push_back(const_cast<char*>("--use-default-popup"));
  argc = argv_extended.size();
  argv = argv_extended.data();

  CefMainArgs main_args(argc, argv);

  @autoreleasepool {
    // Initialize the ClientApplication instance.
    [ClientApplication sharedApplication];

    // If there was an invocation to NSApp prior to this method, then the NSApp
    // will not be a ClientApplication, but will instead be an NSApplication.
    // This is undesirable and we must enforce that this doesn't happen.
    CHECK([NSApp isKindOfClass:[ClientApplication class]]);

    // Parse command-line arguments.
    CefRefPtr<CefCommandLine> command_line =
        CefCommandLine::CreateCommandLine();
    command_line->InitFromArgv(argc, argv);

    // Create a ClientApp of the correct type.
    CefRefPtr<CefApp> app;
    ClientApp::ProcessType process_type =
        ClientApp::GetProcessType(command_line);
    if (process_type == ClientApp::BrowserProcess)
      app = new ClientAppBrowser();
    
    NSDictionary<NSString *, id> *infoDictionary = NSBundle.mainBundle.infoDictionary;
    NSString *shortVersionString = [infoDictionary valueForKey:@"CFBundleShortVersionString"];

    // Create the main context object.
    std::unique_ptr<MainContextImpl> context(
        new MainContextImpl(command_line, true, [shortVersionString UTF8String]));

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
    NSString *cachePath = NSURL.cefCacheDirectory.path;
    CefString(&settings.cache_path).FromASCII([cachePath cStringUsingEncoding: NSUTF8StringEncoding]);
    
    // Configure log file
    NSString *logFile = NSURL.webAppLogFilePath.path;
    CefString(&settings.log_file).FromASCII([logFile cStringUsingEncoding: NSUTF8StringEncoding]);
    //Requires info level severity for console logs
    settings.log_severity = LOGSEVERITY_INFO;
    
    // Create the main message loop object.
    std::unique_ptr<MainMessageLoop> message_loop;
    if (settings.external_message_pump)
      message_loop = MainMessageLoopExternalPump::Create();
    else
      message_loop.reset(new MainMessageLoopStd);

    // Initialize CEF.
    context->Initialize(main_args, settings, app, nullptr);

    // Register scheme handlers.
    test_runner::RegisterSchemeHandlers();

    // Create the application delegate and window.
    ClientAppDelegate* delegate = [[ClientAppDelegate alloc] initWithOSR:settings.windowless_rendering_enabled ? true : false];
    [delegate performSelectorOnMainThread:@selector(createApplication:)
                               withObject:nil
                            waitUntilDone:NO];

    // Run the message loop. This will block until Quit() is called.
    result = message_loop->Run();

    // Shut down CEF.
    context->Shutdown();

    // Release objects in reverse order of creation.
#if !__has_feature(objc_arc)
    [delegate release];
#endif  // !__has_feature(objc_arc)
    delegate = nil;
    message_loop.reset();
    context.reset();
  }  // @autoreleasepool

  return result;
}

}  // namespace
}  // namespace client

// Entry point function for the browser process.
int main(int argc, char* argv[]) {
  return client::RunMain(argc, argv);
}
