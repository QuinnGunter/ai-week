#!/bin/zsh

#  post_build.sh
#  mmhmm-hybrid
#  Copyright 2022 mmhmm, Inc. All rights reserved.
#  Created by Mark Bessey on 9/1/22.
#  
set -euxo pipefail

build_dir="$CONFIGURATION_BUILD_DIR"
product_name="$PRODUCT_NAME"
cef_directory="$PROJECT_DIR/CEF/$CONFIGURATION"
cef_framework="Chromium Embedded Framework.framework"
app_bundle_framework_directory="$build_dir/$product_name.app/Contents/Frameworks"
code_signature="Developer ID Application: mmhmm inc. (M3KUT44L48)"

# copy CEF
ditto "$cef_directory/$cef_framework" "$app_bundle_framework_directory/$cef_framework"

# remove some unneeded files
echo "Removing dot files..."
rm -f  "$app_bundle_framework_directory/$cef_framework/.gitattributes"
rm -f  "$app_bundle_framework_directory/$cef_framework/.DS_Store"

# codesign seglib
codesign --force --options runtime --sign "$code_signature" --timestamp --generate-entitlement-der "$app_bundle_framework_directory/$cef_framework/Versions/A/Frameworks/libtpxai_segmentation.dylib"

# codesign the framework
codesign --force --options runtime --sign "$code_signature" --timestamp --generate-entitlement-der "$app_bundle_framework_directory/$cef_framework"

foreach helper ("${product_name} Helper" "${product_name} Helper (GPU)" "${product_name} Helper (Plugin)" "${product_name} Helper (Renderer)")
   ditto "${build_dir}/$helper.app" "$app_bundle_framework_directory/$helper.app"
end

exit 0
