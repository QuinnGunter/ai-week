# Windows Release Notes Implementation

This document describes the changes made to align the Windows release pipeline with the Mac release pipeline, specifically for release notes generation and git tagging.

## Problem Statement

The Windows pipeline had a mismatch between `appTrack` (used for build configuration) and the git tag/storage paths for certain branches:

| Branch | appTrack | Git Tag Path | Search Path (before fix) |
|--------|----------|--------------|--------------------------|
| `release/windows/alpha` | `uat` | `release/windows/alpha/x.x.x.x` | `release/windows/uat/*` ❌ |
| `release/windows/engineering` | `qa` | `release/windows/engineering/x.x.x.x` | `release/windows/qa/*` ❌ |

This caused:
1. `latest_git_tag.sh` to search for tags in the wrong path
2. `process_commits.sh` to fail validation (tag track didn't match provided track)
3. Download URLs in release notes to point to wrong storage paths

## Solution: Option A - Separate `track` Variable

Added a new `track` variable that matches the branch path segment, independent of `appTrack`:

- `appTrack` → Used for build system (CMake/MSBuild configuration)
- `track` → Used for git tags and release notes (matches branch path)

## Files Changed

### 1. `pipelines/templates/win-branch-variables.yml`

Added new variables for each branch:
- `track` - matches branch path segment (e.g., `alpha` for `release/windows/alpha`)
- `gitTagCreation` - controls whether git tag is created
- `releaseApproval` - controls whether approval is required

```yaml
# Example: Alpha branch
${{ elseif eq(variables['Build.SourceBranch'], 'refs/heads/release/windows/alpha') }}:
  symbolsUpload: true
  appTrack: 'uat'           # For build system
  track: 'alpha'            # For git tags and release notes
  branch: 'release/windows/alpha'
  gitTagCreation: true
  releaseApproval: true
```

### 2. `pipelines/templates/win-az-pipeline.yml`

- Added `track` parameter with fallback to `appTrack`
- Updated release notes generation to use `track`:

```yaml
# Find latest git tag using track (not appTrack)
track="${{ parameters.track }}"
if [ -z "$track" ]; then
  track="${{ parameters.appTrack }}"
fi

latest_git_tag.sh $track windows
process_commits.sh ... "$(releaseTrack)" ...
```

### 3. `pipelines/win-build-release-installer-az-pipeline.yml`

- Now passes `track: ${{ variables.track }}` to build template
- Uses `gitTagCreation` and `releaseApproval` variables instead of hardcoded values

### 4. `pipelines/templates/win-az-pipeline-distribute.yml`

- Updated `track` parameter values to include `alpha` (was missing)

## Release Flow

### Stage 1: Build

1. Variables loaded from `win-branch-variables.yml`
2. App built with `appTrack` configuration (e.g., `uat` for alpha)
3. `latest_git_tag.sh` searches using `track` (e.g., `alpha`)
4. `process_commits.sh` generates release notes with correct `track`
5. Artifacts published including `ReleaseNotes/release-notes.html`

### Stage 2: Distribute

1. Waits for approval (if `releaseApproval: true`)
2. Downloads artifacts from Build stage
3. Uploads to Azure Storage using `$(branch)/$(gitTagName)` path
4. Uploads symbols to Sentry (if `symbolsUpload: true`)
5. Creates git tag (if `gitTagCreation: true`)

### Stage 3: Update Release Index

1. Scans Azure Storage for all `release-notes.html` files
2. Extracts platform/track/version from storage paths
3. Generates and uploads `releases.html` index page

## Git Tag Creation

Both Mac and Windows use the shared `x-git-tag.yml` template:

```bash
# Tag is constructed from branch name + version
build_source_branch="refs/heads/release/windows/alpha"
source_branch_full_name="release/windows/alpha"
tag_name="release/windows/alpha/1.2.3.4"

git tag -a "$tag_name" -m "..."
git push origin "$tag_name"
```

The tag path is **always derived from the branch name**, which is why `track` must match the branch path segment.

## Result

| Branch | appTrack | track | Git Tag Path | Search Path |
|--------|----------|-------|--------------|-------------|
| `release/windows/prod` | `prod` | `prod` | `release/windows/prod/x.x.x.x` | ✅ matches |
| `release/windows/beta` | `beta` | `beta` | `release/windows/beta/x.x.x.x` | ✅ matches |
| `release/windows/alpha` | `uat` | `alpha` | `release/windows/alpha/x.x.x.x` | ✅ matches |
| `release/windows/qa` | `qa` | `qa` | `release/windows/qa/x.x.x.x` | ✅ matches |
| `release/windows/engineering` | `qa` | `engineering` | `release/windows/engineering/x.x.x.x` | ✅ matches |

## Comparison with Mac

| Aspect | Mac | Windows |
|--------|-----|---------|
| Build config variable | `track` | `appTrack` |
| Git tag/release notes variable | `track` | `track` (new) |
| Git tag template | `x-git-tag.yml` | `x-git-tag.yml` |
| Version format | `2.1.0-1734012345` | `1.2.3.4` |
| Tag example | `release/mac/prod/2.1.0-1734012345` | `release/windows/prod/1.2.3.4` |

Both platforms now follow the same pattern for release notes generation and git tagging.
