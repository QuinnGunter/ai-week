#!/bin/bash

# Error out as early as possible to make debugging easier.
set -euo pipefail

script_dir=$( cd -- "$( dirname -- "$0" )" &> /dev/null && pwd )

# shellcheck disable=SC1091
source "$script_dir/script_helpers.sh"

function Help()
{
  local script_name
  script_name=$(basename "$0")

  echo
  bold "Generate Sparkle appcast feed XML file"
  echo
  echo "This script wraps Sparkle's 'generate_appcast' CLI, which generally works by"
  echo "  1. scanning a specified directory for app bundle zip archives and release notes files,"
  echo "  2. calculating a cryptographic signature of every archive based on a private EdDSA key"
  echo "     created once with Sparkle's 'generate_key' CLI, while also requiring the public key"
  echo "     to be contained in the respective app bundle's 'Info.plist' as 'SUPublicEDKey',"
  echo "  3. adding update information to an XML file representing the Sparkle appcast."
  echo "     If an existing XML file is specified, the CLI updates it with the update information."
  echo "     If no XML file is specified, the CLI generates a new file with the update information."
  echo
  echo "This script downloads and updates the existing Sparkle appcast XML file for the specified track."
  echo
  echo "The source directory is expected to contain the app bundle archive(s) to add to the appcast."
  echo "If no source directory is specified, the current working directory is used instead. By default, the"
  echo "appcast will contain the 'generate_appcast' default maximum of the 3 most recent app bundle updates."
  echo
  echo "Release notes in HTML format sharing the name of an archive will be incorporated into the appcast"
  echo "according to the rules lined out in the 'generate_appcast' help text."
  echo
  bold "$script_name --track release_track"
  bold "             [--link url]"
  bold "             [--sparkle-xml path]"
  bold "             [--sparkle-pk key]"
  bold "             [--url-prefix prefix]"
  bold "             [--ci] [--strict] [source_directory] [...]"
  echo
  echo "--track       The release track for the build. Required. Can be one of [engineering|test|beta|alpha|production]."
  echo "              Selects the prefix, which by adding the archive file name, determines the archive download URL."
  echo "              Pass --url-prefix to override automatic prefix selection and provide a custom URL prefix."
  echo "              Downloads the track's published appcast and updates it. Pass --sparkle-xml to override this behavior."
  echo 
  echo "--ci          Prints all executed commands. Optional."
  echo "--help        This help text."
  echo "--link        The link URL Sparkle presents as a fallback if an update fails. Optional."
  echo "--sparkle-xml The path to an appcast XML file to update. Optional."
  echo "--sparkle-pk  Private key to generate the Sparkle signature. Prefer 1password-cli or exporting as \$SPARKLE_PRIVATE_KEY."
  echo "--strict      Fail if provided XML file does not exist. Optional."
  echo "--url-prefix  The download URL prefix. Optional."
  echo "...           Remaining arguments are passed on to 'generate_appcast'."
  echo
  bold "Troubleshooting"
  echo
  echo "In case of unexpected appcast contents, clearing '~/Library/Caches/Sparkle' might help, since"
  echo "inidividual archives are only decompressed once, but inspected throughout all subsequent runs."
  echo
}

# Map: Release track to XML feed URL and download URL prefix
#
# Attention: Mind the trailing '/' in the download prefix! 'generate_appcast' strips everything following the last '/' in the download prefix.
readonly update_resources=(
    "engineering https://mmhmm.blob.core.windows.net/sparkle/engineering/sparkle-appcast.xml https://mmhmm.blob.core.windows.net/release/release/mac/engineering/"
    "test https://mmhmm.blob.core.windows.net/sparkle/test/sparkle-appcast.xml https://mmhmm.blob.core.windows.net/release/release/mac/test/"
    "alpha https://mmhmm.blob.core.windows.net/sparkle/alpha/sparkle-appcast.xml https://mmhmm.blob.core.windows.net/release/release/mac/alpha/"
    "beta https://mmhmm.blob.core.windows.net/sparkle/beta/sparkle-appcast.xml https://mmhmm.blob.core.windows.net/release/release/mac/beta/"
    "production https://mmhmm.blob.core.windows.net/sparkle/production/sparkle-appcast.xml https://mmhmm.blob.core.windows.net/release/release/mac/prod/"
)

# determine_support release_track
#
# Populates $feed_location and $download_url_prefix, if successful.
function determine_support() {
  local release_track=$1

  for fields in "${update_resources[@]}"; do
      IFS=$' ' read -r release_track_iter feed_location_iter download_url_prefix_iter <<<"$fields"
      if [ "$release_track" == "$release_track_iter" ]; then
          feed_location=$feed_location_iter
          download_url_prefix=$download_url_prefix_iter
          break
      fi
  done

  if [ -z "$feed_location" ] || [ -z "$download_url_prefix" ]; then
      echo "Missing update resources for release track $release_track."
      exit 1
  fi
}

src_root="$script_dir/.."
build_tools_dir="$src_root/Build-Tools"
input_dir=""
release_track=''
is_ci=false
sparkle_prefix=""
sparkle_link=""
sparkle_feed_xml_file=""
sparkle_bin_dir="$build_tools_dir/build/artifacts/sparkle/Sparkle/bin"
if [ ! -f "$sparkle_bin_dir" ]; then
  # If Sparkle is not a remote dependency, its binaries are expected
  # to be located in the build tools folder.
  sparkle_bin_dir="$build_tools_dir"
fi
forwarded_arguments=()

sparkle_private_key_1pw_path="op://Apple certs/hybrid-sparkle-key/password"
sparkle_private_key=${SPARKLE_PRIVATE_KEY:-""}
strict_sparkle_feed_xml_file_check=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --ci)
      is_ci=true
      shift;;
    --help)
      Help
      exit 0
      ;;
    --link)
      sparkle_link="$2"
      shift 2;;
    --sparkle-xml)
      sparkle_feed_xml_file="$2"
      shift 2;;
    --sparkle-pk)
      sparkle_private_key="$2"
      shift 2;;
    --strict)
      strict_sparkle_feed_xml_file_check=true
      shift;;
    --track)
      release_track="$2"
      shift 2;;
    --url-prefix)
      sparkle_prefix="$2"
      shift 2;;
    *)
      if [ "${1:0:2}" = "--" ]; then
        echo "Forwarding unknown arguments: $1 $2"
        forwarded_arguments+=("$1" "$2")
        shift 2
      elif [ -z "$input_dir" ]; then
        input_dir="$1"
        shift
      else
        bail "Error: Unknown option $1"
      fi
      ;;
  esac
done

if [ "$is_ci" = true ]; then
  # Print all executed commands.
  set -x
fi

if [ -z "$release_track" ]; then
  bail "No release track was provided, but is required."
elif [ ! -f "$sparkle_feed_xml_file" ] && [ "$strict_sparkle_feed_xml_file_check" = true ]; then
  bail "$sparkle_feed_xml_file does not exist and --strict flag was provided."
fi

if [ -z "$sparkle_private_key" ] && command -v op >/dev/null; then
  sparkle_private_key=$(op read "$sparkle_private_key_1pw_path")
elif [ -z "$sparkle_private_key" ]; then
  bail "No Sparkle private key was provided or found in \$SPARKLE_PRIVATE_KEY. 1password-cli is also not installed to check."
fi

if [ -z "$input_dir" ]; then
  input_dir=$(pwd)
fi

determine_support "$release_track"

if [ -z "$sparkle_feed_xml_file" ]; then
  echo "Downloading published Sparkle appcast XML file for $release_track..."
  sparkle_feed_xml_file="$input_dir/sparkle-appcast-$release_track.xml"
  curl "$feed_location" --output "$sparkle_feed_xml_file" --location
fi

if [ -n "$sparkle_prefix" ]; then
  # Take care to add a trailing '/' to prevent 'generate_appcast' from stripping the last URL component.
  if [ "${sparkle_prefix:0-1}" != '/' ]; then
    download_url_prefix="$sparkle_prefix/"
  else
    download_url_prefix="$sparkle_prefix"
  fi
fi

arguments=(
  --ed-key-file -
  --embed-release-notes
  --download-url-prefix "$download_url_prefix"
  -o "$sparkle_feed_xml_file"
  --link "$sparkle_link"
  "$input_dir"
)

if [ "${#forwarded_arguments[@]}" -gt 0 ]; then
    arguments+=("${forwarded_arguments[@]}")
fi

echo
echo "Generating Sparkle appcast XML file for app bundle archives..."
echo "  source directory: $(resolve_path "$input_dir")"
echo "  release track: $release_track"
if [ -f "$sparkle_feed_xml_file" ]; then
  echo "  output file: $(resolve_path "$sparkle_feed_xml_file")"
else
  echo "  output file: $sparkle_feed_xml_file"
fi
echo "  download URL prefix: $download_url_prefix"
echo
echo "$sparkle_private_key" \
      | "$sparkle_bin_dir"/generate_appcast \
      "${arguments[@]}"
