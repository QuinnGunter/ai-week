#!/bin/bash
#
# Batch rename Git lightweight tags.

# Error out as early as possible to make debugging easier.
set -euo pipefail

function help {
    local script_name
    script_name=$(basename "$0")

    echo
    echo "$script_name"
    echo "Rename Git tags"
    echo
    echo "   Usage: $script_name -s 'search-pattern' [-p/-r] 'prefix' [--verbose] [--dryrun]"
    echo
    echo "Options"
    echo
    echo "   -p"
    echo "      Prefix"
    echo "      A search pattern of 'bar/*' and a prefix of 'f/o/o' produces tags 'f/o/obar/*'."
    echo
    echo "   -r"
    echo "      Replace all path prefixes"
    echo "      A search pattern of 'a/b/cd*' and a prefix of 'e/fg' produces tags 'e/fgcd*'."
    echo
    echo "   --verbose"
    echo "      Print all executed statements. Usedful for debugging purposes."
    echo
    echo "   --dryrun"
    echo "      Print renamed tags but don't actually change anything in the repo."
    echo
}

# Main entry point

dryrun=false
verbose=false
search_pattern=""
prefix=""
action=""

while [[ $# -gt 0 ]]; do
  case $1 in
    -s)
      search_pattern="$2"
      shift # past argument
      shift # past value
      ;;
    -p)
      if [ "$action" != "" ]; then
        help
        echo ""
        echo "Error: Only one action may be specified."
        exit 1
      fi
      prefix="$2"
      action="prefix"
      shift # past argument
      shift # past value
      ;;
    -r)
      if [ "$action" != "" ]; then
        help
        echo ""
        echo "Error: Only one action may be specified."
        exit 1
      fi
      prefix="$2"
      action="replace"
      shift # past argument
      shift # past value
      ;;
    --dryrun)
      dryrun=true
      shift # past argument
      ;;
    --verbose)
      verbose=true
      shift # past argument
      ;;
    *)
      help
      echo ""
      echo "Error: Unknown option $1."
      exit 1
      ;;
  esac
done

if [ "$action" == "" ]; then
    help
    exit 0
fi

if [ "$verbose" == true ]; then
    # Print every command being executed.
    set -x
fi

# Update tags from remote
git fetch origin

matching_tags=$(git tag --list "$search_pattern")
for tag in $matching_tags; do
    if [ "$action" == "prefix" ]; then
        new="$prefix$tag"
    elif [ "$action" == "replace" ]; then
        new="$prefix${tag##*/}"
    else
        help
        echo ""
        echo "Error: Unknown action specified."
        exit 1
    fi

    echo "$tag -> $new"

    if [ "$dryrun" == false ]; then
        git tag "$new" "$tag"  
    fi

    # Could delete old tag here
    # git tag -d "$tag"
done

if [ "$dryrun" == true ]; then
    echo "--dryrun was specified. Nothing changed."
    exit 0
fi

echo "Tags renamed."

# Could synchronize added and removed tags with server here
# git push --tags --prune origin refs/tags/*
