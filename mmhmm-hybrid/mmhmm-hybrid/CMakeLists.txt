# Copyright (c) 2014 The Chromium Embedded Framework Authors. All rights
# reserved. Use of this source code is governed by a BSD-style license that
# can be found in the LICENSE file.

#
# Source files.
#

# mmhmm-hybrid browser sources.
set(MMHMM_HYBRID_BROWSER_BROWSER_SRCS
  browser/hybrid_bridge_callback_handler.h
  browser/browser_event_handler.h
  browser/browser_window.cc
  browser/browser_window.h
  browser/bytes_write_handler.cc
  browser/bytes_write_handler.h
  browser/client_app_delegates_browser.cc
  browser/client_browser.cc
  browser/client_browser.h
  browser/client_handler.cc
  browser/client_handler.h
  browser/client_handler_std.cc
  browser/client_handler_std.h
  browser/client_prefs.cc
  browser/client_prefs.h
  browser/client_request_handler_factory.cc
  browser/client_request_handler_factory.h
  browser/client_media_request_handler_factory.h
  browser/client_media_request_handler_factory.cc
  browser/client_types.h
  browser/image_cache.cc
  browser/image_cache.h
  browser/main_context.cc
  browser/main_context.h
  browser/main_context_impl.cc
  browser/main_context_impl.h
  browser/resource.h
  browser/root_window.cc
  browser/root_window.h
  browser/root_window_create.cc
  browser/root_window_manager.cc
  browser/root_window_manager.h
  browser/root_window_views.cc
  browser/root_window_views.h
  browser/screen_share_manager.h
  browser/temp_window.h
  browser/views_menu_bar.cc
  browser/views_menu_bar.h
  browser/views_overlay_controls.cc
  browser/views_overlay_controls.h
  browser/views_style.cc
  browser/views_style.h
  browser/views_window.cc
  browser/views_window.h
  browser/web_app_browser.cc
  browser/web_app_browser.h
  common/cef_process_message_handler_browser.cc
  common/login_item_installer_browser.cc
  common/login_item_installer_browser.h
  common/window_overlay_browser.cc
  common/window_overlay_browser.h
  common/system_video_effects_monitor_browser.cc
  common/system_video_effects_monitor_browser.h
  common/event_proxy_browser.cc
  common/event_proxy_browser.h
  common/native_types.cc
  common/native_types.h
  common/std_typedefs.h
  common/dictionary_utils.h
  common/dictionary_utils.cc
  )
source_group(mmhmm-hybrid\\\\browser FILES ${MMHMM_HYBRID_BROWSER_BROWSER_SRCS})

set(MMHMM_HYBRID_BROWSER_SHARED_BROWSER_SRCS
  browser/client_app_browser.cc
  browser/client_app_browser.h
  browser/file_util.cc
  browser/file_util.h
  browser/geometry_util.cc
  browser/geometry_util.h
  browser/main_message_loop.cc
  browser/main_message_loop.h
  browser/main_message_loop_external_pump.cc
  browser/main_message_loop_external_pump.h
  browser/main_message_loop_std.cc
  browser/main_message_loop_std.h
  browser/resource_util.h
  )
source_group(shared\\\\browser FILES ${MMHMM_HYBRID_BROWSER_SHARED_BROWSER_SRCS})

set(MMHMM_HYBRID_BROWSER_SRCS
  ${MMHMM_HYBRID_BROWSER_BROWSER_SRCS}
  ${MMHMM_HYBRID_BROWSER_SHARED_BROWSER_SRCS}
  )

# mmhmm-hybrid common sources.
set(MMHMM_HYBRID_COMMON_COMMON_SRCS
  common/client_app_delegates_common.cc
  )
source_group(mmhmm-hybrid\\\\common FILES ${MMHMM_HYBRID_COMMON_COMMON_SRCS})

set(MMHMM_HYBRID_COMMON_SHARED_COMMON_SRCS
  common/api_version.cc
  common/api_version.h
  common/app_capabilities.cc
  common/app_capabilities.h
  common/app_windows.cc
  common/app_windows.h
  common/async_javascript_processor.cc
  common/async_javascript_processor.h
  common/cef_process_message_handler.h
  common/cef_value_utility.cc
  common/cef_value_utility.h
  common/client_app.cc
  common/client_app.h
  common/client_app_other.cc
  common/client_app_other.h
  common/client_switches.cc
  common/client_switches.h
  common/exceptions.h
  common/hybrid_object.h
  common/login_item_installer.h
  common/login_item_installer.cc
  common/power_monitor.cc
  common/power_monitor.h
  common/string_util.cc
  common/string_util.h
  common/system_video_effects_monitor.cc
  common/system_video_effects_monitor.h
  common/titlebar_button.cc
  common/titlebar_button.h
  common/urls.cc
  common/urls.h
  common/v8_utility.cc
  common/v8_utility.h
  common/virtual_camera.cc
  common/virtual_camera.h
  common/window_overlay.cc
  common/window_overlay.h
  common/event_proxy.cc
  common/event_proxy.h
  )
source_group(shared\\\\common FILES ${MMHMM_HYBRID_COMMON_SHARED_COMMON_SRCS})

set(MMHMM_HYBRID_COMMON_SRCS
  ${MMHMM_HYBRID_COMMON_COMMON_SRCS}
  ${MMHMM_HYBRID_COMMON_SHARED_COMMON_SRCS}
  )

# mmhmm-hybrid renderer sources.
set(MMHMM_HYBRID_RENDERER_RENDERER_SRCS
  renderer/client_app_delegates_renderer.cc
  renderer/client_renderer.cc
  renderer/client_renderer.h
  )
source_group(mmhmm-hybrid\\\\renderer FILES ${MMHMM_HYBRID_RENDERER_RENDERER_SRCS})

set(MMHMM_HYBRID_RENDERER_SHARED_RENDERER_SRCS
  common/cef_process_message_handler_renderer.cc
  common/login_item_installer_renderer.cc
  common/login_item_installer_renderer.h
  common/system_video_effects_monitor_renderer.cc
  common/system_video_effects_monitor_renderer.h
  common/v8_callback_executor.cc
  common/v8_callback_executor.h
  common/window_overlay_renderer.cc
  common/window_overlay_renderer.h
  common/event_proxy_renderer.cc
  common/event_proxy_renderer.h
  renderer/client_app_renderer.cc
  renderer/client_app_renderer.h
  renderer/screen_share_handler.cc
  renderer/screen_share_handler.h
  renderer/stream_deck_handler.cc
  renderer/stream_deck_handler.h
  renderer/mini_remote_handler.cc
  renderer/mini_remote_handler.h
  renderer/segmentation_panel_handler.cc
  renderer/segmentation_panel_handler.h
  renderer/hybrid_capabilities.cc
  renderer/hybrid_capabilities.h
  renderer/js_callback_handler.cc
  renderer/js_callback_handler.h
  renderer/javascript_callback.cc
  renderer/javascript_callback.h
  renderer/toolbox_handler.cc
  renderer/toolbox_handler.h
  renderer/floating_nav_handler.cc
  renderer/floating_nav_handler.h
  )
source_group(shared\\\\renderer FILES ${MMHMM_HYBRID_RENDERER_SHARED_RENDERER_SRCS})

set(MMHMM_HYBRID_RENDERER_SRCS
  ${MMHMM_HYBRID_RENDERER_RENDERER_SRCS}
  ${MMHMM_HYBRID_RENDERER_SHARED_RENDERER_SRCS}
  )

#mmhmm-hybrid Windows sources
set(MMHMM_HYBRID_WINDOWS_SRCS
  mmhmm-hybrid_win.cc
  features.cc
  features.h
  resource.h
  win/app_manager.cc
  win/app_manager.h
  win/app_updater_service.cc
  win/app_updater_service.h
  win/app_settings_service.cc
  win/app_settings_service.h
  win/app_sizes.h
  win/capture_utils.cc
  win/capture_utils.h
  win/deep_link_info.cc
  win/deep_link_info.h
  win/dwm_thumbnail_capture.cc
  win/dwm_thumbnail_capture.h
  win/hot_key.cc
  win/hot_key.h
  win/hot_key_manager.cc
  win/hot_key_manager.h
  win/json_reader.cc
  win/json_reader.h
  win/file_utils.cc
  win/file_utils.h
  win/file_version.cc
  win/file_version.h
  win/installer_info.h
  win/singleton_win.cc
  win/singleton_win.h
  win/shmem.cc
  win/shmem.h
  win/system_info.cc
  win/system_info.h
  win/system_report.cc
  win/system_report.h
  win/tray_app.cc
  win/tray_app.h
  win/url_constants_win.cc
  win/url_constants_win.h
  win/window_capture_dispatcher.cc
  win/window_capture_dispatcher.h
  win/app_config.h
  win/app_config.h.in
  win/app_track.h
  win/app_track.cc
  win/camera_statistics_client_event.h
  win/utils.cc
  win/utils.h
  win/mixpanel_service.cc
  win/mixpanel_service.h
  application_context.cc
  application_context.h
  win/zipper.cc
  win/zipper.h
  )
source_group(mmhmm-hybrid FILES ${MMHMM_HYBRID_WINDOWS_SRCS})

set(MMHMM_HYBRID_WINDOWS_CONTROLS_SRCS
  win/controls/base_control.h
  win/controls/base_control.cpp
  win/controls/camera_status_control.cc
  win/controls/camera_status_control.h
  win/controls/colors.h
  win/controls/exceptions.h
  win/controls/image_loader.cpp
  win/controls/image_loader.h
  win/controls/layout.h
  win/controls/overlay_manager.cc
  win/controls/overlay_manager.h
  win/controls/overlay_window.cc
  win/controls/overlay_window.h
  win/controls/svg_renderer.cpp
  win/controls/svg_renderer.h
  win/controls/titlebar.cc
  win/controls/titlebar.h
  win/controls/titlebar_button.cc
  win/controls/titlebar_button.h
  )
source_group(mmhmm-hybrid\\\\controls FILES ${MMHMM_HYBRID_WINDOWS_CONTROLS_SRCS})

set(MMHMM_HYBRID_WINDOWS_BROWSER_SRCS
  browser/browser_event_handler_win.cc
  browser/browser_window_std_win.cc
  browser/browser_window_std_win.h
  browser/main_context_impl_win.cc
  browser/resource_util_win_idmap.cc
  browser/root_window_win.cc
  browser/root_window_win.h
  browser/screen_share_manager_win.cc
  browser/screen_share_manager_win.h
  browser/temp_window_win.cc
  browser/temp_window_win.h
  )
source_group(mmhmm-hybrid\\\\browser FILES ${MMHMM_HYBRID_WINDOWS_BROWSER_SRCS})

set(MMHMM_HYBRID_WINDOWS_MESSAGES_SRCS
  messages/Handler.h
  messages/Message.h
)
source_group(mmhmm-hybrid\\\\messages FILES ${MMHMM_HYBRID_WINDOWS_MESSAGES_SRCS})

set(MMHMM_HYBRID_WINDOWS_MESSAGES_TOOLBOX_SRCS
  messages/toolbox/ChangeAppMode.cc
  messages/toolbox/ChangeAppMode.h
)
source_group(mmhmm-hybrid\\\\messages\\\\toolbox FILES ${MMHMM_HYBRID_WINDOWS_MESSAGES_TOOLBOX_SRCS})

set(MMHMM_HYBRID_WINDOWS_MESSAGES_FLOATING_NAV_SRCS
  messages/floating-nav/LaunchFloatingNav.cc
  messages/floating-nav/LaunchFloatingNav.h
)
source_group(mmhmm-hybrid\\\\messages\\\\floating-nav FILES ${MMHMM_HYBRID_WINDOWS_MESSAGES_FLOATING_NAV_SRCS})

set(MMHMM_HYBRID_WINDOWS_STREAMDECK_SRCS
  streamDeck/sdEffectIcons.h
  streamDeck/sdEnums.h
  streamDeck/sdLog.h
  streamDeck/sdManager.h
  streamDeck/sdManager.cpp
  streamDeck/sdMessage.h
  streamDeck/sdMessage.cpp
  streamDeck/sdMessageSink.h
  streamDeck/sdMessageSink.cpp
  streamDeck/sdMessageTranslator.h
  streamDeck/sdWebSocketClient.h
  streamDeck/sdWebSocketClient.cpp
  )
source_group(mmhmm-hybrid\\\\streamDeck FILES ${MMHMM_HYBRID_WINDOWS_STREAMDECK_SRCS})

set(MMHMM_HYBRID_WINDOWS_MINI_REMOTE_SRCS
  mini-remote/shared_mini_remote_manager.h
  mini-remote/shared_mini_remote_manager_impl.cpp
  mini-remote/shared_mini_remote_manager_impl.h
  )
source_group(mmhmm-hybrid\\\\mini-remote FILES ${MMHMM_HYBRID_WINDOWS_MINI_REMOTE_SRCS})

set(MMHMM_HYBRID_POWER_OBSERVER_SRCS
  power-observer/power_observer.h
  power-observer/power_observer_create.cc
  power-observer/power_observer_win.cc
  power-observer/power_observer_win.h
  )
source_group(mmhmm-hybrid\\\\power-observer FILES ${MMHMM_HYBRID_POWER_OBSERVER_SRCS})

set(MMHMM_HYBRID_WINDOWS_SEGMENTATION_PANEL_SRCS
  segmentation-panel/segmentation_panel_manager.cc
  segmentation-panel/segmentation_panel_manager.h
  segmentation-panel/segmentation_panel_manager_win.cc
  )
source_group(mmhmm-hybrid\\\\segmentation-panel FILES ${MMHMM_HYBRID_WINDOWS_SEGMENTATION_PANEL_SRCS})
  
set(MMHMM_HYBRID_WINDOWS_SEGMENTATION_WARMUP_SRCS
  segmentation-warmup/FileUtils.h
  segmentation-warmup/SplashScreen.h
  segmentation-warmup/SplashScreen.cpp
  segmentation-warmup/WarmupManager.h
  segmentation-warmup/WarmupManager.cpp
  )
source_group(mmhmm-hybrid\\\\segmentation-warmup FILES ${MMHMM_HYBRID_WINDOWS_SEGMENTATION_WARMUP_SRCS})

set(MMHMM_HYBRID_WINDOWS_RESOURCES_WIN_SRCS
  resources/win/mmhmm-hybrid.rc
  )
source_group(mmhmm-hybrid\\\\resources\\\\win FILES ${MMHMM_HYBRID_WINDOWS_RESOURCES_WIN_SRCS})

set(MMHMM_HYBRID_WINDOWS_SHARED_BROWSER_SRCS
  browser/main_message_loop_external_pump_win.cc
  browser/resource_util_win.cc
  browser/util_win.cc
  browser/util_win.h
  )
source_group(shared\\\\browser FILES ${MMHMM_HYBRID_WINDOWS_SHARED_BROWSER_SRCS})

set(MMHMM_HYBRID_WINDOWS_SRCS
  ${MMHMM_HYBRID_WINDOWS_SRCS}
  ${MMHMM_HYBRID_WINDOWS_BROWSER_SRCS}
  ${MMHMM_HYBRID_WINDOWS_MESSAGES_SRCS}
  ${MMHMM_HYBRID_WINDOWS_MESSAGES_TOOLBOX_SRCS}
  ${MMHMM_HYBRID_WINDOWS_MESSAGES_FLOATING_NAV_SRCS}
  ${MMHMM_HYBRID_WINDOWS_RESOURCES_WIN_SRCS}
  ${MMHMM_HYBRID_WINDOWS_SHARED_BROWSER_SRCS}
  ${MMHMM_HYBRID_WINDOWS_STREAMDECK_SRCS}
  ${MMHMM_HYBRID_WINDOWS_CONTROLS_SRCS}
  ${MMHMM_HYBRID_WINDOWS_MINI_REMOTE_SRCS}
  ${MMHMM_HYBRID_WINDOWS_SEGMENTATION_WARMUP_SRCS}
  ${MMHMM_HYBRID_WINDOWS_SEGMENTATION_PANEL_SRCS}
  ${MMHMM_HYBRID_POWER_OBSERVER_SRCS}
  )

# mmhmm-hybrid resources.
set(MMHMM_HYBRID_RESOURCES_RESOURCES_SRCS
  resources/binding.html
  resources/dialogs.html
  resources/draggable.html
  resources/localstorage.html
  resources/logo.png
  resources/media_router.html
  resources/menu_icon.1x.png
  resources/menu_icon.2x.png
  resources/other_tests.html
  resources/performance.html
  resources/performance2.html
  resources/preferences.html
  resources/response_filter.html
  resources/server.html
  resources/transparency.html
  resources/urlrequest.html
  resources/websocket.html
  resources/window.html
  resources/xmlhttprequest.html
  )
source_group(mmhmm-hybrid\\\\resources FILES ${MMHMM_HYBRID_RESOURCES_RESOURCES_SRCS})

set(MMHMM_HYBRID_RESOURCES_SHARED_RESOURCES_SRCS
  resources/osr_test.html
  resources/pdf.html
  resources/pdf.pdf
  resources/window_icon.1x.png
  resources/window_icon.2x.png
  )
source_group(shared\\\\resources FILES ${MMHMM_HYBRID_RESOURCES_SHARED_RESOURCES_SRCS})

set(MMHMM_HYBRID_RESOURCES_SRCS
  ${MMHMM_HYBRID_RESOURCES_RESOURCES_SRCS}
  ${MMHMM_HYBRID_RESOURCES_SHARED_RESOURCES_SRCS}
  )


#
# Shared configuration.
#

# Target executable names.
set(CEF_TARGET "Airtime")
if(OS_MAC)
  set(CEF_HELPER_TARGET "mmhmm-hybrid_Helper")
  set(CEF_HELPER_OUTPUT_NAME "mmhmm-hybrid Helper")
else()
  # Logical target used to link the libcef library.
  ADD_LOGICAL_TARGET("libcef_lib" "${CEF_LIB_DEBUG}" "${CEF_LIB_RELEASE}")
endif()

# Determine the target output directory.
SET_CEF_TARGET_OUT_DIR()

#
# Windows configuration.
#

if(OS_WINDOWS)

  set(SEGLIB_RELEASE "seglib-vt-bin-amd64-2024-august-01")
  # Enable control flow guard
  message(STATUS "Enabling Control Flow Guard")
  add_compile_options("$<$<CONFIG:RELEASE>:/guard:cf>")
  add_link_options("$<$<CONFIG:RELEASE>:/guard:cf>")

  find_library(SENTRY_LIB_WIN "sentry.lib" PATHS ${CMAKE_CURRENT_SOURCE_DIR}/win/third-party/sentry/lib/)
  set(SENTRY_LIBS ${SENTRY_LIB_WIN})

  set (SENTRY_BIN_DIR_WIN "${CMAKE_CURRENT_SOURCE_DIR}/win/third-party/sentry/bin/")
  set(SENTRY_FILES
      sentry.dll
	  crashpad_handler.exe
  )

  find_library(LIBARCHIVE_LIB_WIN "archive.lib" PATHS ${CMAKE_CURRENT_SOURCE_DIR}/win/third-party/libarchive/lib/)
  set(LIBARCHIVE_LIBS ${LIBARCHIVE_LIB_WIN})

  set (LIBARCHIVE_BIN_DIR_WIN "${CMAKE_CURRENT_SOURCE_DIR}/win/third-party/libarchive/bin/")
  set(LIBARCHIVE_FILES
      archive.dll
  )

  find_library(MMHMM_CAMERA_CLIENT_LIB_WIN "mmhmmCameraClient.lib" PATHS ${CMAKE_CURRENT_SOURCE_DIR}/../win/Camera/Client/)
  set(MMHMM_CAMERA_CLIENT_LIBS ${MMHMM_CAMERA_CLIENT_LIB_WIN})
  
  find_library(MMHMM_SEGMENTATION_LIB_WIN "tpxai_segmentation.lib" PATHS ${CMAKE_CURRENT_SOURCE_DIR}/../third_party/seglib-dev/seglib-0.1.2-Windows-AMD64-shared-Release/lib/)
  set(MMHMM_SEGMENTATION_LIB ${MMHMM_SEGMENTATION_LIB_WIN})

  message("${CMAKE_CURRENT_SOURCE_DIR}/../win/Camera/Client/")

  set (MMHMM_CAMERA_CLIENT_BIN_DIR_WIN "${CMAKE_CURRENT_SOURCE_DIR}/../win/Camera/Client/")
  set(MMHMM_CAMERA_CLIENT_DLL
      mmhmmCameraClient.dll
      mmhmmCameraClient.pdb
  )

  set (ZMQ_DIR_WIN "${CMAKE_CURRENT_SOURCE_DIR}/../win/Camera/0MQShared/")
  set(ZMQ_DLL
      libzmq-v143-mt-4_3_6.dll
  )

  message("${CMAKE_CURRENT_SOURCE_DIR}/win/third-party/sentry/lib/")


  set (CAMERA_DRIVER_FILES_DIR_WIN "${CMAKE_CURRENT_SOURCE_DIR}/../win/Camera/Camera/Driver")
  set(CAMERA_DRIVER_FILES
    mmhmmcameradriver.cat
	mmhmmCameraDriver.dll
	mmhmmCameraDriver.inf
	mmhmmMediaSource.dll
  )

  set (CAMERA_SERVICE_DIR_WIN "${CMAKE_CURRENT_SOURCE_DIR}/../win/Camera/Service/")
  set(CAMERA_SERVICE_FILES
    mmhmmCameraService.exe
  )
  
  set (DRIVER_MANAGER_LIB_DIR_WIN "${CMAKE_CURRENT_SOURCE_DIR}/../win/Camera/DriverManagerLib/")
  set(DRIVER_MANAGER_LIB_FILES
    DriverManagementLib.dll
  )
  
  set (DRIVER_MANAGER_DIR_WIN "${CMAKE_CURRENT_SOURCE_DIR}/../win/Camera/DriverManager/")
  set(DRIVER_MANAGER_FILES
    DriverManager.exe
	CommandLine.dll
	NLog.dll
	DriverManager.exe.config
	nlog.config
  )
  
  set (ASSETS_DIR_WIN "${CMAKE_CURRENT_SOURCE_DIR}/../win/Assets/")
  set(ASSETS_WIN_FILES
    splash.png
    waiting.gif
  )

  # All sources required by the "mmhmm-hybrid" target. Generates an executable that
  # is used for all processes.
  set(MMHMM_HYBRID_SRCS
    ${MMHMM_HYBRID_BROWSER_SRCS}
    ${MMHMM_HYBRID_COMMON_SRCS}
    ${MMHMM_HYBRID_RENDERER_SRCS}
    ${MMHMM_HYBRID_RESOURCES_SRCS}
    ${MMHMM_HYBRID_WINDOWS_SRCS}
	${MMHMM_HYBRID_WINDOWS_STREAMDECK_SRCS}
    ${MMHMM_HYBRID_WINDOWS_CONTROLS_SRCS}
    ${MMHMM_HYBRID_WINDOWS_MINI_REMOTE_SRCS}
    ${MMHMM_HYBRID_WINDOWS_SEGMENTATION_WARMUP_SRCS}
    ${MMHMM_HYBRID_WINDOWS_SEGMENTATION_PANEL_SRCS}
    )


  # set track
  set(MMHMM_WIN_TRACK "qa" CACHE STRING "Build Track")
  message("MMHMM Track: ${MMHMM_WIN_TRACK}")
  configure_file(win/app_config.h.in ${CMAKE_CURRENT_SOURCE_DIR}/win/app_config.h)

  # Additional flags not listed in CEF_DELAYLOAD_FLAGS.
  set(ADDITIONAL_DELAYLOAD_FLAGS
    /DELAYLOAD:glu32.dll
    /DELAYLOAD:oleaut32.dll
    /DELAYLOAD:opengl32.dll
    )

  if(USE_SANDBOX)
    # Shared library (DLL) target.
    list(APPEND CEF_SHARED_LINKER_FLAGS
      ${ADDITIONAL_DELAYLOAD_FLAGS}
    )
    add_library(${CEF_TARGET} SHARED ${MMHMM_HYBRID_SRCS})
    SET_LIBRARY_TARGET_PROPERTIES(${CEF_TARGET})

    # Copy and rename the bootstrap binary.
    COPY_SINGLE_FILE(${CEF_TARGET} ${CEF_BINARY_DIR}/bootstrap.exe ${CEF_TARGET_OUT_DIR}/${CEF_TARGET}.exe)

    if (CMAKE_GENERATOR MATCHES "Visual Studio")
      # Make the bootstrap binary the default command for the Visual Studio debugger.
      set_target_properties(${CEF_TARGET} PROPERTIES
        VS_DEBUGGER_COMMAND "$<TARGET_FILE_DIR:${CEF_TARGET}>/${CEF_TARGET}.exe"
      )
    endif()
  else()
    # Executable target.
    list(APPEND CEF_EXE_LINKER_FLAGS
      ${ADDITIONAL_DELAYLOAD_FLAGS}
    )
    add_executable(${CEF_TARGET} WIN32 ${MMHMM_HYBRID_SRCS})
    SET_EXECUTABLE_TARGET_PROPERTIES(${CEF_TARGET})

    # Add the custom manifest files to the executable.
    ADD_WINDOWS_MANIFEST("${CMAKE_CURRENT_SOURCE_DIR}/win" "${CEF_TARGET}" "exe")
  endif()

  add_dependencies(${CEF_TARGET} libcef_dll_wrapper)
  target_link_libraries(${CEF_TARGET} libcef_lib libcef_dll_wrapper ${SENTRY_LIBS} ${LIBARCHIVE_LIBS} ${MMHMM_CAMERA_CLIENT_LIB_WIN} ${MMHMM_SEGMENTATION_LIB} ${CEF_STANDARD_LIBS} d3d11.lib glu32.lib imm32.lib opengl32.lib user32.lib gdi32.lib uxtheme.lib gdiplus.lib Wtsapi32.lib dcomp.lib d2d1.lib Dwrite.lib wbemuuid.lib dwmapi.lib)
    # Add additional /DELAYLOADs that are missing from CEF_EXE_LINKER_FLAGS.
  set_property(TARGET ${CEF_TARGET} PROPERTY LINK_FLAGS "/DELAYLOAD:glu32.dll /DELAYLOAD:oleaut32.dll /DELAYLOAD:opengl32.dll /DELAYLOAD:libcef.dll")
  target_include_directories(${CEF_TARGET} PRIVATE "../win/Camera/Include")
  target_include_directories(${CEF_TARGET} PRIVATE "streamDeck")
  target_include_directories(${CEF_TARGET} PRIVATE "streamDeck/ThirdParty")
  target_include_directories(${CEF_TARGET} PRIVATE "../win/3rdParty/spdlog/include")
  target_include_directories(${CEF_TARGET} PRIVATE "../third_party/seglib-dev/seglib-0.1.2-Windows-AMD64-shared-Release/include/segmentation")
  target_include_directories(${CEF_TARGET} PRIVATE ".")
  add_definitions(-DSPDLOG_WCHAR_TO_UTF8_SUPPORT -DSPDLOG_WCHAR_FILENAMES)

  # Set linker properties
  target_link_options(${CEF_TARGET} PUBLIC /DEBUG:FULL )

  if(USE_ATL)
    # Required by VS2013 to link accessibility API functions.
    target_link_libraries(${CEF_TARGET} oleacc.lib)
  endif()

  # Copy CEF binary and resource files to the target output directory.
  COPY_FILES("${CEF_TARGET}" "${CEF_BINARY_FILES}" "${CEF_BINARY_DIR}" "${CEF_TARGET_OUT_DIR}")
  COPY_FILES("${CEF_TARGET}" "${CEF_RESOURCE_FILES}" "${CEF_RESOURCE_DIR}" "${CEF_TARGET_OUT_DIR}")
  COPY_FILES("${CEF_TARGET}" "${SENTRY_FILES}" "${SENTRY_BIN_DIR_WIN}" "${CEF_TARGET_OUT_DIR}")
  COPY_FILES("${CEF_TARGET}" "${LIBARCHIVE_FILES}" "${LIBARCHIVE_BIN_DIR_WIN}" "${CEF_TARGET_OUT_DIR}")

  if(USE_SANDBOX)
    # Set LPAC ACLs required for Windows sandbox support.
    SET_LPAC_ACLS("${CEF_TARGET}")
  endif()

    # Zip and copy the web apps
  add_custom_command(
    TARGET ${CEF_TARGET}
    POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E tar cvf "${CEF_TARGET_OUT_DIR}/mmhmm-client.pak" --format=zip -- .
    WORKING_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/web"
    )

  COPY_FILES("${CEF_TARGET}" "${MMHMM_CAMERA_CLIENT_DLL}" "${MMHMM_CAMERA_CLIENT_BIN_DIR_WIN}" "${CEF_TARGET_OUT_DIR}")
  COPY_FILES("${CEF_TARGET}" "${ZMQ_DLL}" "${ZMQ_DIR_WIN}" "${CEF_TARGET_OUT_DIR}")

  COPY_FILES("${CEF_TARGET}" "${WEB_APP_FILES}" "${WEB_APP_DIR_WIN}" "${CEF_TARGET_OUT_DIR}")

  COPY_FILES("${CEF_TARGET}" "${ASSETS_WIN_FILES}" "${ASSETS_DIR_WIN}" "${CEF_TARGET_OUT_DIR}/Assets")
  
  COPY_FILES("${CEF_TARGET}" "${CAMERA_DRIVER_FILES}" "${CAMERA_DRIVER_FILES_DIR_WIN}" "${CEF_TARGET_OUT_DIR}/Camera/Driver")
  
  COPY_FILES("${CEF_TARGET}" "${CAMERA_SERVICE_FILES}" "${CAMERA_SERVICE_DIR_WIN}" "${CEF_TARGET_OUT_DIR}/Service")

  COPY_FILES("${CEF_TARGET}" "${DRIVER_MANAGER_LIB_FILES}" "${DRIVER_MANAGER_LIB_DIR_WIN}" "${CEF_TARGET_OUT_DIR}")
  COPY_FILES("${CEF_TARGET}" "${DRIVER_MANAGER_FILES}" "${DRIVER_MANAGER_DIR_WIN}" "${CEF_TARGET_OUT_DIR}")

  COPY_FILES("${CEF_TARGET}" "measure_inference_duration_app.exe" "${CMAKE_SOURCE_DIR}/third_party/seglib-dev/seglib-0.1.2-Windows-AMD64-shared-Release/bin/" "${CEF_TARGET_OUT_DIR}")

  # Modify the pre-build bootstrapper exe with our custom values
  set(RCEDIT_EXE "${CMAKE_SOURCE_DIR}/win/Build-Tools/rcedit.exe")
  set(APP_ICON "${CMAKE_CURRENT_SOURCE_DIR}/resources/win/mmhmm-hybrid.ico")
  set(APP_EXE "${CEF_TARGET_OUT_DIR}/${CEF_TARGET}.exe")
  set(APP_DLL "${CEF_TARGET_OUT_DIR}/${CEF_TARGET}.dll")

  add_custom_command(TARGET ${CEF_TARGET} POST_BUILD
  COMMAND powershell -NoProfile -ExecutionPolicy Bypass
          -File "${CMAKE_SOURCE_DIR}/win/Build-Tools/resource-stamper.ps1"
          -AppDll "${APP_DLL}"
          -BootstrapExe "${APP_EXE}"
          -RceditExe "${RCEDIT_EXE}"
          -IconPath "${APP_ICON}"
  VERBATIM
  )

endif()
