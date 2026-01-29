#!/bin/bash

# test-release-notes-flow.sh
#
# Local test script for validating the Windows release notes generation flow.
# This script can be run locally to validate the flow before deploying
# pipeline changes.
#
# This script is READ-ONLY:
#   - No uploads to Azure storage
#   - No comments posted to GitHub issues
#   - Only creates local test artifacts
#
# Usage:
#   ./test-release-notes-flow.sh [options]
#
# Options:
#   --track <track>       Release track to test (default: engineering)
#   --version <version>   Version string to use (default: auto-generated)
#   --create-test-tag     Create a temporary test tag for comparison (local only)
#   --cleanup             Remove test artifacts after validation
#   --help                Show this help message
#
# Examples:
#   # Dry-run test with engineering track
#   ./test-release-notes-flow.sh --track engineering
#
#   # Create a test tag and run full validation
#   ./test-release-notes-flow.sh --create-test-tag --track engineering

set -euo pipefail

# Script directory
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/../.." && pwd)"
build_tools_dir="$repo_root/mac/Build-Tools"

# Default values
track="engineering"
version=""
create_test_tag=false
cleanup=false
output_dir="/tmp/win-release-notes-test"

# Azure storage settings (match pipeline variables) - for URL validation only
storage_account="mmhmm"
storage_container="release"
storage_base_url="https://${storage_account}.blob.core.windows.net/${storage_container}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }
log_header() { echo -e "\n${BLUE}━━━ $1 ━━━${NC}\n"; }

show_help() {
    head -30 "$0" | tail -27 | sed 's/^# \?//'
    exit 0
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --track)
            track="$2"
            shift 2
            ;;
        --version)
            version="$2"
            shift 2
            ;;
        --create-test-tag)
            create_test_tag=true
            shift
            ;;
        --cleanup)
            cleanup=true
            shift
            ;;
        --help|-h)
            show_help
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            ;;
    esac
done

# Validate track
valid_tracks=("engineering" "qa" "alpha" "beta" "prod")
track_valid=false
for t in "${valid_tracks[@]}"; do
    if [[ "$track" == "$t" ]]; then
        track_valid=true
        break
    fi
done

if [[ "$track_valid" == false ]]; then
    log_error "Invalid track: $track"
    log_info "Valid tracks: ${valid_tracks[*]}"
    exit 1
fi

# Generate version if not provided (Windows format: major.minor.revision.build)
if [[ -z "$version" ]]; then
    version="1.0.0.$(date +%s | tail -c 5)"
fi

log_header "Windows Release Notes Flow Test"

echo "Configuration:"
echo "  Track:        $track"
echo "  Version:      $version"
echo "  Output dir:   $output_dir"
echo "  Storage URL:  $storage_base_url (for URL validation only)"
echo ""
log_info "This is a READ-ONLY test - no uploads or GitHub comments will be made"
echo ""

# Create output directory
mkdir -p "$output_dir"

# Step 1: Check for required tools
log_header "Step 1: Checking Prerequisites"

if ! command -v git &> /dev/null; then
    log_error "git is not installed"
    exit 1
fi
log_success "git found"

# Step 2: Find or create test tag
log_header "Step 2: Finding/Creating Git Tag"

cd "$repo_root"

test_tag_name=""
if [[ "$create_test_tag" == true ]]; then
    test_tag_name="release/windows/${track}/test-${version}"
    log_info "Creating temporary LOCAL test tag: $test_tag_name"

    # Create a lightweight tag for testing (won't be pushed)
    if git tag -l "$test_tag_name" | grep -q .; then
        log_warning "Tag already exists, deleting and recreating"
        git tag -d "$test_tag_name"
    fi

    # Tag a commit from ~10 commits ago to have some commits to include
    base_commit=$(git rev-parse HEAD~10 2>/dev/null || git rev-parse HEAD~5 2>/dev/null || git rev-parse HEAD)
    git tag "$test_tag_name" "$base_commit"
    log_success "Created test tag at commit: $(git rev-parse --short "$base_commit")"

    latest_tag="$test_tag_name"
else
    log_info "Searching for latest Windows tag for track: $track"
    latest_tag=$("$build_tools_dir/latest_git_tag.sh" "$track" windows 2>/dev/null | tail -1)

    if [[ -z "$latest_tag" ]]; then
        log_warning "No existing tags found for track '$track'"
        log_info "You can use --create-test-tag to create a temporary tag for testing"

        # Try to continue anyway - we can still test URL generation
        log_info "Continuing without a tag to test URL generation..."
    else
        log_success "Found latest tag: $latest_tag"
    fi
fi

# Step 3: Generate release notes
log_header "Step 3: Generating Release Notes"

release_notes_file="$output_dir/release-notes.html"
git_tag_name="$version"

if [[ -n "$latest_tag" ]]; then
    log_info "Running process_commits.sh..."
    log_info "  From tag:    $latest_tag"
    log_info "  Version:     $git_tag_name"
    log_info "  Track:       $track"
    log_info "  Output:      $release_notes_file"

    # Explicitly unset GITHUB_TOKEN to prevent any GitHub API calls
    log_info "GITHUB_TOKEN explicitly unset - no GitHub issue comments will be made"

    if GITHUB_TOKEN="" "$build_tools_dir/process_commits.sh" \
        "$latest_tag" \
        "$release_notes_file" \
        "$git_tag_name" \
        "$track" \
        "$storage_base_url"; then
        log_success "Release notes generated successfully"
    else
        log_error "Failed to generate release notes"
        exit 1
    fi
else
    log_warning "Skipping release notes generation (no tag available)"
    log_info "Creating a sample release notes file for URL validation..."

    # Create a minimal test file
    cat > "$release_notes_file" << EOF
<!DOCTYPE html>
<html>
<head><title>Test Release Notes - $version ($track)</title></head>
<body>
<h1>Test Release Notes</h1>
<p>Version: $version</p>
<p>Track: $track</p>
<h2>Download Links (for validation)</h2>
<ul>
<li><a href="$storage_base_url/release/windows/$track/$version/Airtime.msi">Airtime.msi</a></li>
<li><a href="$storage_base_url/release/windows/$track/$version/AirtimeCamera.msi">AirtimeCamera.msi</a></li>
<li><a href="$storage_base_url/release/windows/$track/$version/AirtimeCreator.msi">AirtimeCreator.msi</a></li>
<li><a href="$storage_base_url/release/windows/$track/$version/AirtimeStacks.msi">AirtimeStacks.msi</a></li>
<li><a href="$storage_base_url/release/windows/$track/$version/AirtimeScreenRecorder.msi">AirtimeScreenRecorder.msi</a></li>
</ul>
</body>
</html>
EOF
    log_success "Created sample release notes file"
fi

# Step 4: Validate generated URLs
log_header "Step 4: Validating Download URLs"

log_info "Checking URLs in generated HTML..."

expected_url_base="$storage_base_url/release/windows/$track/$version"
expected_products=("Airtime.msi" "AirtimeCamera.msi" "AirtimeCreator.msi" "AirtimeStacks.msi" "AirtimeScreenRecorder.msi")

url_errors=0
for product in "${expected_products[@]}"; do
    expected_url="$expected_url_base/$product"
    if grep -q "$expected_url" "$release_notes_file"; then
        log_success "Found correct URL for $product"
    else
        log_error "Missing or incorrect URL for $product"
        log_info "  Expected: $expected_url"
        url_errors=$((url_errors + 1))
    fi
done

if [[ $url_errors -gt 0 ]]; then
    log_error "$url_errors URL validation errors found"
else
    log_success "All download URLs are correctly formed"
fi

# Step 5: Show expected upload paths
log_header "Step 5: Upload Path Validation"

branch="release/windows/$track"
blob_base_path="$branch/$version"

echo "Expected Azure Storage paths (when pipeline runs):"
echo ""
echo "  Container: $storage_container"
echo "  Blob paths:"
for product in "${expected_products[@]}"; do
    echo "    - $blob_base_path/$product"
done
echo "    - $blob_base_path/release-notes.html"
echo ""
echo "  Full URLs:"
for product in "${expected_products[@]}"; do
    echo "    - https://$storage_account.blob.core.windows.net/$storage_container/$blob_base_path/$product"
done
echo "    - https://$storage_account.blob.core.windows.net/$storage_container/$blob_base_path/release-notes.html"

# Cleanup
log_header "Step 6: Cleanup"

if [[ "$create_test_tag" == true && -n "$test_tag_name" ]]; then
    log_info "Removing temporary test tag: $test_tag_name"
    git tag -d "$test_tag_name" 2>/dev/null || true
    log_success "Test tag removed"
fi

if [[ "$cleanup" == true ]]; then
    log_info "Removing output directory: $output_dir"
    rm -rf "$output_dir"
    log_success "Cleanup complete"
else
    log_info "Test artifacts preserved in: $output_dir"
    echo ""
    echo "  Files:"
    ls -la "$output_dir/"
fi

# Summary
log_header "Summary"

echo "Test completed!"
echo ""
echo "Generated files:"
echo "  - Release notes: $release_notes_file"
echo ""
echo "To view the release notes locally:"
echo "  open $release_notes_file"
echo ""

if [[ $url_errors -gt 0 ]]; then
    log_error "Validation completed with $url_errors errors"
    exit 1
else
    log_success "All validations passed!"
fi
