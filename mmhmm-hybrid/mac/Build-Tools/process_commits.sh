#!/bin/bash

script_dir=$( cd -- "$( dirname -- "$0" )" &> /dev/null && pwd )

# shellcheck disable=SC1091
source "$script_dir/script_helpers.sh"

valid_tracks=("prod" "beta" "alpha" "test" "qa" "uat" "engineering")

show_help() {
  echo
  echo "This script collects commit messages between tag_name and HEAD, writes release"
  echo "notes containing hyper-linked commit messages and build product downloadsto"
  echo "a HTML file, extracts issue numbers in the form \"(#1234)\" at the end of messages,"
  echo "and posts a comment \"Availability since \<version_string\>\" to each issue" 
  echo "only if such a comment does not already exist for the specific release track."
  echo
  echo "This uses the GitHub CLI (gh)."
  echo
  bold "Usage: $(basename "$0") tag_name output_file version_string release_track [storage_base_url]"
  echo
  echo "Arguments:"
  echo "  tag_name         Git tag to compare from"
  echo "  output_file      File to write release notes to"
  echo "  version_string   Version string to comment on issues"
  echo "  release_track    Release track, one of [${valid_tracks[*]}] (production accepted as alias for prod)"
  echo "  storage_base_url Optional: Base URL for download links (Azure Storage base URL)"
  echo
  echo "Tag Validation Requirements:"
  echo "  • Tag must exist in the repository"
  echo "  • Tag must follow pattern: release/(mac|windows)/(prod|beta|alpha|test|qa|uat|engineering)/.*"
  echo "  • Release track must match the provided release_track argument"
  echo "  • Tag creation date must be within the last 6 months"
  echo
  echo "Examples:"
  echo "  $(basename "$0") release/mac/prod/1.2.3 commits.html 1.2.4 prod"
  echo "  $(basename "$0") release/mac/prod/1.2.3 commits.html 1.2.4 prod https://storage.account.blob.core.windows.net/container"
  exit 0
}

# Show help if requested
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
  show_help
fi

# Validate inputs
if [[ -z "$1" || -z "$2" || -z "$3" || -z "$4" ]]; then
  echo "Error: Missing required arguments."
  show_help
fi

# inputs
tag_name="$1"
output_file="$2"
version_string="$3"
release_track="$4"
storage_base_url="$5"  # Optional argument

# Normalize release_track: treat "production" the same as "prod"
if [[ "$release_track" == "production" ]]; then
  release_track="prod"
fi

# Extract build_version (UTC timestamp) from the end of version_string if present
# Example: "2.2.0-1756301505" -> "1756301505" or "2.2.0.1" -> ""
if [[ "$version_string" =~ -([0-9]+)$ ]]; then
  build_version="${BASH_REMATCH[1]}"
  echo "✓ Extracted build version: $build_version from $version_string"
else
  build_version=""
  echo "✓ No UTC timestamp found in version string: $version_string (using version as-is)"
fi

# Validate release_track
track_found=false
for track in "${valid_tracks[@]}"; do
  if [[ "$release_track" == "$track" ]]; then
    track_found=true
    break
  fi
done

if [[ "$track_found" == false ]]; then
  bail "Invalid release_track '$release_track'."
fi

# Validate tag_name exists in the repository
if ! git rev-parse --verify "$tag_name" >/dev/null 2>&1; then
  bail "Tag '$tag_name' does not exist in the repository."
fi

# Validate tag_name follows the pattern release/<platform>/<release_track>/<version>
# Expected pattern: release/(mac|windows)/(prod|beta|alpha|test|qa|uat|engineering)/.*
tag_pattern="^release/(mac|windows)/(prod|beta|alpha|test|qa|uat|engineering)/.+"
if [[ ! "$tag_name" =~ $tag_pattern ]]; then
  bail "Tag '$tag_name' does not follow the required pattern: release/<platform>/<release_track>/<version>"
fi

# Extract platform and track from tag_name for additional validation
tag_platform=$(echo "$tag_name" | cut -d'/' -f2)
tag_track=$(echo "$tag_name" | cut -d'/' -f3)

# Validate that Mac builds require UTC timestamp in version_string
if [[ "$tag_platform" == "mac" && -z "$build_version" ]]; then
  bail "Mac platform requires UTC timestamp in version_string (e.g., '2.2.0-1756301505'), but got '$version_string'"
fi

# Validate that the tag's release_track matches the provided release_track argument
if [[ "$tag_track" != "$release_track" ]]; then
  bail "Tag release track '$tag_track' does not match provided release_track '$release_track'."
fi

echo "✓ Tag validation passed: $tag_name (platform: $tag_platform, track: $tag_track)"

# Validate tag creation date is not older than 6 months
tag_date=$(git log -1 --format=%ct "$tag_name" 2>/dev/null)
if [[ -z "$tag_date" ]]; then
  bail "Unable to determine creation date for tag '$tag_name'."
fi

# Calculate 6 months ago in seconds since epoch
# Using 180 days as approximation for 6 months (6 * 30 days)
six_months_ago=$(($(date +%s) - (180 * 24 * 60 * 60)))

if [[ "$tag_date" -lt "$six_months_ago" ]]; then
  tag_date_readable=$(date -r "$tag_date" "+%Y-%m-%d")
  six_months_ago_readable=$(date -r "$six_months_ago" "+%Y-%m-%d")
  bail "Tag '$tag_name' creation date ($tag_date_readable) is older than 6 months (cutoff: $six_months_ago_readable)."
fi

echo "✓ Tag age validation passed: $tag_name is within 6 months"

# get all commits between the tag and HEAD (exclude merge commits)
commits=$(git log --no-merges --pretty=format:"%H" "${tag_name}..HEAD")

# Filter commits based on platform and message prefix
filter_commits_by_platform() {
  local platform="$1"
  local filtered_commits=""
  
  for commit in $commits; do
    commit_msg=$(git log -1 --pretty=%s "$commit")
    
    # Extract prefix if it exists (pattern: [Something] at start of message)
    prefix=$(echo "$commit_msg" | grep -oE '^\[[^]]+\]' | tr -d '[]' | tr '[:upper:]' '[:lower:]')
    
    # Determine if commit should be included based on platform and prefix
    if [[ "$platform" == "mac" && ("$prefix" == "win" || "$prefix" == "windows") ]]; then
      # Exclude windows-specific commits from mac builds
      echo "- $commit_msg ($prefix prefix)" >&2
    elif [[ "$platform" == "windows" && "$prefix" == "mac" ]]; then
      # Exclude mac-specific commits from windows builds
      echo "- $commit_msg ($prefix prefix)" >&2
    else
      # Include all other commits
      filtered_commits="$filtered_commits $commit"
      echo "✓ $commit_msg ($prefix prefix)" >&2
    fi
  done
  
  echo "$filtered_commits"
}

# Filter commits based on tag platform
echo "Filtering commits for platform: $tag_platform ..."
commits=$(filter_commits_by_platform "$tag_platform")
echo "Filtered $(echo "$commits" | wc -w) commits for $tag_platform platform."

# function to extract issue number at end of commit message surrounded by brackets
extract_issue() {
  echo "$1" | grep -oE '\(#([0-9]+)\)$' | grep -oE '[0-9]+'
}

# get owner and repo info
repo_url=$(git config --get remote.origin.url)
owner=$(basename "$(dirname "$repo_url")")
repo=$(basename -s .git "$repo_url")

# write commit messages as proper HTML file
echo "Writing HTML file to $output_file..."

# Generate HTML header
cat > "$output_file" << EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Release Notes - $version_string ($release_track)</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
        }
        .header {
            background-color: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        .commits {
            background-color: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .commit-item {
            padding: 8px 0;
            border-bottom: 1px solid #eee;
        }
        .commit-item:last-child {
            border-bottom: none;
        }
        .commit-item a {
            color: #0066cc;
            text-decoration: none;
        }
        .commit-item a:hover {
            text-decoration: underline;
        }
        .no-issue {
            color: #666;
        }
        .platform-badge {
            display: inline-block;
            background-color: #e1f5fe;
            color: #0277bd;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
            margin-right: 10px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Release Notes</h1>
        <p><strong>Version:</strong> $version_string</p>
        <p><strong>Release Track:</strong> $release_track</p>
        <p><strong>Platform:</strong> $tag_platform</p>
        <p><strong>Generated:</strong> $(date)</p>
    </div>
    <div class="commits">
      <h2>Changes Since Version $(echo "$tag_name" | cut -d'/' -f4) $tag_track</h2>
EOF

# Add each commit as a proper HTML list item
for commit in $commits; do
  commit_msg=$(git log -1 --pretty=%s "$commit")
  issue_num=$(extract_issue "$commit_msg")
  
  if [[ -n "$issue_num" ]]; then
    # Create HTML link to GitHub issue
    {
      echo "        <div class=\"commit-item\">"
      echo "            <a href=\"https://github.com/$owner/$repo/issues/$issue_num\" target=\"_blank\">$commit_msg</a>"
      echo "        </div>"
    } >> "$output_file"
  else
    # No issue number found, just output the commit message as plain text
    {
      echo "        <div class=\"commit-item\">"
      echo "            <span class=\"no-issue\">$commit_msg</span>"
      echo "        </div>"
    } >> "$output_file"
  fi
done

# Close HTML document with optional downloads section
if [[ -n "$storage_base_url" ]]; then
  # Add downloads section before closing the HTML
  cat >> "$output_file" << EOF
    </div>
    <div class="downloads">
        <h2>Downloads</h2>
        <style>
            .downloads {
                background-color: #fff;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                margin-top: 20px;
            }
            .download-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 15px;
                margin-top: 15px;
            }
            .download-item {
                border: 1px solid #e0e0e0;
                border-radius: 6px;
                padding: 15px;
                text-align: center;
                transition: box-shadow 0.2s;
            }
            .download-item:hover {
                box-shadow: 0 4px 8px rgba(0,0,0,0.15);
            }
            .download-button {
                display: inline-block;
                background-color: #0066cc;
                color: white !important;
                padding: 10px 20px;
                text-decoration: none;
                border-radius: 4px;
                font-weight: bold;
                transition: background-color 0.2s;
            }
            .download-button:hover {
                background-color: #0052a3;
                text-decoration: none;
            }
            .download-size {
                font-size: 12px;
                color: #666;
                margin-top: 5px;
            }
        </style>
        <div class="download-grid">
EOF

  # Determine the product names based on platform
  if [[ "$tag_platform" == "mac" ]]; then
    if [[ "$release_track" == "prod" ]]; then
      marketing_version=$(echo "$version_string" | cut -d'-' -f1)
      zip_file_name="Airtime_${marketing_version}.zip"
    else
      zip_file_name="Airtime_${release_track}_${build_version}.zip"
    fi

    cat >> "$output_file" << EOF
            <div class="download-item">
                <h3>App Bundle Archive</h3>
                <a href="$storage_base_url/release/$tag_platform/$release_track/$zip_file_name" class="download-button" target="_blank">
                    Download ZIP
                </a>
            </div>
            <div class="download-item">
                <h3>Airtime Vanilla Installer</h3>
                <a href="$storage_base_url/release/$tag_platform/$release_track/$version_string/Airtime.dmg" class="download-button" target="_blank">
                    Download DMG
                </a>
            </div>
            <div class="download-item">
                <h3>Airtime Camera Installer</h3>
                <a href="$storage_base_url/release/$tag_platform/$release_track/$version_string/AirtimeCamera.dmg" class="download-button" target="_blank">
                    Download DMG
                </a>
            </div>
            <div class="download-item">
                <h3>Airtime Creator Installer</h3>
                <a href="$storage_base_url/release/$tag_platform/$release_track/$version_string/AirtimeCreator.dmg" class="download-button" target="_blank">
                    Download DMG
                </a>
            </div>
            <div class="download-item">
                <h3>Airtime Screen Recorder Installer</h3>
                <a href="$storage_base_url/release/$tag_platform/$release_track/$version_string/AirtimeScreenRecorder.dmg" class="download-button" target="_blank">
                    Download DMG
                </a>
            </div>
            <div class="download-item">
                <h3>Airtime Stacks Installer</h3>
                <a href="$storage_base_url/release/$tag_platform/$release_track/$version_string/AirtimeStacks.dmg" class="download-button" target="_blank">
                    Download DMG
                </a>
            </div>
EOF
  elif [[ "$tag_platform" == "windows" ]]; then
    cat >> "$output_file" << EOF
            <div class="download-item">
                <h3>Airtime</h3>
                <a href="$storage_base_url/release/$tag_platform/$release_track/$version_string/Airtime.msi" class="download-button" target="_blank">
                    Download MSI
                </a>
                <div class="download-size">Airtime.msi</div>
            </div>
            <div class="download-item">
                <h3>Airtime Camera</h3>
                <a href="$storage_base_url/release/$tag_platform/$release_track/$version_string/AirtimeCamera.msi" class="download-button" target="_blank">
                    Download MSI
                </a>
                <div class="download-size">AirtimeCamera.msi</div>
            </div>
            <div class="download-item">
                <h3>Airtime Creator</h3>
                <a href="$storage_base_url/release/$tag_platform/$release_track/$version_string/AirtimeCreator.msi" class="download-button" target="_blank">
                    Download MSI
                </a>
                <div class="download-size">AirtimeCreator.msi</div>
            </div>
            <div class="download-item">
                <h3>Airtime Screen Recorder</h3>
                <a href="$storage_base_url/release/$tag_platform/$release_track/$version_string/AirtimeScreenRecorder.msi" class="download-button" target="_blank">
                    Download MSI
                </a>
                <div class="download-size">AirtimeScreenRecorder.msi</div>
            </div>
            <div class="download-item">
                <h3>Airtime Stacks</h3>
                <a href="$storage_base_url/release/$tag_platform/$release_track/$version_string/AirtimeStacks.msi" class="download-button" target="_blank">
                    Download MSI
                </a>
                <div class="download-size">AirtimeStacks.msi</div>
            </div>
EOF
  fi

  cat >> "$output_file" << EOF
        </div>
    </div>
</body>
</html>
EOF
else
  # Close HTML document without downloads
  cat >> "$output_file" << EOF
    </div>
</body>
</html>
EOF
fi

echo "✓ HTML file generated successfully: $output_file"
if [[ -n "$storage_base_url" ]]; then
  echo "✓ Download links included using base URL: $storage_base_url"
fi

# Exit early for engineering releases - no GitHub issue commenting needed
if [[ "$release_track" == "engineering" ]]; then
  echo "Engineering release detected - skipping GitHub issue comments"
  exit 0
fi

# Authenticate GitHub CLI if GITHUB_TOKEN is available
if [[ -n "${GITHUB_TOKEN:-}" ]]; then
  echo "Authenticating GitHub CLI..."
  echo "$GITHUB_TOKEN" | gh auth login --with-token
elif ! gh auth status >/dev/null 2>&1; then
  echo "Warning: GitHub CLI not authenticated. Skipping issue comments."
  echo "Set GITHUB_TOKEN environment variable to enable GitHub issue commenting."
  exit 0
fi

for commit in $commits; do
  commit_msg=$(git log -1 --pretty=%s "$commit")
  issue_num=$(extract_issue "$commit_msg")
  if [[ -n "$issue_num" ]]; then
    comment="Availability since $release_track $version_string"
    # check if issue already contains a comment matching pattern "Availability since <track> <some_version>"
    if existing=$(gh api "repos/$owner/$repo/issues/$issue_num/comments" --jq ".[] | select(.body | test(\"Availability since $release_track [^\\\\s]+\")) | .id" 2>/dev/null); then
      if [[ -z "$existing" ]]; then
        # echo "Posting comment to issue #$issue_num in $owner/$repo: $comment"
        if gh issue comment "$issue_num" --body "$comment" --repo "$owner/$repo" 2>/dev/null; then
          echo "✓ Posted comment to issue #$issue_num in $owner/$repo"
        else
          echo "⚠️  Failed to post comment to issue #$issue_num in $owner/$repo (may be a permissions issue)"
        fi
      else
        echo "Skipping issue #$issue_num in $owner/$repo: comment already exists"
      fi
    else
      echo "⚠️  Failed to check existing comments for issue #$issue_num in $owner/$repo (may be a permissions issue)"
    fi
  fi
done
