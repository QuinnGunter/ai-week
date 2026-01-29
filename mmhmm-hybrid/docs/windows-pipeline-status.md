# Windows Pipeline Status

Last updated: 2025-12-12

## Overview

This document tracks the status of the Windows release pipeline updates on the `feature/windows-release-notes` branch. The goal is to align the Windows pipeline with the Mac pipeline's staged approach (Build → Distribute → Update).

## Branch Changes

### Modified Files

| File | Changes |
|------|---------|
| `pipelines/templates/win-az-pipeline.yml` | Added release notes generation, version export for downstream stages, `distributeArtifacts` parameter for staged vs inline distribution |
| `pipelines/templates/win-branch-variables.yml` | Added `track` variable (separate from `appTrack`), `gitTagCreation`, and `releaseApproval` flags for each branch |
| `pipelines/templates/win-az-pipeline-distribute.yml` | **New file** - Standalone distribution stage with approval gates |
| `pipelines/win-build-release-installer-az-pipeline.yml` | **New file** - Main staged pipeline (Build → Distribute → Update) |

### New Files

| File | Purpose |
|------|---------|
| `pipelines/win/test-release-notes-flow.sh` | Local test script for validating release notes generation without uploads |

## Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  win-build-release-installer-az-pipeline.yml                    │
│  Trigger: release/windows/*                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │   Build     │───▶│  Distribute  │───▶│  Update Release  │   │
│  │   Stage     │    │    Stage     │    │     Index        │   │
│  └─────────────┘    └──────────────┘    └──────────────────┘   │
│        │                   │                     │              │
│        ▼                   ▼                     ▼              │
│  - Build MSIs        - Upload to Azure    - Regenerate         │
│  - Sign binaries     - Sentry symbols       releases.html      │
│  - Generate          - Create git tag                          │
│    release notes     - Approval gate                           │
│                        (beta/alpha/prod)                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Branch Variables

| Branch | appTrack | track | symbolsUpload | gitTagCreation | releaseApproval |
|--------|----------|-------|---------------|----------------|-----------------|
| `release/windows/prod` | prod | prod | ✓ | ✓ | ✓ |
| `release/windows/beta` | beta | beta | ✓ | ✓ | ✓ |
| `release/windows/alpha` | uat | alpha | ✓ | ✓ | ✓ |
| `release/windows/qa` | qa | qa | ✓ | ✓ | ✗ |
| `release/windows/engineering` | qa | engineering | ✗ | ✓ | ✗ |

Note: `appTrack` is used for CMake/MSBuild configuration. `track` is used for git tags and release notes.

## What Has Been Tested

### Local Testing (2025-12-12)

Using `pipelines/win/test-release-notes-flow.sh`:

| Test | Result | Notes |
|------|--------|-------|
| Release notes HTML generation | ✅ Pass | Generates valid HTML with commits and download links |
| Commit filtering by platform | ✅ Pass | `[Mac]` commits excluded, `[Windows]` and `[Common]` included |
| Download URL construction | ✅ Pass | URLs match expected Azure blob paths |
| Git tag lookup | ✅ Pass | `latest_git_tag.sh` correctly finds tags by track/platform |
| GitHub issue commenting | ✅ Skipped | Intentionally disabled for local testing |
| Engineering track behavior | ✅ Pass | Correctly skips GitHub comments for engineering releases |

### Test Command

```bash
./pipelines/win/test-release-notes-flow.sh --create-test-tag --track engineering
```

### Sample Output Validated

- Release notes HTML at `/tmp/win-release-notes-test/release-notes.html`
- Download URLs correctly point to: `https://mmhmm.blob.core.windows.net/release/release/windows/{track}/{version}/{product}.msi`
- Commit messages linked to GitHub issues

## What Has NOT Been Tested

| Component | Reason | How to Test |
|-----------|--------|-------------|
| Actual MSI building/signing | Requires Windows build agent | Run pipeline on `release/windows/engineering` |
| Azure storage uploads | Requires storage credentials | Run pipeline or use `az` CLI with PAT |
| Sentry symbol uploads | Requires build artifacts + Sentry token | Run full pipeline |
| Approval gates | Azure DevOps environment feature | Test on `alpha`/`beta`/`prod` branches |
| Git tag creation (remote) | Requires pipeline identity | Run pipeline |
| Release index update | Requires storage access | Run pipeline or test `generate-release-notes-index.sh` locally with PAT |

## Recommended Testing Plan

1. **First**: Push to `release/windows/engineering`
   - No approval required
   - No symbol uploads
   - Validates full build + distribute + update flow

2. **Second**: Test `release/windows/qa`
   - Validates symbol uploads to Sentry and Azure DevOps

3. **Third**: Test `release/windows/alpha`
   - Validates approval gate workflow

## Known Issues / Gaps

| Issue | Severity | Status |
|-------|----------|--------|
| `PublishSymbols@2` missing in distribute stage | Medium | Not yet added to `win-az-pipeline-distribute.yml` |
| Update stage missing PR exclusion condition | Low | Should add `ne(variables['Build.Reason'], 'PullRequest')` |
| Unused `.platform-badge` CSS in release notes | Low | Cosmetic only |

## Files Reference

### Release Notes Generation
- `mac/Build-Tools/process_commits.sh` - Main release notes generator (shared with Mac)
- `mac/Build-Tools/latest_git_tag.sh` - Finds latest tag for a track/platform

### Pipeline Templates
- `pipelines/templates/win-az-pipeline.yml` - Build job template
- `pipelines/templates/win-az-pipeline-distribute.yml` - Distribution job template
- `pipelines/templates/win-branch-variables.yml` - Branch-specific variables
- `pipelines/templates/x-az-pipeline-update-releases.yml` - Release index update (shared)
- `pipelines/templates/x-git-tag.yml` - Git tagging (shared)
