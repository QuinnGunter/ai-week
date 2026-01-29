#!/bin/bash

# Error out as early as possible and print all executed commands to make debugging easier, especially in the CI.
set -euxo pipefail

script_dir=$(cd -- "$(dirname -- "$0")" &>/dev/null && pwd)
build_dir="$script_dir/build"
source_root_dir="$script_dir/.."
workspace_dir="$source_root_dir/mmhmm.xcworkspace"
temp_dir="/tmp"
forwarded_arguments=()

# shellcheck disable=SC1091
source "$script_dir/script_helpers.sh"

function Help()
{
  local script_name
  script_name=$(basename "$0")

  echo
  bold "Run mmhmm project tests"
  echo
  bold "Usage: $script_name test_plan junit_report_file_name [--ci temp_dir] [...]"
  echo
  echo "Runs mmhmm project tests in release configuration and saves junit_report_file_name to"
  echo "the working directory."
  echo
  echo "--ci       Specify when executing in a CI pipeline. Providing 'temp_dir' is mandatory."
  echo "--help     This help text."
  echo "...        Remaining arguments are passed on to 'xcodebuild'."
  echo
}

if ! command -v xcbeautify &> /dev/null; then
    echo "This script requires 'xcbeautify'."
    echo "https://github.com/cpisciotta/xcbeautify/tree/main?tab=readme-ov-file#installation"
    exit 1
fi

if [ $# -lt 2 ]; then
    Help
    exit 1
fi

test_plan=$1
junit_report_file_name=$2
shift 2

while [ $# -gt 0 ]; do
    case $1 in
    --ci)
        echo "Building for CI environment..."
        # The BUILD_IS_CI environment variable is used in the mmhmm Xcode project.
        export BUILD_IS_CI="true"
        temp_dir=$2
        shift 2;;
    --help)
        Help
        exit 0
        ;;
    *)
        echo "Forwarding unknown argument: $1"
        forwarded_arguments+=("$1")
        shift;;
    esac
done

arguments=(
    test \
    -workspace "$workspace_dir" \
    -scheme mmhmm \
    -configuration Release \
    -verbose \
    -testPlan "$test_plan" \
    -derivedDataPath "/$temp_dir/DerivedData" \
    -skipPackagePluginValidation \
    GCC_GENERATE_DEBUGGING_SYMBOLS=NO \
    BUILD_DIR="$build_dir" \
    SWIFT_ACTIVE_COMPILATION_CONDITIONS="\$(inherited) TEST"
)

# The following flags are required to make building in a CI environment more robust:
# -scmProvider system
#   Don't use Xcode's SCM provider credentials, but the system Git's credentials.
# -clonedSourcePackagesDirPath
#   Download packages into the build directory instead of some random derived data directory.
# -disableAutomaticPackageResolution
#   Build the resolved package commit checked into git, don't resolve to the newest available package commit matching the project's package requirements.
ci_only_arguments=(
    -scmProvider system \
    -clonedSourcePackagesDirPath "$build_dir" \
    -disableAutomaticPackageResolution
)

xcbeautify_arguments=(
    --preserve-unbeautified
    --report junit
    --report-path .
    --junit-report-filename "$junit_report_file_name"
)

xcbeautify_ci_only_arguments=(
    --renderer azure-devops-pipelines
)

if [ -n "${BUILD_IS_CI:-}" ] && [ "$BUILD_IS_CI" = true ]; then
    arguments+=("${ci_only_arguments[@]}")
    xcbeautify_arguments+=("${xcbeautify_ci_only_arguments[@]}")
fi

# Run tests with some command line idiosyncrasis:
# - Extra verbose expansion of potentially empty `forwarded_arguments` array to avoid an `unbound variable` error because of `set -u`.
# - Follow xcbeautify usage suggestions, see https://github.com/cpisciotta/xcbeautify/blob/main/README.md#usage
set -o pipefail && 
    NSUnbufferedIO=YES \
    xcodebuild \
    "${arguments[@]}" \
    "${forwarded_arguments[@]+"${forwarded_arguments[@]}"}" 2>&1 |
    xcbeautify \
    "${xcbeautify_arguments[@]}"
