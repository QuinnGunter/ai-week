#!/bin/bash

script_dir=$( cd -- "$( dirname -- "$0" )" &> /dev/null && pwd )

# shellcheck disable=SC1091
source "$script_dir/script_helpers.sh"

# Must match one of `WebApp.WebAppType.rawValue`s.
supported_web_apps=(
    "camera"
    "creator"
    "stacks"
    "screenRecorder"
)
supported_web_apps_string=$(IFS='|'; echo "${supported_web_apps[*]}")
info_plist_web_app_key="InitialWebApp"

function Help()
{
  local script_name
  script_name=$(basename "$0")

  echo
  bold "Creates web app aware DMG installers with snp.sh"
  echo
  echo "See snp.sh for instructions on forwarded arguments."
  echo
  bold "$script_name dmg_name web_app product_name --track [engineering|test|beta|alpha|production] [--appleauth keychain_profile] [--version version] [--ci]"
  echo
  echo "dmg_name      The name of the DMG installer."
  echo "web_app       The web app to build the DMG installer for. One of [$supported_web_apps_string]."
  echo
}

# Error out as early as possible to make debugging easier.
set -euo pipefail

for arg in "$@"; do
  if [[ "$arg" == "--ci" ]]; then
    set -x    
    break
  fi
done

if [ $# -lt 3 ]; then
    Help
    exit 1
fi

dmg_file_name=$1
web_app=$2
product_name=$3
shift 2 # don't shift past product_name, since it is still required by snp.sh

app_bundle_name="$product_name.app"
info_plist_path="$app_bundle_name/Contents/Info.plist"

if [[ " ${supported_web_apps[*]} " =~ [[:space:]]${web_app}[[:space:]] ]]; then
  echo "Setting web app: $web_app."
  plutil -replace "$info_plist_web_app_key" -string "$web_app" "$info_plist_path"
else
  bail "Web app is not supported: $web_app"
fi

"$script_dir"/snp.sh "$@" --create-dmg --dmg-name "$dmg_file_name"
