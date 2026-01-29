#!/bin/bash

#  zip_web_content.sh
#  mmhmm-hybrid
#
#  Execute as an Xcode run script build phase to package
#  web pages which are deployed with the app and served
#  through an internal web server, e.g. to present error
#  pages in a CEF browser.
#
#  This script expects an `.xcfilelist`` as input and an
#  output file to be defined as part of the build phase.

set -euxo

if [ -z "$SRCROOT" ]; then
	echo "error: This script should only be run from Xcode."
	exit 2 # ENOENT
fi

in_file="" # reset below, definition here silences a shellcheck warning
out_file="$SCRIPT_OUTPUT_FILE_0"
temp_dir="$DERIVED_FILE_DIR/mmhmm-client-zip"
css_temp_dir="$temp_dir/css"

rm -f "$out_file"
rm -rf "$temp_dir"
mkdir "$temp_dir"
mkdir "$css_temp_dir"

# The following is taken almost verbatim from Apple sample code, see
# https://developer.apple.com/videos/play/wwdc2021/10210/

for i in $(seq 0 $(expr ${SCRIPT_INPUT_FILE_LIST_COUNT} - 1)) ; do
    in_file_temp="SCRIPT_INPUT_FILE_LIST_$i"
    eval in_file=\$$in_file_temp

    while IFS= read -r file; do
		if [ "${file: -4}" == ".css" ]; then
			cp -R "$file" "$css_temp_dir"
		else
			cp -R "$file" "$temp_dir"
		fi
    done < "$in_file"
done

cd "$temp_dir"
zip -r "$out_file" -- *
