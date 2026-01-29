#!/bin/bash

# cleanup.sh
# mmhmm hybrid application cleanup script
# Removes user defaults, caches, application support, and TCC permissions
# 
# Usage: ./cleanup.sh [--dry-run]
#   --dry-run    Show what would be removed without making changes

# Fail fast on errors and undefined variables
set -euo pipefail

script_dir=$( cd -- "$( dirname -- "$0" )" &> /dev/null && pwd )

# shellcheck disable=SC1091
source "$script_dir/../Build-Tools/script_helpers.sh"

# Check for dry-run mode
dry_run=false
if [[ "${1:-}" == "--dry-run" ]]; then
    dry_run=true
    echo "🔍 DRY RUN MODE - No changes will be made"
    echo
fi

# Define target paths
readonly app_id="app.mmhmm.hybrid"
readonly login_item_app_id="M3KUT44L48.app.mmhmm.hybrid.menu"
readonly app_support_dir="$HOME/Library/Application Support/mmhmm"
readonly login_item_app_container_dir="$HOME/Library/Containers/$login_item_app_id/Data"
readonly cache_dir="$HOME/Library/Caches/$app_id"

if [[ "$dry_run" == false ]]; then
    # Show what will be removed
    echo
    echo "This script will remove the following data:"
    echo "  - User defaults: $app_id"
    echo "  - User defaults: $login_item_app_id"
    echo "  - Application support: $app_support_dir"
    echo "  - Login item app container data folder: $login_item_app_container_dir"
    echo "  - Cache directory: $cache_dir"
    echo "  - TCC (privacy) database entries for: $app_id"
    echo "  - TCC (privacy) database entries for: $login_item_app_id"
    echo
    echo "Run with the --dry-run option to see what would be removed without making changes."
    echo
    askToContinueOrBail "Remove user defaults, caches, application support folder and TCC DB entries for $app_id and $login_item_app_id?"
    echo "Starting cleanup..."
fi

# Remove user defaults
if defaults read "$app_id" &>/dev/null; then
    if [[ "$dry_run" == true ]]; then
        echo "Would remove user defaults for $app_id..."
    else
        echo "Removing user defaults for $app_id..."
        defaults delete "$app_id"
        echo "✓ User defaults removed"
    fi
else
    echo "ℹ No user defaults found for $app_id"
fi

if defaults read "$login_item_app_id" &>/dev/null; then
    if [[ "$dry_run" == true ]]; then
        echo "Would remove user defaults for $login_item_app_id..."
    else
        echo "Removing user defaults for $login_item_app_id..."
        defaults delete "$login_item_app_id"
        echo "✓ User defaults removed"
    fi
else
    echo "ℹ No user defaults found for $login_item_app_id"
fi

# Remove application support and cache folders
if [[ "$dry_run" == true ]]; then
    echo "Would remove Application Support folder: $app_support_dir"
    echo "Would remove Cache folder: $cache_dir"
    echo "Would remove Login item app container data folder: $login_item_app_container_dir"
else
    remove_path "$app_support_dir" "Application Support folder"
    remove_path "$cache_dir" "Cache folder"
    remove_path "$login_item_app_container_dir" "Login item app container data folder"
fi

# Reset TCC (privacy) permissions
if [[ "$dry_run" == true ]]; then
    echo "Would reset TCC permissions for $app_id..."
    echo "Would reset TCC permissions for $login_item_app_id..."
else
    echo "Resetting TCC permissions for $app_id..."
    if tccutil reset All "$app_id" 2>/dev/null; then
        echo "✓ TCC permissions reset"
    else
        echo "⚠ TCC reset may have failed (this is normal if no permissions were set)"
    fi

    echo "Resetting TCC permissions for $login_item_app_id..."
    if tccutil reset All "$login_item_app_id" 2>/dev/null; then
        echo "✓ TCC permissions reset"
    else
        echo "⚠ TCC reset may have failed (this is normal if no permissions were set)"
    fi
fi

if [[ "$dry_run" == true ]]; then
    echo
    echo "🔍 Dry run completed - no changes were made"
else
    echo "✓ Cleanup completed successfully"
fi
