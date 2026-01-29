# Copyright (c) 2024 mmhmm. All rights reserved.
# Hybrid communication layer tests using Google Test.

set(CEF_TARGET "mmhmm_hybrid_tests")

# Test source files
set(HYBRID_TEST_SRCS
  common/app_capabilities_test.cc
  common/virtual_camera_test.cc
  common/power_monitor_test.cc
  common/cef_value_utility_test.cc
  test_main.cc
)
source_group(tests FILES ${HYBRID_TEST_SRCS})

# Source files from mmhmm-hybrid/common that we're testing
set(HYBRID_COMMON_SRCS
  ../common/app_capabilities.cc
  ../common/virtual_camera.cc
  ../common/power_monitor.cc
  ../common/cef_value_utility.cc
)

add_executable(${CEF_TARGET} ${HYBRID_TEST_SRCS} ${HYBRID_COMMON_SRCS})

# Start with CEF default properties
SET_EXECUTABLE_TARGET_PROPERTIES(${CEF_TARGET})

# Link against gtest and CEF wrapper
add_dependencies(${CEF_TARGET} cef_gtest libcef_dll_wrapper)
target_link_libraries(${CEF_TARGET} cef_gtest libcef_dll_wrapper ${CEF_STANDARD_LIBS})

# Include directories
target_include_directories(${CEF_TARGET} PRIVATE
  "${CEF_ROOT}/tests/gtest/include"
  "${CMAKE_SOURCE_DIR}/mmhmm-hybrid"
  "${CMAKE_SOURCE_DIR}"
)

# Compile definitions
target_compile_definitions(${CEF_TARGET} PRIVATE -DUNIT_TEST)

if(OS_WINDOWS)
  # Disable unused variable warning for tests
  target_compile_options(${CEF_TARGET} PRIVATE "/wd4800")
endif()

# Copy CEF binaries needed for tests to run
if(OS_WINDOWS)
  COPY_FILES("${CEF_TARGET}" "${CEF_BINARY_FILES}" "${CEF_BINARY_DIR}" "${CEF_TARGET_OUT_DIR}")
  COPY_FILES("${CEF_TARGET}" "${CEF_RESOURCE_FILES}" "${CEF_RESOURCE_DIR}" "${CEF_TARGET_OUT_DIR}")
endif()

# Enable CTest
enable_testing()
add_test(NAME HybridCommunicationTests COMMAND ${CEF_TARGET})
