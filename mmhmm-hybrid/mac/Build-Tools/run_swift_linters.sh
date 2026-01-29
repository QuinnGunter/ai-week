#!/bin/bash
set -euxo

if [ -z "$SRCROOT" ]; then
	echo "[ERROR] This script should only be run from Xcode."
	exit 2 # ENOENT
fi

cd "$SRCROOT/Build-Tools/SwiftBuildTools" || exit 2 # ENOENT

repo_root="$SRCROOT"
build_path="$repo_root/Build-Tools/.build"
swiftformat_path="$build_path/swiftformat"
swiftlint_path="$build_path/swiftlint"

# Check if there are any updates
if ! swift package update --dry-run | grep -q '0 dependencies have changed'; then
	swift package update
	rm -f "$swiftformat_path"
	rm -f "$swiftlint_path"
fi

# Create dir if it doesn't exist
#mkdir -p "$build_path"

# Only build if the binaries don't exist to speed up Xcode build time,
# which should only be in a new repo or after an update or in a clean CI environment.

if ! [ -f "$swiftformat_path" ]; then
	swift_build_path=$(swift build --show-bin-path -c release)
	swift build -c release --product swiftformat
	ditto "$swift_build_path/swiftformat" "$swiftformat_path"
fi

if ! [ -f "$swiftlint_path" ]; then
	swift_build_path=$(swift build --show-bin-path -c release)
	swift build -c release --product swiftlint
	ditto "$swift_build_path/swiftlint" "$swiftlint_path"
fi

pushd "$SRCROOT"

"$swiftformat_path" --lint --lenient .
"$swiftlint_path"

popd
