#!/bin/bash

script_dir=$( cd -- "$( dirname -- "$0" )" &> /dev/null && pwd )

# shellcheck disable=SC1091
source "$script_dir/script_helpers.sh"

function Help()
{
  local script_name
  script_name=$(basename "$0")

  echo
  bold "Sign, Notarize, Staple & Package (optional) & Configure Sparkle."
  echo
  echo "The targeted app bundle is expected to be located in the same directory as this script."
  echo "Without any optional arguments, this script just signs the app bundle."
  echo
  bold "$script_name product_name --track [engineering|test|beta|alpha|production]"
  bold "             [--appleauth keychain_profile]"
  bold "             [--dmg-name dmg_name]"
  bold "             [--version version]"
  bold "             [--notarize] [--prep-update] [--create-dmg] [--package] [--ci] [--help]"
  echo
  echo "Required:"
  echo "product_name  The name of the product as used in the app bundle name."
  echo "--track       The release track for the build."
  echo
  echo "Optional:"
  echo "--appleauth   The keychain profile to use for authenticating with Apple."
  echo "              Defaults to a profile called 'mmhmm'. Profile should be set up using 'xcrun notarytool store-credentials'"
  echo "--dmg-name    Used as the DMG name, if one is created. Defaults to 'product_name'."
  echo "--help        This help text."
  echo "--version     Specific version number as a timestamp in Unix seconds. Defaults to timestamp of now."
  echo "--notarize    Notarizes the signed app bundle."
  echo "--create-dmg  Creates a notarized DMG of the signed app bundle, signs, notarizes and staples it."
  echo "--prep-update Notarizes and zips the signed app bundle and prepares a release notes file suitable for Sparkle appcast generation."
  echo "--package     Creates a PKG of the app, notarizes, staples and zips."
  echo
}

# Error out as early as possible to make debugging easier.
set -euo pipefail

script_dir=$( cd -- "$( dirname -- "$0" )" &> /dev/null && pwd )
src_root="$script_dir/.."
build_tools_dir="$src_root/Build-Tools"
release_track=''
codesign_identity_app="Developer ID Application: mmhmm inc. (M3KUT44L48)"
codesign_identity_pkg="Developer ID Installer: mmhmm inc. (M3KUT44L48)"
team_id="M3KUT44L48"
version=$(date '+%s')
notarize_only=false
package=false
create_dmg=false
prepare_update=false
keychain_profile="mmhmm"
is_ci=false
release_tracks_showing_sparkle_release_notes=("engineering" "test" "alpha")

if [ $# -lt 3 ]; then
    Help
    exit 1
fi

product_name=$1
shift
app_bundle_name="$product_name.app"
main_info_plist_path="$app_bundle_name/Contents/Info.plist"
menu_bar_bundle_name="Airtime Menu Bar Helper.app"
menu_bar_app_wrapper_subpath="Contents/Library/LoginItems/$menu_bar_bundle_name"
menu_bar_info_plist_path="$app_bundle_name/$menu_bar_app_wrapper_subpath/Contents/Info.plist"
dmg_file_extension="dmg"
dmg_file_name="$product_name.$dmg_file_extension"

while [[ $# -gt 0 ]]; do
  case $1 in
    --appleauth)
      keychain_profile="$2"
      shift 2;;
    --ci)
      is_ci=true
      shift;;
    --create-dmg)
      create_dmg=true
      shift;;
    --help)
      Help
      exit 0
      ;;
    --dmg-name)
      dmg_file_name="${2%".$dmg_file_extension"}.$dmg_file_extension"
      shift 2;;
    --notarize)
      notarize_only=true
      shift;;
    --package)
      package=true
      shift;;
    --prep-update)
      prepare_update=true
      shift;;
    --track)
      release_track="$2"
      shift 2;;
    --version)
      version="$2"
      shift 2;;
    *)
      Help
      echo ""
      echo "Error: Unknown option $1"
      exit 1
      ;;
  esac
done

if [ "$is_ci" = true ]; then
  # Print all executed commands.
  set -x
fi

if [ -z "$release_track" ]; then
  Help
  echo ""
  echo "Error: Track must be specified with --track set to test|alpha|beta|production"
  echo ""
  exit 1
fi

if [[ " ${release_tracks_showing_sparkle_release_notes[*]} " =~ [[:space:]]${release_track}[[:space:]] ]]; then
  echo "Configuring Sparkle to show release notes."
  plutil -replace SUShowReleaseNotes -bool true "$main_info_plist_path"
else
  echo "Configuring Sparkle to hide release notes."
  plutil -replace SUShowReleaseNotes -bool false "$main_info_plist_path"
fi

echo "Updating release configuration to $release_track"
plutil -replace ReleaseConfiguration -string "$release_track" "$main_info_plist_path"
plutil -replace ReleaseConfiguration -string "$release_track" "$menu_bar_info_plist_path"

echo "Updating build number to $version"
plutil -replace CFBundleVersion -string "$version" "$main_info_plist_path"

echo "Replacing provisioning profiles"
cp -X "$src_root/mmhmm/embedded.provisionprofile" "$app_bundle_name/Contents/embedded.provisionprofile"
cp -X "$src_root/CameraExtension/extension.provisionprofile" "$app_bundle_name/Contents/Library/SystemExtensions/app.mmhmm.hybrid.extension.systemextension/Contents/embedded.provisionprofile"
xattr -cr "$app_bundle_name"

echo "Signing all the things"
codesign --force --options runtime --sign "$codesign_identity_app" --timestamp --generate-entitlement-der "$app_bundle_name/Contents/Frameworks/Chromium Embedded Framework.framework/Versions/A/Libraries/"*
codesign --force --options runtime --sign "$codesign_identity_app" --timestamp "$app_bundle_name/Contents/Frameworks/Sparkle.framework/Versions/Current/Autoupdate"
codesign --force --options runtime --sign "$codesign_identity_app" --timestamp "$app_bundle_name/Contents/Frameworks/Sparkle.framework/Versions/Current/Sparkle"
codesign --force --options runtime --sign "$codesign_identity_app" --timestamp "$app_bundle_name/Contents/Frameworks/Sparkle.framework/Versions/Current/Updater.app"
codesign --force --options runtime --deep --sign "$codesign_identity_app" --timestamp --generate-entitlement-der "$app_bundle_name"
codesign --force --options runtime --sign "$codesign_identity_app" --entitlements "$src_root/CameraExtension/extension.entitlements" --timestamp --generate-entitlement-der "$app_bundle_name/Contents/Library/SystemExtensions/app.mmhmm.hybrid.extension.systemextension"
codesign --force --options runtime --sign "$codesign_identity_app" --entitlements "$src_root/mmhmm Helper/helper.entitlements" --timestamp --generate-entitlement-der "$app_bundle_name/Contents/Frameworks/$product_name Helper.app"
codesign --force --options runtime --sign "$codesign_identity_app" --entitlements "$src_root/mmhmm Helper/helper.entitlements" --timestamp --generate-entitlement-der "$app_bundle_name/Contents/Frameworks/$product_name Helper (GPU).app"
codesign --force --options runtime --sign "$codesign_identity_app" --entitlements "$src_root/mmhmm Helper/helper.entitlements" --timestamp --generate-entitlement-der "$app_bundle_name/Contents/Frameworks/$product_name Helper (Plugin).app"
codesign --force --options runtime --sign "$codesign_identity_app" --entitlements "$src_root/mmhmm Helper/helper.entitlements" --timestamp --generate-entitlement-der "$app_bundle_name/Contents/Frameworks/$product_name Helper (Renderer).app"
codesign --force --options runtime --sign "$codesign_identity_app" --entitlements "$src_root/Airtime Menu/AirtimeMenu.entitlements" --timestamp --generate-entitlement-der "$app_bundle_name/$menu_bar_app_wrapper_subpath"
codesign --force --options runtime --sign "$codesign_identity_app" --entitlements "$src_root/mmhmm/mmhmm.entitlements" --timestamp --generate-entitlement-der "$app_bundle_name"

# DMGs require only the container to be notarized, not the contained app bundle.
if [ "$create_dmg" == true ]; then
  dmg_source_folder="dmg-source-folder"
  dmg_resources_folder="$build_tools_dir/dmg-resources"

  if ! command -v create-dmg >/dev/null; then
      brew install create-dmg
  fi

  rm -Rf "${dmg_source_folder:?}/$app_bundle_name"
  mkdir -p "$dmg_source_folder"
  cp -R "$app_bundle_name" "$dmg_source_folder"
  test -f "$dmg_file_name" && rm "$dmg_file_name"

  # Per Apple's recommendation DMGs are signed with the app signing identity, not the installer identity.
  create-dmg \
  --volname "$product_name" \
  --volicon "$dmg_resources_folder/icon.icns" \
  --background "$dmg_resources_folder/mac-dmg-bg@2x.png" \
  --window-pos 200 200 \
  --window-size 493 282 \
  --icon-size 128 \
  --icon "$app_bundle_name" 150 130 \
  --hide-extension "$app_bundle_name" \
  --app-drop-link 350 130 \
  --hdiutil-verbose \
  --codesign "$codesign_identity_app" \
  --notarize "$keychain_profile" \
  "$dmg_file_name" \
  "$dmg_source_folder"
fi

if [ "$notarize_only" == true ] || [ "$prepare_update" == true ]; then
  echo "Notarizing $app_bundle_name..."

  notarization_archive_name="$product_name"_for_notarization.zip
  ditto -c -k --sequesterRsrc --keepParent "$app_bundle_name" "$notarization_archive_name"
  xcrun notarytool submit "$notarization_archive_name" --keychain-profile "$keychain_profile" --team-id "$team_id" --wait
  rm "$notarization_archive_name"
  xcrun stapler staple "$app_bundle_name"

  distributable_file_name="$product_name"_"$release_track"_"$version"

  echo "Completed notarization of $app_bundle_name"
  ditto -c -k --sequesterRsrc --keepParent "$app_bundle_name" "$distributable_file_name".zip
fi

if [ "$prepare_update" == true ]; then
  marketing_version=$(/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" "$main_info_plist_path")
  version_info_string="$marketing_version ($version) $release_track"
  git_root_dir=$(git -C "$src_root" rev-parse --show-toplevel)
  release_notes_html_file="$git_root_dir/release-notes/mac/$marketing_version/$release_track.html"
  sparkle_release_notes_html_file="$distributable_file_name".html

  echo "Generating release notes file for Sparkle appcast: $sparkle_release_notes_html_file"
  if [ -f "$release_notes_html_file" ]; then
    echo "Release notes file found: $release_notes_html_file"
    cat "$release_notes_html_file" > "$sparkle_release_notes_html_file"
    sed -i '' "s|####PRODUCT_NAME####|${product_name}|g" "$sparkle_release_notes_html_file"
    sed -i '' "s|####VERSION_INFO####|${version_info_string}|g" "$sparkle_release_notes_html_file"
  else
    echo "Release notes file not found. Preparing minimal info as a fallback for Sparkle release notes."
    echo "<div><p>$product_name $version_info_string</p></div>" > "$sparkle_release_notes_html_file"
  fi
fi

if [ "$package" == true ]; then
  package_installer_name="$product_name.pkg"
  echo "Generating $package_installer_name"
  mkdir Products
  mkdir Products/Applications
  cp -R "$app_bundle_name" Products/Applications
  pkgbuild --analyze --root Products manifest.plist
  pkgbuild --sign "$codesign_identity_pkg" --identifier 'app.mmhmm.hybrid' --timestamp --root Products --scripts "$build_tools_dir"/package/scripts --component-plist manifest.plist "$package_installer_name"
  rm -R Products
  rm manifest.plist

  echo "Notarizing $package_installer_name"
  xcrun notarytool submit "$package_installer_name" --keychain-profile "$keychain_profile" --team-id "$team_id" --wait
  xcrun stapler staple "$package_installer_name"

  echo "Completed notarization of $package_installer_name"
  ditto -c -k --sequesterRsrc "$package_installer_name" "$package_installer_name".zip
fi
