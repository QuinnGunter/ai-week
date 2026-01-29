#!/bin/bash
# Build mmhmm Hybrid CEF for macOS

# Fail and bail as early as possible
set -euo pipefail

# Don't go to sleep while this script is running
caffeinate -imsw $$ &

### Variables & Constants ###

# Layout things
bold_text_const=$(tput bold)
normal_text_const=$(tput sgr0)
red_const='\033[0;31m'
yellow_const='\033[1;33m'
purple_const='\033[0;35m'
no_color_const='\033[0m'

required_disk_space_sources_git_GiB=40
required_disk_space_arm64_debug_GiB=130
required_disk_space_arm64_release_GiB=120
required_disk_space_x64_debug_GiB=170
required_disk_space_x64_release_GiB=150

cef_checkout=""
cef_checkout_id=""
cef_branch=""

# The script that validates the installed Xcode version against the branch requirements.
# Update this with new branches as required.
validate_script="validate_xcode_version.sh"
# The script that creates a universal binary framework from multiple different architecture frameworks.
universalizer_script="make_universal_CEF.zsh"
# A flag file that indicates the successful preparation of the CEF sources.
sources_ready_file="SOURCES_READY"

root_dir=$HOME
hybrid_repo_dir=$PWD
chromium_download_dir=""
chromium_local_copy_dir=""

ccache_max_size="100GB"
ccache_sloppiness="time_macros"
build_architectures=""
build_type=""
automate_build_type=()
install_missing_CLIs=false
resolve_github_login=false
ignore_ccache_configuration=false
cef_automate_verbosity=""
ignore_disk_space=false
install_framework=false
just_calculate_disk_space=false
fix_broken_download=false
validate_xcode_version_script_arguments=""
script_invocation="$0 $*"
update_modifications=false

# URLs used in this script
cef_repo_url="https://atbf@bitbucket.org/chromiumembedded/cef.git"
depot_tools_repo_url="https://chromium.googlesource.com/chromium/tools/depot_tools.git"
automate_script_url="https://bitbucket.org/chromiumembedded/cef/raw/master/tools/automate/automate-git.py"
# SSH and HTTPS origin of the hybrid repo look different but share some components
hybrid_repo_url_components="All-Turtles/mmhmm-hybrid.git"

### Functions ###

# Prints a highlighted message to stdout.
function decorate {
    echo -e "${purple_const}${bold_text_const}${1}${normal_text_const}${no_color_const}"
}

# Prints a bold message to stdout.
function bold {
    echo "${bold_text_const}${1}${normal_text_const}"
}

# Prints a warning to stderr. This allows printing messages from within functions that echo to stdout in order to return a string value.
function warning {
    echo -e "${yellow_const}${bold_text_const}${1}${normal_text_const}${no_color_const}" >&2
}

# Prints an error to stderr. This allows printing messages from within functions that echo to stdout in order to return a string value.
function error {
    echo -e "${red_const}${bold_text_const}${1}${normal_text_const}${no_color_const}" >&2
}

# Usage: resolve_path "path"
# Example: resolve_path "../../path/to/somewhere"
function resolve_path {
    local input_path=$1
    if [ -z "$input_path" ]; then
        # Don't fail on empty paths, just don't resolve them
        exit 0
    fi

    local return_value=0
    local resolved_path
    resolved_path=$(readlink -f "$input_path") || return_value=$?

    if [ $return_value != 0 ]; then
        bail "Cannot resolve $input_path. Make sure the path exists and is accessible to the current effective user $(id -un)." $return_value
    fi

    echo "$resolved_path"
}

function help {
    local script_name
    script_name=$(basename "$0")

    echo
    decorate "$script_name"
    echo
    echo "Downloads, updates, and patches CEF sources as required. Builds CEF. Takes forever."
    echo
    bold "Required arguments"
    echo
    echo "--build-arch              all, x64, arm64"
    echo "--build-type              full, no_archives, only_debug"
    echo
    bold "Optional arguments"
    echo
    echo "--all-the-way             Specify to install, update, and run all CLI dependencies via HomeBrew. Omit to end script if dependencies are missing or incomplete."
    echo "--cef-checkout            The CEF tag/branch/hash to checkout. By default the value in CEF_BUILD_COMPATIBILITY.txt is used"
    echo "--calculate-disk-space    Specify to print the calculated disk space required for the given --build-arch and --build-type. Does not initiate downloading or building."
    echo "--custom-ccache-config    Specify to ignore the suggested configuration max-size=$ccache_max_size, sloppiness=$ccache_sloppiness, and ccache_dir within --root-dir."
    echo "--fix-broken-download     Specify to try fixing an interrupted Chromium download. Use this if re-running the interrupted script invocation consistently fails."
    echo "--help                    This message."
    echo "--hybrid-repo-dir         The mmhmm Hybrid repo directory. Defaults to $hybrid_repo_dir."
    echo "--ignore-disk-space       Specify to ignore the calculated required disk space being lower than the available disk space. A sensible option if a build is being continued."
    echo "--install                 Installs the CEF framework build artifact into the appropriate location within --hybrid-repo-dir."
    echo "--root-dir                The build root directory. Must not contain spaces or special characters. Defaults to $root_dir."
    echo "--update-modifications    Specify to reset the Chromium repo and update it with custom sources modifications from --hybrid-repo-dir."
    echo "--verbose                 Specify to print all executed commands."
    echo
    bold "Experimental arguments"
    echo
    echo "--download-only-dir       Specify a directory to initiate a download of all CEF sources, including Chromium, without building."
    echo "--local-chromium-dir      Specify a directory to copy the Chromium sources from, instead of downloading them."
    echo
    bold "Description"
    echo
    echo "This script does its best to build CEF with the mmhmm Hybrid modifications. First, the various requirements and prerequisites are checked, updated, and validated."
    echo "The second step is downloading the CEF sources, including the Chromium sources, which may involve substantial periods of silent waiting and potential failures due to network errors."
    echo "The third step of this script is the actual build, characterized by an enduring torrent of build log messages."
    echo "If both architectures, x64 and arm64, are built, the build step is followed up by the creation of a universal framework suitable for distribution on both platforms."
    echo "Re-running this script in case of failure is always an option. See the available arguments for help with and workarounds for specific issues."
    echo
    bold "Building on an External Drive"
    echo
    echo "$script_name is able to build on an external drive, however it does not prevent the drive from being force-ejected, e.g. during an attempted system update."
    echo "Be aware that even when building on an external drive, GBs of virtual memory swap data may be written to the system volume. This can be helped significantly by"
    echo "closing apps using large amounts of memory to reduce overall memory pressure on the system."
    echo
    bold "Examples"
    echo
    echo "    % ./$script_name --root-dir path/to/build/stage --build-arch all --build-type full --all-the-way"
    echo
    echo "Builds debug and release configurations of the default branch for all available platforms in the specified root dir, taking care of installing all CLIs"
    echo "and prompting the user to log into their GitHub account if required. The script is assumed to be invoked from somewhere within the hybrid repo."
    echo
    echo "    % path/to/$script_name --hybrid-repo-dir /path/to/mmhmm-hybrid --root-dir . --build-arch arm64 --build-type only_debug"
    echo
    echo "Builds the debug configuration of the default branch for the arm64 platform in the current working directory."
    echo
    bold "Resources"
    echo
    echo "CEF branches can be looked up at https://bitbucket.org/chromiumembedded/cef/wiki/BranchesAndBuilding"
    echo "CEF building quick start instructions are located at https://bitbucket.org/chromiumembedded/cef/wiki/MasterBuildQuickStart.md"
    echo "ccache in the context of Chromium builds is discussed at https://chromium.googlesource.com/chromium/src/+/master/docs/ccache_mac.md"
    echo
}

# Usage: bail "Optional custom error message" optional-custom-exit-code
# Example: bail "Does not compute! Bleep bloop." 42
function bail {
    local default_message="Unspecified error occurred."
    local default_error_code=1

    # help
    echo ""
    error "Error: ${1-$default_message}"
    exit "${2-$default_error_code}"
}

# Usage: askToContinueOrBail "Message to confirm"
# Example: askToContinueOrBail "Proceed with detonating your built-in battery?"
function askToContinueOrBail {
    warning "$1"
    continue=""
    read -p "Enter yes to confirm: " -r continue
    echo # move to new line after input
    if [ "$continue" != "yes" ]; then
        bail "User selected no."
    fi
}

function calculateRequiredDiskSpace {
    local build_architectures=$1
    local build_type=$2
    local sum=$required_disk_space_sources_git_GiB

    case "$build_type" in
    "full" | "no_archives")
        case "$build_architectures" in
        "all")
            ((sum += required_disk_space_arm64_debug_GiB))
            ((sum += required_disk_space_arm64_release_GiB))
            ((sum += required_disk_space_x64_debug_GiB))
            ((sum += required_disk_space_x64_release_GiB))
            ;;
        "x64")
            ((sum += required_disk_space_x64_debug_GiB))
            ((sum += required_disk_space_x64_release_GiB))
            ;;
        "amd64" | "arm64")
            ((sum += required_disk_space_arm64_debug_GiB))
            ((sum += required_disk_space_arm64_release_GiB))
            ;;
        esac
        ;;
    "only_debug")
        case "$build_architectures" in
        "all")
            ((sum += required_disk_space_arm64_debug_GiB))
            ((sum += required_disk_space_x64_debug_GiB))
            ;;
        "x64")
            ((sum += required_disk_space_x64_debug_GiB))
            ;;
        "amd64" | "arm64")
            ((sum += required_disk_space_arm64_debug_GiB))
            ;;
        esac
        ;;
    esac

    echo "$sum"
}

# Usage: patch patch-dir patch-file-path patch-description
# Example: patch /patch/this/dir the-patch-file.patch "Foo repo"
function patch {
    local patch_dir=$1
    local patch_file_path=$2
    local patch_description=$3

    pushd "$patch_dir"
    # Check if patch has been applied
    if ! git apply --reverse --check "$patch_file_path"; then
        # Check if patch can be applied
        if ! git apply --check "$patch_file_path"; then
            bail "$patch_description is out of sync, patch can't be applied. Might the patch need an update?"
        fi

        decorate "Applying $patch_description patch..."
        git apply "$patch_file_path"
    else
        decorate "Skipped applying $patch_description patch, because it was already applied."
    fi
    popd
}

### Main Entry Point ###

# Send help
if [ $# == 0 ] || [ "$1" == --help ]; then
    help
    exit 0
fi

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
    --build-arch)
        build_architectures="$2"
        shift # past argument
        shift # past value
        ;;
    --build-type)
        build_type="$2"
        shift # past argument
        shift # past value
        ;;
    --cef-checkout)
        cef_checkout="$2"
        shift # past argument
        shift # past value
        ;;
    --hybrid-repo-dir)
        hybrid_repo_dir="$2"
        shift # past argument
        shift # past value
        ;;
    --root-dir)
        root_dir="$2"
        shift # past argument
        shift # past value
        ;;
    --custom-ccache-config)
        ignore_ccache_configuration=true
        shift # past argument
        ;;
    --all-the-way)
        install_missing_CLIs=true
        resolve_github_login=true
        shift # past argument
        ;;
    --verbose)
        # Print every command being executed.
        set -x
        cef_automate_verbosity="--verbose-build"
        validate_xcode_version_script_arguments="--verbose"
        shift # past argument
        ;;
    --ignore-disk-space)
        ignore_disk_space=true
        shift # past argument
        ;;
    --install)
        install_framework=true
        shift # past argument
        ;;
    --calculate-disk-space)
        just_calculate_disk_space=true
        shift # past argument
        ;;
    --download-only-dir)
        chromium_download_dir="$2"
        shift # past argument
        shift # past value
        ;;
    --local-chromium-dir)
        chromium_local_copy_dir="$2"
        shift # past argument
        shift # past value
        ;;
    --fix-broken-download)
        fix_broken_download=true
        shift # past argument
        ;;
    --update-modifications)
        update_modifications=true
        shift # past argument
        ;;
    *)
        bail "Unknown option $1"
        ;;
    esac
done

### Script Input Processing ###

# Validate CEF branch/checkout

if [[ -z "${cef_checkout// }" ]]; then
    # Get the checkout from file
    cef_checkout_file="$hybrid_repo_dir/cef-modifications/CEF_BUILD_COMPATIBILITY.txt"
    cef_checkout=$(<"$cef_checkout_file")
    cef_checkout_id=$(basename "$cef_checkout")
    # Replace whitespace (including newlines) with underscores
    cef_checkout_id="${cef_checkout_id//[[:space:]]/_}"
    cef_branch="${cef_checkout%%$'\n'*}"
    cef_branch="${cef_checkout%%$'\r'*}"
    cef_checkout="${cef_checkout##*$'\n'}"
    cef_checkout="${cef_checkout%%$'\r'*}"
    echo "Checkout ID: $cef_checkout_id"
    echo "CEF Checkout: $cef_checkout"
    echo "CEF Branch: $cef_branch"
  if [[ -z "${cef_checkout// }" ]]; then
    bail "Unable to determine the CEF version to checkout."
  fi
fi

if [ "$update_modifications" == true ]; then
    askToContinueOrBail "The --update-modifications argument was specified. You are about to lose all changes made to any file tracked by Git in the Chromium source repository."
fi

# Enforce automate-git.py requirement for build directory structure, at least to some degree
disallowed_characters=$'[ \'\t\#\!\%\$]'
if [[ $root_dir =~ $disallowed_characters ]]; then
    bail "--root-dir argument must not contain special characters or spaces, but is: $root_dir"
fi

# Resolve relative paths
root_dir=$(resolve_path "$root_dir")
hybrid_repo_dir=$(resolve_path "$hybrid_repo_dir")
chromium_download_dir=$(resolve_path "$chromium_download_dir")
chromium_local_copy_dir=$(resolve_path "$chromium_local_copy_dir")

# Validate local copy of Chromium sources, if specified.
if [ -n "$chromium_local_copy_dir" ] && ! grep 'Chromium' "$chromium_local_copy_dir"/LICENSE; then
    bail "$chromium_local_copy_dir does not seem to be the Chromium 'src' directory."
fi

# Check if mmhmm-hybrid repo was specified correctly
hybrid_repo_dir_git_origin=$(git -C "$hybrid_repo_dir" remote get-url origin 2>/dev/null)
if ! git -C "$hybrid_repo_dir" remote get-url origin &>/dev/null; then
    bail "$hybrid_repo_dir is not a repo, the mmhmm-hybrid repo is required."
fi

if [[ "$hybrid_repo_dir_git_origin" != *"$hybrid_repo_url_components"* ]]; then
    bail "
$hybrid_repo_dir is not the mmhmm-hybrid repo
Expected repo origin to contain: $hybrid_repo_url_components
Observed repo origin: $hybrid_repo_dir_git_origin
    "
fi

# Ensure this script operates on the mmhmm-hybrid root directory
hybrid_repo_dir=$(git -C "$hybrid_repo_dir" rev-parse --show-toplevel)

# Determine build configuration, amd64 is for backwards compatibility of this script.
if [ "$build_architectures" != "all" ] && [ "$build_architectures" != "x64" ] && [ "$build_architectures" != "amd64" ] && [ "$build_architectures" != "arm64" ]; then
    bail "Invalid argument passed for --build-arch: $build_architectures"
fi
if [ "$build_type" != "full" ] && [ "$build_type" != "no_archives" ] && [ "$build_type" != "only_debug" ]; then
    bail "Invalid argument passed for --build-type: $build_type"
fi

# Determine required and available disk space
available_disk_space_GiB=$(df -Phg "$root_dir" | awk '/[0-9]%/{print $(NF-2)}')
required_disk_space_GiB=$(calculateRequiredDiskSpace "$build_architectures" "$build_type")

if [ "$just_calculate_disk_space" == true ]; then
    echo "The specified build configuration requires approximately $required_disk_space_GiB GiB of disk space in $root_dir."
    exit 0
elif [ "$ignore_disk_space" == false ] && [ "$available_disk_space_GiB" -lt "$required_disk_space_GiB" ]; then
    bail "$root_dir has $available_disk_space_GiB GiB, but the specified build configuration requires approximately $required_disk_space_GiB GiB. Specify --ignore-disk-space to override this check."
fi

# Convert build type to valid CEF automate script arguments
if [ "$build_type" == "no_archives" ]; then
    automate_build_type=(--no-distrib-archive)
elif [ "$build_type" == "only_debug" ]; then
    automate_build_type=(--no-distrib-archive --no-release-build)
else
    # Expansion of this empty array must be done with "${automate_build_type[@]+"${automate_build_type[@]}"}" to avoid an `unbound variable` error because of `set -u`.
    automate_build_type=()
fi

### Dependencies Check ###

# Check Xcode version
this_script_path=$(dirname "$0")
if ! "$this_script_path"/"$validate_script" "$cef_checkout_id" "$validate_xcode_version_script_arguments"; then
    bail "The active Xcode version does not meet the requirements of checkout $cef_checkout_id. Use xcode-select to switch to a compatible version or select a different checkout."
fi

# Check for Xcode app bundle
if [ ! -d /Applications/Xcode.app ]; then
    bail "The app bundle /Applications/Xcode.app does not exist, but is required. Renamed bundles are not recognized by automate-git.py."
fi

# Check if HomeBrew is installed
if ! command -v brew >/dev/null && [ $install_missing_CLIs == true ]; then
    bail "HomeBrew is not installed. Visit brew.sh to install and run this script again after installation."
fi

# Check if ccache is installed
if ! command -v ccache >/dev/null && [ $install_missing_CLIs == false ]; then
    bail "ccache is not installed. Install manually or run this script with --all-the-way."
fi

# Check if cmake is installed
if ! command -v cmake >/dev/null && [ $install_missing_CLIs == false ]; then
    bail "cmake is not installed. Install manually or run this script with --all-the-way."
fi

# Check if gh is installed
if ! command -v gh >/dev/null && [ $install_missing_CLIs == false ]; then
    bail "gh (GitHub CLI) is not installed. Install manually or run this script with --all-the-way."
fi

# Check if the macOS default git installation is used
if [ "$(command -v git)" == "/usr/bin/git" ] && [ $install_missing_CLIs == false ]; then
    bail "git points to the macOS standard installation which might be too old and fail. Install the most recent version manually or run this script with --all-the-way."
fi

if [ $install_missing_CLIs == true ]; then
    decorate "Installing and updating CLI dependencies..."
    brew install ccache cmake gh git
    brew link --overwrite git
else
    decorate "Skipped updating CLI dependencies. Run this script with --all-the-way to enable updating."
fi

### Dependencies Configuration ###

if [ $ignore_ccache_configuration == false ]; then
    decorate "Configuring ccache..."

    # Ensure that ccache uses the specified root directory for cache storage.
    export CCACHE_DIR="$root_dir"/ccache

    # Check ccache config
    current_ccache_max_size=$(ccache --get-config max_size)
    current_ccache_sloppiness=$(ccache --get-config sloppiness)

    # Check ccache max size
    if [ "$current_ccache_max_size" != "$ccache_max_size" ]; then
        ccache --max-size=$ccache_max_size
    fi

    # Check ccache sloppiness
    if [ "$current_ccache_sloppiness" != "$ccache_sloppiness" ]; then
        export CCACHE_SLOPPINESS=$ccache_sloppiness
    fi
fi

# Check if the GitHub user is logged in
if ! gh auth status >/dev/null 2>&1; then
    if [ $resolve_github_login == false ]; then
        bail "User is not logged in with GitHub CLI. Log in manually or run this script with --all-the-way."
    fi

    decorate "Logging into GitHub..."
    gh auth login
fi

### Prerequisites Setup ###

dyld_dylib_dir="/usr/local/lib"

# Check if dyld dylib default directory exists and has the same ownership as the effective user.
if [ ! -d "$dyld_dylib_dir" ] || [ "$(stat -f "%u" "$dyld_dylib_dir")" != "$(id -u)" ] || [ "$(stat -f "%g" "$dyld_dylib_dir")" != "$(id -g)" ]; then
    decorate "Directory $dyld_dylib_dir does not exist or is inaccessible to effective user $(id -un). Password is required to create or modify the directory once."

    # Create directory if it doesn't exist.
    sudo mkdir -p "$dyld_dylib_dir"
    # The directory needs to be at least read-writable to the effective user to allow access (potentially much much) later on.
    # Since it would be inconvenient to require the password interactively again then, the folder attributes are changed once instead.
    # Changing ownership to the effective user seems a safer solution than changing permissions to make the folder accessible to everyone.
    # The original ownership will not be restored, since `-d` won't find the directory for the effective user on subsequent script runs otherwise.
    sudo chown "$(id -nu):$(id -ng)" "$dyld_dylib_dir"
    # Invalidate cached password.
    sudo -k

    bold "$dyld_dylib_dir was created or modified successfully. Password cache was invalidated."
else
    decorate "Directory $dyld_dylib_dir exists and is accessible to effective user $(id -un)."
fi

decorate "Setting up build stage in ${root_dir}..."

git_dir="$root_dir/git"
cef_dir="$git_dir/cef"
automate_dir="$cef_dir/tools/automate"
depot_tools_dir="$cef_dir/tools/depot_tools"
download_dir="$root_dir/cef_$cef_checkout_id"
chromium_dir="$download_dir/chromium"
chromium_src_dir="$chromium_dir/src"
chromium_cef_dir="$chromium_src_dir/cef"
seglib_dir="$chromium_src_dir/third_party/seglib/lib"
seglib_dylib="libtpxai_segmentation.dylib"

# Make dir if it doesn't exist.
mkdir -p "$git_dir"

decorate "Checking CEF repo..."
if [[ ! -d "$cef_dir" ]]; then
    git clone "$cef_repo_url" "$cef_dir"
elif git -C "$cef_dir" status --porcelain; then
    warning "CEF repo has local changes, trying to continue without updating these sources."
else
    git -C "$cef_dir" pull
fi

# Make dir if it doesn't exist.
mkdir -p "$automate_dir"

if [ ! -f "$automate_dir/automate-git.py" ]; then
    decorate "Downloading the CEF automate script..."
    curl "$automate_script_url" -o "$automate_dir/automate-git.py"
else
    decorate "Skipped downloading the CEF automate script because it already exists."
fi

decorate "Checking Chromium depot tools..."
if [[ ! -d "$depot_tools_dir" ]]; then
    git clone "$depot_tools_repo_url" "$depot_tools_dir"
else
    git -C "$depot_tools_dir" checkout main
    git -C "$depot_tools_dir" pull
fi

# Add the depot tools dir to the PATH env var.
export PATH=$depot_tools_dir:$PATH

### Sources Preparation ###

# Set options for GN build scripts
export GN_DEFINES="is_official_build=true is_component_build=false proprietary_codecs=true ffmpeg_branding=Chrome cc_wrapper=ccache"
export GN_ARGUMENTS="--ide=xcode -xcode-project=cef --filters=//cef/*"
export CEF_ARCHIVE_FORMAT="tar.bz2"

# Check build architectures, amd64 is for backwards compatibility of this script.
if [ "$build_architectures" == "all" ] || [ "$build_architectures" = "x64" ] || [ "$build_architectures" = "amd64" ]; then
    # Weird as it is, building Intel x64 on ARM requires setting CEF_ENABLE_AMD64 according to https://www.magpcss.org/ceforum/viewtopic.php?f=6&t=18817
    export CEF_ENABLE_AMD64=1
else
    export CEF_ENABLE_AMD64=0
fi

sources_ready_file_path="$download_dir"/"$sources_ready_file"

# Acquire or fix up CEF sources
if [ -n "$chromium_local_copy_dir" ]; then
    if [ -d "$chromium_src_dir" ] && [ -z "$(ls -A "$chromium_src_dir")" ]; then
        bail "Stopped copying local Chromium sources because $chromium_src_dir is not empty."
    fi

    decorate "Copying local sources..."
    # Make dir if it doesn't exist.
    mkdir -p "$chromium_src_dir"
    # Copy everything within the source dir into the target dir
    cp -R "$chromium_local_copy_dir"/. "$chromium_src_dir"
elif [ "$fix_broken_download" == true ]; then
    decorate "Fixing broken download..."

    broken_chromium_download_dir=""
    if [ -n "$chromium_download_dir" ]; then
        broken_chromium_download_dir=$chromium_download_dir
    else
        broken_chromium_download_dir=$chromium_src_dir
    fi

    compatibility_file="$broken_chromium_download_dir"/cef/CHROMIUM_BUILD_COMPATIBILITY.txt
    ref_tag=$(grep 'chromium_checkout' "$compatibility_file" | awk -F ":" '{print $2}' | cut -d \' -f 2)

    # This fix is based on https://www.magpcss.org/ceforum/viewtopic.php?t=18217
    pushd "$broken_chromium_download_dir"
    git checkout "$ref_tag"
    gclient sync --with_branch_heads --nohooks
    cd cef
    tools/patch.sh
    cd ..
    gclient runhooks
    popd

    # Force writing a new flag file by removing the old one, if it exists
    rm -f "$sources_ready_file_path"
elif [ ! -f "$sources_ready_file_path" ] || [ -n "$chromium_download_dir" ]; then
    # Initial "build" is just downloading: don't build, don't distribute

    if [ -n "$chromium_download_dir" ]; then
        # Download to specified directory
        download_dir=$chromium_download_dir
    fi

    decorate "Downloading sources..."
    # Specifying --arm64-build to make automate-git.py download the sources.
    # Nothing is being built here, so the actual target architecture specified is irrelevant, as long as it is a 64 bit architecture.
    python3 "$automate_dir"/automate-git.py --download-dir="$download_dir" --checkout="$cef_checkout" --branch=$cef_branch --no-build --no-distrib --force-clean --force-config --with-pgo-profiles "${automate_build_type[@]+"${automate_build_type[@]}"}" "$cef_automate_verbosity" --arm64-build
else
    decorate "Skipped downloading sources, because they already exist."
fi

# Stop here if only downloading sources
if [ -n "$chromium_download_dir" ]; then
    decorate "Finished download to $chromium_download_dir."
    exit 0
fi

# Modify chromium with custom files on first download and upon explicit request
if [ ! -f "$sources_ready_file_path" ] || [ "$update_modifications" == true ]; then
    decorate "Updating Chromium sources with custom modifications..."

    # The Chromium repo needs to reset any changes to tracked files before re-applying modifications.
    # Preserve the out subfolder during reset.
    temp_out_dir=$chromium_dir
    if [ -d "$chromium_src_dir/out" ]; then
        mv "$chromium_src_dir/out" "$temp_out_dir/"
    fi

    git -C "$chromium_src_dir" reset --hard

    # Restore the out subfolder
    if [ -n "$temp_out_dir" ] && [ -d "$temp_out_dir/out" ]; then
        mv "$temp_out_dir/out" "$chromium_src_dir/"
    fi

    # The copy_modifications_to_chromium.py script calls gh internally which needs to run from within the repo.
    pushd "$hybrid_repo_dir"
    python3 chromium-modifications/copy_modifications_to_chromium.py --chromium-src-dir "$chromium_src_dir" --override-seglib
    popd
else
    decorate "Skipped modifying Chromium sources with custom modifications as no update was indicated by command line argument."
fi

# Write a flag file for the first successful sources acquisition (that is not a separate download, which made this script exit above)
if [ ! -f "$sources_ready_file_path" ]; then
    echo "This file indicates successful acquisiton of CEF sources for builds within this directory. Remove to force a download retry." >"$sources_ready_file_path"
    echo "Invocation: $script_invocation" >>"$sources_ready_file_path"
fi

# Patch BUILD.gn files
cef_patch_path="$hybrid_repo_dir/cef-modifications/cef_build.patch"
patch "$chromium_cef_dir" "$cef_patch_path" "CEF repo"

v8_context_snapshot_dir="$chromium_src_dir/tools/v8_context_snapshot"
v8_context_snapshot_patch_path="$hybrid_repo_dir/cef-modifications/v8_context_snapshot.patch"
patch "$v8_context_snapshot_dir" "$v8_context_snapshot_patch_path" "v8_context_snapshot"

file_picker_patch="$hybrid_repo_dir/cef-modifications/1400_file_picker_enumeration.patch"
patch "$chromium_cef_dir" "$file_picker_patch" "Fix for file picker"

### Building ###

# Copy seglib dylib into a location where dyld can find it when running the v8_context_snapshot binary.
# dyld looks for dylibs in several default directories, one of which is /usr/local/lib.
ditto "$seglib_dir/$seglib_dylib" "$dyld_dylib_dir"

# The actual builds pass --no-update to ensure nothing is changed after the above patching
if [ "$build_architectures" == "all" ] || [ "$build_architectures" = "arm64" ]; then
    decorate "Building arm64..."
    python3 "$automate_dir"/automate-git.py --download-dir="$download_dir" --no-update --checkout="$cef_checkout" --force-build --arm64-build --with-pgo-profiles --force-config "${automate_build_type[@]+"${automate_build_type[@]}"}" "$cef_automate_verbosity" --branch=$cef_branch
fi

if [ "$build_architectures" == "all" ] || [ "$build_architectures" = "x64" ]; then
    decorate "Building x64..."
    python3 "$automate_dir"/automate-git.py --download-dir="$download_dir" --no-update --checkout="$cef_checkout" --force-build --x64-build --with-pgo-profiles --force-config "${automate_build_type[@]+"${automate_build_type[@]}"}" "$cef_automate_verbosity" --branch=$cef_branch
fi

# Create a universal framework
build_products_dir="$chromium_cef_dir/binary_distrib"
if [ "$build_architectures" == "all" ]; then
    decorate "Creating universal binary..."

    # Get the latest framework paths
    arm64_artifact_path=$(find "$build_products_dir" -name "*macosarm64" -print0 | xargs -0 ls -td | head -n 1)
    x64_artifact_path=$(find "$build_products_dir" -name "*macosx64" -print0 | xargs -0 ls -td | head -n 1)
    "$this_script_path"/"$universalizer_script" "$arm64_artifact_path" "$x64_artifact_path"
fi

### Installation ###

if [ $install_framework == true ]; then
    hybrid_repo_cef_dir="$hybrid_repo_dir/mac/CEF"
    decorate "Installing to $hybrid_repo_cef_dir..."

    install_artifact_path=""
    if [ "$build_architectures" == "all" ]; then
        install_artifact_path=$(find "$build_products_dir" -name "*macosuniversal" -print0 | xargs -0 ls -td | head -n 1)
    elif [ "$build_architectures" = "arm64" ]; then
        install_artifact_path=$(find "$build_products_dir" -name "*macosarm64" -print0 | xargs -0 ls -td | head -n 1)
    elif [ "$build_architectures" = "x64" ]; then
        install_artifact_path=$(find "$build_products_dir" -name "*macosx64" -print0 | xargs -0 ls -td | head -n 1)
    fi

    if [ -z "$install_artifact_path" ]; then
        bail "Could not determine the CEF framework build artifact path."
    else
        echo "Installing framework from $install_artifact_path."
    fi

    # The CEF framework structure is invalid for use on macOS since Xcode 26,
    # so use the copy_cef_framework.sh script to fix it up.
    framework_path_debug="$install_artifact_path/Debug"
    framework_path_release="$install_artifact_path/Release"
    invalid_structure_framework_path_debug="$install_artifact_path/Debug_invalid_framework_structure"
    invalid_structure_framework_path_release="$install_artifact_path/Release_invalid_framework_structure"

    mv "$framework_path_debug" "$invalid_structure_framework_path_debug"
    mv "$framework_path_release" "$invalid_structure_framework_path_release"
    mkdir -p "$framework_path_debug"
    mkdir -p "$framework_path_release"
    "$this_script_path/copy_cef_framework.sh" "$invalid_structure_framework_path_debug" "$framework_path_debug/Chromium Embedded Framework.framework"
    "$this_script_path/copy_cef_framework.sh" "$invalid_structure_framework_path_release" "$framework_path_release/Chromium Embedded Framework.framework"
    rm -rf "$invalid_structure_framework_path_debug"
    rm -rf "$invalid_structure_framework_path_release"

    # Install framework build artifact
    hybrid_repo_old_cef_dir="$hybrid_repo_dir/mac/CEF_replaced_$(date -uIseconds)"
    # Rename existing CEF folder if it exists
    [ -d "$hybrid_repo_cef_dir" ] && mv "$hybrid_repo_cef_dir" "$hybrid_repo_old_cef_dir"
    cp -R "$install_artifact_path" "$hybrid_repo_cef_dir"
fi

# And finally...
echo
decorate "All done! 🎉"

rm -f "$dyld_dylib_dir/$seglib_dylib"

echo
echo "The build products in $build_products_dir:"
ls "$build_products_dir"
