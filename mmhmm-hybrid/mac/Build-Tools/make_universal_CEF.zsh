#!/bin/zsh

#  make_universal_CEF.sh (Combine two CEF distributions into one universal one)
#  mmhmm-hybrid
#  Copyright 2022 mmhmm, Inc. All rights reserved.
#  Created by Mark Bessey on 10/15/22
#

Help()
{
    echo "Create a Universal CEF build from two separate CEF single-architecture archives"
    echo
    echo "Required:"
    echo "folder1 folder2        Two .tar.bz2 binary distributions of CEF"
    echo "                       (e.g. contents of chromium/src/cef/binary_distrib/cef_binary_*.tar.bz2"
    echo
}

# exit on error
set -e

# check for exactly two specifed files
if [[ $# -ne 2 ]]
then
    echo "must specify exactly two build archives"
    Help
    exit 1
fi

# get directory names
first=${1%.tar.bz2}
second=${2%.tar.bz2}

# check if already extracted
if [[ -d "${first}" ]]
then
    echo "first archive already extracted, skipping..."
else
    echo "extracting to ${first}"
    # extract archive
    tar -x --bzip2 --file "${1}"
fi

# check if already extracted
if [[ -d "${second}" ]]
then
    echo "second archive already extracted, skipping..."
else
    echo "extracting to ${second}"
    # extract archive
    tar -x --bzip2 --file "${2}"
fi

# remove snapshot.bin, since it isn't combinable across architectures
rm -f "${first}/Release/Chromium Embedded Framework.framework/Resources/snapshot_blob.bin"
rm -f "${first}/Debug/Chromium Embedded Framework.framework/Resources/snapshot_blob.bin"
rm -f "${second}/Release/Chromium Embedded Framework.framework/Resources/snapshot_blob.bin"
rm -f "${second}/Debug/Chromium Embedded Framework.framework/Resources/snapshot_blob.bin"

# remove .DS_Store files, in case Finder accessed the unarchived directories
find "${first}" -name ".DS_Store" -type f -delete
find "${second}" -name ".DS_Store" -type f -delete

# make sure resources.pak files are the same for both architectures
# there are some binary differences, which don't seem to matter in practice
cp "${first}/Debug/Chromium Embedded Framework.framework/Resources/resources.pak" "${second}/Debug/Chromium Embedded Framework.framework/Resources/resources.pak"
cp "${first}/Release/Chromium Embedded Framework.framework/Resources/resources.pak" "${second}/Release/Chromium Embedded Framework.framework/Resources/resources.pak"
cp "${first}/README.txt" "${second}/README.txt"

dest="${first%(arm64|x64)}universal"

# get the directory this script lives in, as an absolute path
# then find the universalizer script
mypath="${0:A:h}"
universalizer="${mypath}/universalizer.py"

if [[ ! -f ${universalizer} ]]
then
    echo "universalizer not found at ${universalizer}"
    exit
fi

if [[ -d ${dest} ]]
then
    echo "universal build exists, skipping..."
else
    echo "creating universal build in ${dest}"
    # run the universalizer script from Chromium
    python3 ${universalizer} ${first} ${second} ${dest}
fi
echo "universal build is in ${dest}"

if [[ -f "${dest}.tar.bz2" ]]
then
  echo "archive already exists at ${dest}.tar.bz2"
else
    echo "archiving to ${dest}.tar.bz2"
    tar --create --bzip2 --file "${dest}.tar.bz2" "${dest}"
fi
