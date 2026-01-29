#!/bin/bash

# latest_git_tag.sh
#
# Finds the latest git tag for a given release track.
# This is used to determine the range of commits for release notes generation.
#
# Usage:
#   ./latest_git_tag.sh <track> [platform]
#
# Parameters:
#   track     - Release track (engineering, test, beta, alpha, production)
#   platform  - Platform (default: mac)
#
# Output:
#   Prints the latest git tag name to stdout, or empty string if none found
#

script_dir=$( cd -- "$( dirname -- "$0" )" &> /dev/null && pwd )

# shellcheck disable=SC1091
source "$script_dir/script_helpers.sh"

set -euo pipefail

# Parse command line arguments
track="${1:-}"
platform="${2:-mac}"

# Validate required parameters
if [[ -z "$track" ]]; then
    echo "Usage: $0 <track> [platform]"
    echo "Example: $0 production mac"
    bail "❌ Error: Release track is required"
fi

# Normalize track: "production" goes as "prod" in Git tags
if [[ "$track" == "production" ]]; then
  track="prod"
fi

echo "🔍 Finding latest git tag for track: $track (platform: $platform)" >&2

# Tags follow the pattern: release/{platform}/{track}/{version}
track_pattern="release/${platform}/${track}/"

echo "🏷️  Searching for tags matching pattern: ${track_pattern}*" >&2

# Get all tags matching the track pattern, sorted by creation date (newest first)
all_tags=$(git tag -l "${track_pattern}*" --sort=-creatordate)

if [[ -z "$all_tags" ]]; then
    echo "📭 No tags found for track $track" >&2
    latest_tag=""
else
    echo "📋 Found tags:" >&2
    echo "$all_tags" | head -5 >&2  # Show first 5 for debugging
    if [[ $(echo "$all_tags" | wc -l) -gt 5 ]]; then
        echo "   ... and $(( $(echo "$all_tags" | wc -l) - 5 )) more" >&2
    fi
    
    # Get the most recent tag (latest release)
    latest_tag=$(echo "$all_tags" | head -1)
fi

if [[ -z "$latest_tag" ]]; then
    echo "🆕 No tags found for track $track - using empty string" >&2
else
    echo "✅ Found latest tag: $latest_tag" >&2
fi

# Output the result
echo "$latest_tag"
