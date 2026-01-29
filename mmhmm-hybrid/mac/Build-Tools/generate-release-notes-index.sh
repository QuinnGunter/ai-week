#!/bin/bash

# generate-release-notes-index-jq.sh
#
# Simplified version using jq instead of Python for JSON processing
# Generates a comprehensive release index page that lists all versions
# for all release tracks and platforms from Azure Storage.

set -euo pipefail

# Default values
default_container="release"
default_output="releases.html"

# Parse command line arguments
storage_account="${1:-${AZURE_STORAGE_ACCOUNT:-}}"
container_name="${2:-${AZURE_STORAGE_CONTAINER:-$default_container}}"
output_file="${3:-$default_output}"

# Validate required parameters
if [[ -z "$storage_account" ]]; then
    echo "❌ Error: Azure storage account name is required"
    echo "Usage: $0 [storage_account] [container_name] [output_file]"
    echo "Or set AZURE_STORAGE_ACCOUNT environment variable"
    exit 1
fi

# Check if jq is available
if ! command -v jq >/dev/null 2>&1; then
    echo "❌ Error: jq is required but not installed"
    echo "Install with: brew install jq (on macOS) or apt-get install jq (on Ubuntu)"
    exit 1
fi

# Function to run az storage commands with appropriate auth (same as original)
run_az_storage() {
    local exit_code
    echo "🔧 Executing Azure Storage command: az storage $*" >&2
    
    if [[ -n "${AZURE_STORAGE_KEY:-}" ]]; then
        AZURE_STORAGE_KEY=$(echo -n "$AZURE_STORAGE_KEY" | tr -d '[:space:]')
        az storage "$@" --account-key "$AZURE_STORAGE_KEY"
        exit_code=$?
    else
        if ! az account show >/dev/null 2>&1; then
            echo "❌ Error: Not logged in to Azure CLI"
            echo "Please run: az login"
            echo "Or set AZURE_STORAGE_KEY environment variable"
            exit 1
        fi
        az storage "$@" --auth-mode login
        exit_code=$?
    fi
    
    return $exit_code
}

echo "🔍 Generating release index..."
echo "Storage Account: $storage_account"
echo "Container: $container_name"
echo "Output File: $output_file"

# Set up cleanup for temporary files
trap 'rm -f releases_raw.json processed_releases.json' EXIT

echo "📡 Fetching release information from Azure Storage..."

# Test the connection
echo "🧪 Testing Azure Storage connection..."
if ! run_az_storage container show --name "$container_name" --account-name "$storage_account" > /dev/null; then
    echo "❌ Failed to connect to Azure Storage container"
    exit 1
fi
echo "✅ Azure Storage connection test successful"

# Get only release-notes.html files from storage (much more efficient)
echo "🔍 Listing release-notes.html files with prefix 'release/'..."
echo "🔧 Debug: Filtering for release-notes.html files only"

# Use --only-show-errors to prevent warnings from contaminating JSON output
if run_az_storage blob list \
  --container-name "$container_name" \
  --account-name "$storage_account" \
  --prefix "release/" \
  --query "[?ends_with(name, \`release-notes.html\`)].{name:name, lastModified:properties.lastModified, contentLength:properties.contentLength, contentType:properties.contentType}" \
  --output json \
  --only-show-errors > releases_raw.json; then
    echo "✅ Azure CLI command completed successfully"
    
    # Show detailed debugging info about the response
    echo "🔍 Response debugging information:"
    echo "   File size: $(wc -c < releases_raw.json 2>/dev/null || echo 0) bytes"
    echo "   Line count: $(wc -l < releases_raw.json 2>/dev/null || echo 0) lines"
    echo "   First 20 characters (with escape sequences):"
    head -c 20 releases_raw.json | cat -v || echo "No output to show"
    echo ""
    echo "   First 20 lines:"
    head -20 releases_raw.json || echo "No output to show"
    echo ""
else
    echo "❌ Failed to list blobs from Azure Storage"
    echo "🔍 Full error output:"
    cat releases_raw.json
    echo "🔍 File size: $(wc -c < releases_raw.json 2>/dev/null || echo 0) bytes"
    exit 1
fi

# Validate JSON
if [[ ! -s "releases_raw.json" ]]; then
    echo "❌ No data received from Azure Storage blob list"
    echo "🔍 File exists: $(test -f releases_raw.json && echo "Yes" || echo "No")"
    echo "🔍 File size: $(wc -c < releases_raw.json 2>/dev/null || echo 0) bytes"
    exit 1
fi

echo "🔍 Validating JSON format..."
echo "📊 Raw response size: $(wc -c < releases_raw.json) bytes"
echo "📊 Raw response lines: $(wc -l < releases_raw.json) lines"

if ! jq empty releases_raw.json 2>/dev/null; then
    echo "❌ Invalid JSON received from Azure Storage"
    echo "🔍 JSON validation error details:"
    jq empty releases_raw.json 2>&1 || true
    echo ""
    echo "🔍 Character-level analysis around the error:"
    echo "   First 50 characters with visible control chars:"
    head -c 50 releases_raw.json | cat -A || true
    echo ""
    echo "   Hex dump of first 32 bytes:"
    head -c 32 releases_raw.json | xxd || head -c 32 releases_raw.json | od -x || true
    echo ""
    echo "🔍 First 10 lines of received data:"
    head -10 releases_raw.json
    echo ""
    echo "🔍 Last 10 lines of received data:"
    tail -10 releases_raw.json
    echo ""
    echo "🔍 Checking for common issues:"
    if grep -q "ERROR\|error\|Error" releases_raw.json; then
        echo "   • Found error messages in response"
        grep -n "ERROR\|error\|Error" releases_raw.json || true
    fi
    if ! head -1 releases_raw.json | grep -q "^\["; then
        echo "   • Response does not start with '[' (not a JSON array)"
    fi
    if ! tail -1 releases_raw.json | grep -q "\]$"; then
        echo "   • Response does not end with ']' (incomplete JSON array)"
    fi
    exit 1
fi

blob_count=$(jq 'length' releases_raw.json)
echo "✅ Successfully retrieved blob list ($blob_count items)"

# Process releases using jq
echo "📊 Processing release data with jq..."

# Extract and organize releases using jq
base_url="https://${storage_account}.blob.core.windows.net/${container_name}/"

jq -r --arg base_url "$base_url" '
# Define track order priority
def track_priority:
  if . == "prod" then 0
  elif . == "beta" then 1
  elif . == "alpha" then 2
  elif . == "qa" then 3
  elif . == "test" then 4
  elif . == "engineering" then 5
  else 99 end;

# Process release notes files and extract components
[
  .[] | 
  # No need to filter since we already filtered at Azure CLI level
  {
    name: .name,
    lastModified: .lastModified,
    contentLength: .contentLength,
    contentType: .contentType,
    components: (.name | capture("^release/(?<platform>mac|windows)/(?<track>[^/]+)/(?<version>[^/]+)/"))
  } |
  {
    platform: .components.platform,
    track: .components.track, 
    version: .components.version,
    lastModified: .lastModified,
    contentLength: .contentLength,
    contentType: .contentType,
    # Extract timestamp from version if it exists (pattern: _XXXXXXXXXX or -XXXXXXXXXX)
    timestamp: (if (.components.version | test("[-_][0-9]{10}$")) 
                then (.components.version | capture("[-_](?<ts>[0-9]{10})$").ts | tonumber)
                else 0 end),
    url: ($base_url + .name),
    track_priority: (.track | track_priority)
  }
] |
# Group by platform and track
group_by(.platform, .track) |
map({
  platform: .[0].platform,
  track: .[0].track,
  track_priority: .[0].track_priority,
  releases: (sort_by(.timestamp) | reverse)  # Sort by timestamp, newest first
}) |
# Convert to the structure we need for HTML generation
{
  total_releases: (map(.releases | length) | add // 0),
  platforms: (map(.platform) | unique),
  tracks: (map(.track) | unique),
  data: group_by(.platform) | map({
    platform: .[0].platform,
    tracks: (sort_by(.track_priority) | reverse | map({track: .track, releases: .releases}))
  })
}
' releases_raw.json > processed_releases.json

echo "✅ Processed releases using jq"

# Generate HTML using the processed JSON
current_time=$(date -u '+%Y-%m-%d %H:%M UTC')
total_releases=$(jq -r '.total_releases' processed_releases.json)
platform_count=$(jq -r '.platforms | length' processed_releases.json)
track_count=$(jq -r '.tracks | length' processed_releases.json)

echo "📈 Found $total_releases releases across $platform_count platforms and $track_count tracks"

# Generate HTML header
cat > "$output_file" << EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>mmhmm Releases</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
        }
        .header {
            background-color: #fff;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 30px;
            text-align: center;
        }
        .platform-section {
            background-color: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        .platform-title {
            color: #0066cc;
            border-bottom: 2px solid #0066cc;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .track-section {
            margin-bottom: 25px;
        }
        .track-title {
            color: #333;
            background-color: #f0f8ff;
            padding: 10px 15px;
            border-radius: 4px;
            margin-bottom: 15px;
            border-left: 4px solid #0066cc;
        }
        .releases-grid {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .release-item {
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            padding: 15px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            transition: box-shadow 0.2s, transform 0.2s;
            background-color: #fafafa;
        }
        .release-item:hover {
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transform: translateY(-1px);
            background-color: #fff;
        }
        .release-info {
            flex: 1;
            display: flex;
            flex-direction: column;
        }
        .release-version {
            font-weight: bold;
            color: #0066cc;
            font-size: 16px;
            margin-bottom: 4px;
        }
        .release-date {
            color: #666;
            font-size: 14px;
            margin: 0;
        }
        .release-link {
            display: inline-block;
            background-color: #0066cc;
            color: white;
            padding: 8px 16px;
            text-decoration: none;
            border-radius: 4px;
            font-size: 14px;
            transition: background-color 0.2s;
        }
        .release-link:hover {
            background-color: #0052a3;
            text-decoration: none;
        }
        .track-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .track-prod { background-color: #d4edda; color: #155724; }
        .track-beta { background-color: #cce5ff; color: #004085; }
        .track-alpha { background-color: #fff3cd; color: #856404; }
        .track-test { background-color: #f8d7da; color: #721c24; }
        .track-qa { background-color: #e2e3e5; color: #383d41; }
        .track-engineering { background-color: #d1ecf1; color: #0c5460; }
        .summary-stats {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 20px;
            text-align: center;
        }
        .platform-icon {
            font-size: 24px;
            margin-right: 10px;
        }
        .navigation {
            background-color: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        .navigation h3 {
            margin-top: 0;
            margin-bottom: 15px;
            color: #333;
            font-size: 18px;
        }
        .nav-section {
            margin-bottom: 15px;
        }
        .nav-section:last-child {
            margin-bottom: 0;
        }
        .nav-platform {
            font-weight: bold;
            color: #0066cc;
            margin-bottom: 8px;
            font-size: 16px;
        }
        .nav-tracks {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-left: 20px;
        }
        .nav-link {
            display: inline-block;
            padding: 4px 12px;
            background-color: #f0f8ff;
            color: #0066cc;
            text-decoration: none;
            border-radius: 16px;
            font-size: 13px;
            border: 1px solid #e0e0e0;
            transition: all 0.2s;
        }
        .nav-link:hover {
            background-color: #0066cc;
            color: white;
            text-decoration: none;
            transform: translateY(-1px);
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Airtime Releases</h1>
        <p>Release index for all platforms and tracks</p>
        <p><strong>Last Updated:</strong> $current_time</p>
    </div>
    
    <div class="summary-stats">
        <strong>Total Releases:</strong> $total_releases | 
        <strong>Platforms:</strong> $platform_count | 
        <strong>Tracks:</strong> $track_count
    </div>
EOF

# Generate navigation section
{
echo '    <div class="navigation">'

jq -r '
.data[] |
. as $platform_data |
"        <div class=\"nav-section\">
            <div class=\"nav-platform\">" + 
            (if $platform_data.platform == "mac" then "🍎" 
             elif $platform_data.platform == "windows" then "🪟" 
             else "💻" end) + 
            " " + ($platform_data.platform | ascii_downcase | . as $str | ($str[0:1] | ascii_upcase) + $str[1:]) + "</div>
            <div class=\"nav-tracks\">" +
                ($platform_data.tracks | map(
                    "<a href=\"#" + $platform_data.platform + "-" + .track + "\" class=\"nav-link\">" + 
                    (.track | ascii_upcase) + " (" + (.releases | length | tostring) + ")</a>"
                ) | join("")) +
            "</div>
        </div>"
' processed_releases.json

echo '    </div>'
} >> "$output_file"

# Generate platform sections using jq
jq -r '
.data[] |
  . as $platform_data |
  "    <div class=\"platform-section\" id=\"" + $platform_data.platform + "\">
        <h2 class=\"platform-title\">
            <span class=\"platform-icon\">" +
            (if $platform_data.platform == "mac" then "🍎"
             elif $platform_data.platform == "windows" then "🪟"
             else "💻" end) +
            "</span>
            " + ($platform_data.platform | ascii_downcase | . as $str | ($str[0:1] | ascii_upcase) + $str[1:]) + " Releases
        </h2>" +
        (
            $platform_data.tracks | map(
                "        <div class=\"track-section\" id=\"" + $platform_data.platform + "-" + .track + "\">
            <h3 class=\"track-title\">
                <span class=\"track-badge track-" + .track + "\">" + (.track | ascii_upcase) + "</span>
                " + (.releases | length | tostring) + " releases
            </h3>
            <div class=\"releases-grid\">" +
                (
                    .releases | map(
                        "                <div class=\"release-item\">
                    <div class=\"release-info\">
                        <div class=\"release-version\">" + .version + "</div>
                        <div class=\"release-date\">Released: " +
                        (if .timestamp > 0
                         then (.timestamp | strftime("%Y-%m-%d %H:%M UTC"))
                         else "Unknown" end) +
                        "</div>
                    </div>
                    <a href=\"" + .url + "\" class=\"release-link\" target=\"_blank\">
                        View Release Notes
                    </a>
                </div>"
                    ) | join("")
                ) +
            "            </div>
        </div>"
            ) | join("")
        ) +
    "    </div>"
' processed_releases.json >> "$output_file"

# Close HTML
cat >> "$output_file" << 'EOF'
</body>
</html>
EOF

echo "✅ Release index generated successfully!"
echo "📄 Output file: $output_file"
echo "📊 File size: $(du -h "$output_file" | cut -f1)"

if command -v grep >/dev/null 2>&1; then
    echo ""
    echo "📋 Release Summary:"
    grep -o "Total Releases:</strong> [0-9]*" "$output_file" | head -1 || echo "No releases found"
fi
