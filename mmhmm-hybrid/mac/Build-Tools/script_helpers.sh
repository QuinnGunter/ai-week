#!/bin/bash
#
# Include this file in other shell scripts: `source script_helpers.sh`
#

### Variables & Constants ###

# Set $TERM if not set, as tput requires it.
if [ -z "$TERM" ] || [ "$TERM" == "dumb" ] || [ "$TERM" == "unknown" ]; then
    echo "TERM is $TERM"
    export TERM="xterm-256color"
    echo "TERM is now $TERM"
fi

# Layout things
bold_text_const=$(tput bold)
normal_text_const=$(tput sgr0)
red_const='\033[0;31m'
yellow_const='\033[1;33m'
purple_const='\033[0;35m'
no_color_const='\033[0m'

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

# Safe removal function that validates paths and performs deletion
# Usage: remove_path "/path/to/delete" "description" [--force-remove-if-missing]
remove_path() {
    local path="$1"
    local description="$2"
    local force_remove="${3:-}"
    
    if [[ -z "$path" ]]; then
        echo "ERROR: Empty path for $description"
        return 1
    fi
    
    # Ensure path doesn't accidentally target critical system directories
    case "$path" in
        "$HOME/Library/Application Support" | "$HOME/Library/Application Support/")
            echo "ERROR: Refusing to delete entire Application Support directory"
            return 1
            ;;
        "$HOME/Library/Caches" | "$HOME/Library/Caches/")
            echo "ERROR: Refusing to delete entire Caches directory"
            return 1
            ;;
        "$HOME/Library" | "$HOME/Library/")
            echo "ERROR: Refusing to delete entire Library directory"
            return 1
            ;;
        "$HOME" | "$HOME/")
            echo "ERROR: Refusing to delete home directory"
            return 1
            ;;
        "/" | "")
            echo "ERROR: Refusing to delete root or empty path"
            return 1
            ;;
    esac
    
    # Check if path exists and remove it
    if [[ -e "$path" ]]; then
        echo "Removing $description: $path"
        if rm -rf -- "$path"; then
            echo "✓ $description removed"
            return 0
        else
            echo "ERROR: Failed to remove $description: $path"
            return 1
        fi
    elif [[ "$force_remove" == "--force-remove-if-missing" ]]; then
        echo "Attempting to remove $description (may not exist): $path"
        rm -rf -- "$path" 2>/dev/null || true
        echo "✓ $description removal attempted"
        return 0
    else
        echo "ℹ $description not found: $path"
        return 0
    fi
}