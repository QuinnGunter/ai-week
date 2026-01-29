#!/bin/bash

#  copy_cef_framework.sh
#  mmhmm-hybrid
#  Copyright 2025 mmhmm, Inc. All rights reserved.
#  
# Copy the CEF framework into the Frameworks directory and create the necessary symlinks.
# Resulting directory structure is:
#   Chromium Embedded Framework.framework
#   ├── Chromium Embedded Framework -> Versions/A/Chromium Embedded Framework
#   ├── Libraries -> Versions/A/Libraries
#   ├── Resources -> Versions/A/Resources
#   └── Versions
#       ├── A
#       │   ├── Chromium Embedded Framework
#       │   ├── Libraries
#       │   └── Resources
#       └── Current -> A
#
#  Source: https://github.com/chromiumembedded/cef/issues/2446#issuecomment-3211650296
#
#  Usage: ./copy_cef_framework.sh cef_binary_dir framework_dir
#

set -euxo pipefail

# Check arguments
if [ $# -ne 2 ]; then
    echo "Usage: $0 cef_binary_dir framework_dir"
    echo "  cef_binary_dir: Source CEF binary directory"
    echo "  framework_dir: Target framework directory"
    exit 1
fi

cef_binary_dir="$1"
framework_dir="$2"

# Validate input directories
if [ ! -d "$cef_binary_dir/Chromium Embedded Framework.framework" ]; then
    echo "Error: Source framework not found at $cef_binary_dir/Chromium Embedded Framework.framework"
    exit 1
fi

echo "Copying CEF framework from $cef_binary_dir to $framework_dir"

# Create target directory if it doesn't exist
mkdir -p "$framework_dir/Versions"

# Copy the entire framework to Versions/A (equivalent to cmake -E copy_directory)
cp -R "$cef_binary_dir/Chromium Embedded Framework.framework/." "$framework_dir/Versions/A/"

# Create symbolic links in the framework root
cd "$framework_dir"
ln -sf "Versions/A/Chromium Embedded Framework" "Chromium Embedded Framework"
ln -sf "Versions/A/Libraries" "Libraries"
ln -sf "Versions/A/Resources" "Resources"

# Create Current symlink in Versions directory
cd "$framework_dir/Versions"
ln -sf "A" "Current"

echo "CEF framework copy completed successfully"