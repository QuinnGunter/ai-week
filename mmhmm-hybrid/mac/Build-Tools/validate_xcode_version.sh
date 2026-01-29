#!/bin/bash
# Validate the available Xcode developer tools version against the requirements of the passed in CEF branch name.

# Fail and bail as early as possible
set -euo pipefail

# Map: CEF branch name to required Xcode versions
#
# Important: every branch older than the first specified will assume that branch's specified versions.
#
# Update with new version info from https://bitbucket.org/chromiumembedded/cef/wiki/BranchesAndBuilding.md#markdown-header-current-release-branches-supported
# following the format: "newest_branch_supporting_specified_versions mininmum_version maximum_version"
readonly xcode_version_by_branch=(
    # Insert branches with older requirements below this line.
    "5993 14.3 14.3.1" # all branches up to 5993 require these versions
    "6533 15.0 15.0" # all branches within 5994 and 6533 require these versions
    "6613 15.0 15.4" # all branches within 6534 and 6613 require these versions
    "6778 16.0 16.1"
    "790ec1e 16.0 16.1"
    "8311b6c 16.0 16.3"
    "7151__8614a8d 16.0 16.4"
    "7339__5eb3258 16.0 16.4"
    # Insert branches with newer requirements above this line.
)

# determine_support cef_branch xcode_version
function determine_support() {
    local cef_branch=$1
    local xcode_version=$2
    local script_name branch mininmum_version maximum_version lower_bound_version upper_bound_version
    script_name=$(basename "$0")

    for fields in "${xcode_version_by_branch[@]}"; do
        IFS=$' ' read -r branch mininmum_version maximum_version <<<"$fields"
        if [ "$cef_branch" == "$branch" ]; then
            lower_bound_version=$mininmum_version
            upper_bound_version=$maximum_version
            break
        fi
    done

    if [ -z "$upper_bound_version" ] || [ -z "$lower_bound_version" ]; then
        echo "Branch $cef_branch is unknown. Consider updating lookup table \`${!xcode_version_by_branch@}\` in $script_name."
        exit 1
    fi

    if [ "$(version "$xcode_version")" -gt "$(version "$upper_bound_version")" ]; then
        echo "Branch $cef_branch: active Xcode $xcode_version is newer than required Xcode version $upper_bound_version."
        exit 1
    elif [ "$(version "$xcode_version")" -lt "$(version "$lower_bound_version")" ]; then
        echo "Branch $cef_branch: active Xcode $xcode_version is older than required Xcode version $lower_bound_version."
        exit 1
    fi

    echo "Branch $cef_branch: active Xcode $xcode_version is within the bounds of versions [$lower_bound_version, $upper_bound_version]."

    exit 0
}

function help {
    local script_name
    script_name=$(basename "$0")

    echo
    echo "$script_name"
    echo "Validate available Xcode developer tools version"
    echo
    echo "   Usage: $script_name cef_branch [--verbose]"
    echo
    echo "Exits with 0 if the available Xcode developer tools version is supported for building the CEF branch named cef_branch."
    echo
}

# Outputs an integer-comparable presentation of a sematic version with up to 4 components.
function version {
    echo "$@" | awk -F. '{ printf("%d%03d%03d%03d\n", $1,$2,$3,$4); }'
}

# Outputs the currently `xcode-select`ed version.
function get_xcode_version {
    local command_line_tools_indicator="CommandLineTools"
    local xcode_select_path
    local xcode_version

    xcode_select_path=$(xcode-select -p)

    if [[ "$xcode_select_path" == *"$command_line_tools_indicator"* ]]; then
        xcode_version=$(pkgutil --pkg-info=com.apple.pkg.CLTools_Executables)
        xcode_version="${xcode_version#*version: }" # Strip up to and including "version :"
        xcode_version="${xcode_version%volume*}"    # Strip from and including "volume"
    else
        xcode_version=$(xcodebuild -version)
        xcode_version="${xcode_version#Xcode *}" # Strip up to and including "Xcode "
        xcode_version="${xcode_version%Build*}"  # Strip from and including "Build"
    fi

    xcode_version="${xcode_version//$'\n'/}" # Strip linefeed
    # Overly long version numbers are usually only an issue with Xcode command line tools, but apply it in any case, just to be sure
    xcode_version=$(echo "$xcode_version" | cut -d . -f -4) # Strip everything beyond the 4th version element

    echo "$xcode_version"
}

# Main entry point

if [ $# -lt 1 ]; then
    help
    exit 1
elif [ $# -ge 2 ] && [ "$2" == "--verbose" ]; then
    # Print every command being executed.
    set -x
fi

cef_branch=$1
xcode_version=$(get_xcode_version)

determine_support "$cef_branch" "$xcode_version"
