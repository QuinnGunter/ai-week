#!/bin/bash

# Error out as early as possible and print all executed commands to make debugging easier, especially in the CI.
set -euxo pipefail

script_dir=$(cd -- "$(dirname -- "$0")" &>/dev/null && pwd)
build_dir="$script_dir/build"
source_root_dir="$script_dir/.."
workspace_dir="$source_root_dir/mmhmm.xcworkspace"
is_ci=false

# shellcheck disable=SC1091
source "$script_dir/script_helpers.sh"

if [ $# -ge 1 ] && [ "$1" = "--ci" ]; then
    echo "Building for CI environment..."
    is_ci=true
    export BUILD_IS_CI="true"
    shift
else
    # Xcode build phase run scripts might expect SRCROOT to be set.
    export SRCROOT="$source_root_dir"
fi

arguments=(
    clean
    build
    -workspace "$workspace_dir"
    -scheme mmhmm
    -configuration Release
    -verbose
    -clonedSourcePackagesDirPath "$build_dir"
    BUILD_DIR="$build_dir"
    DWARF_DSYM_FOLDER_PATH="$build_dir/Symbols"
)

# The following flags are required to make building in a CI environment more robust:
# -scmProvider system
#   Don't use Xcode's SCM provider credentials, but the system Git's credentials.
# -clonedSourcePackagesDirPath
#   Download packages into the build directory instead of some random derived data directory.
# -disableAutomaticPackageResolution
#   Build the resolved package commit checked into git, don't resolve to the newest available package commit matching the project's package requirements.
ci_only_arguments=(
    -scmProvider system
    -disableAutomaticPackageResolution
)

if [ "$is_ci" = true ]; then
    arguments+=("${ci_only_arguments[@]}")
fi

xcodebuild \
    "${arguments[@]}" \
    "$@" # forward unconsumed arguments

# Sparkle has its own build script which does not consume the DWARF_DSYM_FOLDER_PATH setting above.
cp -r "$build_dir/Release/"*.dSYM "$build_dir/Symbols"

if [ "$is_ci" = false ]; then
    cp -R -X -f "$build_dir"/Release/Airtime.app .
    set +euxo pipefail
    echo
    echo -e "\n${BOLD_TEXT}Put down that cocktail, your build is done!${NORMAL_TEXT}\n"
fi
