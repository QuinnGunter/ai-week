import shutil

import sync_dirs

import argparse
import logging
import os
import pathlib
import platform
import shlex
import subprocess
import tarfile
import tempfile

def copy_files_from_subfolder(subfolder_name: os.PathLike, destination_path: os.PathLike, file_name=None):
    """
    Copies files from a specified relative path to a subfolder in the current working directory to a given destination path. 
    If a file name is provided, only this file will be copied. If no file name is provided, all files in the subfolder will be copied.

    Parameters:
    - subfolder_name: The name of the subfolder within the current directory.
    - destination_path: The full path to the destination directory where files should be copied.
    - file_name: The name of the specific file to copy. Optional; if not provided, all files will be copied.

    Returns:
    - None
    """
    # Get the current working directory
    current_working_directory = os.getcwd()

    # Construct the full path to the subfolder
    subfolder_path = os.path.join(current_working_directory, subfolder_name)

    # Check if the subfolder exists
    if not os.path.exists(subfolder_path):
        raise RuntimeError(f"The subfolder '{subfolder_name}' does not exist in the current directory.")

    # Ensure the destination path exists, create if it does not
    os.makedirs(destination_path, exist_ok=True)

    # Copy logic for either a specific file or all files
    if file_name:
        # Copy only the specified file
        file_path = os.path.join(subfolder_path, file_name)
        if os.path.isfile(file_path):
            try:
                shutil.copy(file_path, destination_path)
                logging.info(f"Copied {file_name} to {destination_path}.")
            except Exception as e:
                raise RuntimeError(f"Error copying {file_name}: {e}")
        else:
            raise RuntimeError(f"File {file_name} does not exist in {subfolder_name}.")
    else:
        # Copy all files from the subfolder
        copied_files_count = 0
        for filename in os.listdir(subfolder_path):
            file_path = os.path.join(subfolder_path, filename)
            if os.path.isfile(file_path):
                try:
                    shutil.copy(file_path, destination_path)
                    logging.info(f"Copied {filename} to {destination_path}.")
                    copied_files_count += 1
                except Exception as e:
                    raise RuntimeError(f"Error copying {filename}: {e}")
        if copied_files_count == 0:
            raise RuntimeError("No files were copied.")
        else:
            logging.info(f"Successfully copied {copied_files_count} files to {destination_path}.")

def fetch_release_asset(target_dir: os.PathLike, release_tag: str, asset_name: str):
    logging.info(f"Fetching {release_tag}/{asset_name} asset from the github repository")
    subprocess.run(shlex.split(f"gh release download {release_tag} --dir \"{target_dir}\"  --pattern {asset_name}"),
                   check=True)
    return pathlib.Path(os.path.join(target_dir, asset_name))


def get_first_component_from_tarfile(tar: tarfile.TarFile):
    first_path_tokens = os.path.split(tar.getmembers()[0].path)
    if len(first_path_tokens) == 2 and len(first_path_tokens[0]) == 0:
        return first_path_tokens[1]
    return first_path_tokens[0]


def get_first_component_from_tarfile_path(tarfile_path: os.PathLike):
    with tarfile.open(tarfile_path) as tar:
        return get_first_component_from_tarfile(tar)


def unpack_tar_file(tarfile_path: os.PathLike, target_dir: os.PathLike, strip_first_component: bool):
    with tarfile.open(tarfile_path) as tar:
        if strip_first_component:
            for member in tar.getmembers():
                # Skip members that are just the top-level directory itself
                parts = member.name.split('/', 1)
                if len(parts) < 2:
                    continue  # Skip the top-level directory
                # Adjust the member name to skip the first directory
                member.name = parts[1]
                tar.extract(member, target_dir)
            return target_dir
        else:
            tar.extractall(path=target_dir)
            return pathlib.Path(os.path.join(target_dir, get_first_component_from_tarfile(tar)))


def setup_release_asset(work_dir: os.PathLike, chromium_src_dir: os.PathLike, asset_target_dir: os.PathLike,
                        release_tag: str, asset_name: str, override_seglib: bool, dry_run: bool):
    unpacked_dir = pathlib.Path(os.path.join(chromium_src_dir, asset_target_dir))
    if unpacked_dir.is_dir():
        if not override_seglib:
            logging.debug(f"Asset \"{unpacked_dir}\" already exists - ignoring")
            return
        else:
            logging.info(f"Removing existing \"{unpacked_dir}\" asset directory")
            shutil.rmtree(unpacked_dir)
    fetched_path = fetch_release_asset(work_dir, release_tag, asset_name)
    unpack_tar_file(fetched_path, unpacked_dir, True)


def setup_seglib_in_chromium(work_dir: os.PathLike, chromium_src_dir: os.PathLike, override_seglib: bool,
                             dry_run: bool):
    if platform.system() == "Darwin":
        seglib_release_tag = "seglib-2025.12.09"
        seglib_library_asset_name = "seglib-0.1.2-Darwin-universal-shared-Release.tar.gz"
        seglib_resources_asset_name = "mac-seglib-config-2025.12.09.tar.gz"
    elif platform.system() == "Windows":
        seglib_release_tag = "seglib-2025.12.09"
        seglib_library_asset_name = "seglib-0.1.2-Windows-AMD64-shared-Release.tar.gz"
        seglib_resources_asset_name = "win-seglib-config-2025.05.20.tar.gz"
    else:
        raise RuntimeError("Unsupported platform " + platform.system())
    setup_release_asset(work_dir, chromium_src_dir, pathlib.Path(os.path.join("third_party", "seglib")),
                        seglib_release_tag, seglib_library_asset_name, override_seglib, dry_run)
    setup_release_asset(work_dir, chromium_src_dir, pathlib.Path("seglib"),
                        seglib_release_tag, seglib_resources_asset_name, override_seglib, dry_run)


def setup_seglib(chromium_src_dir: os.PathLike, override_seglib: bool, dry_run: bool):
    with tempfile.TemporaryDirectory() as tmp_dir:
        setup_seglib_in_chromium(tmp_dir, chromium_src_dir, override_seglib, dry_run)


if __name__ == "__main__":
    src_dir = pathlib.Path(os.path.join(os.path.dirname(os.path.realpath(__file__)), "src"))
    parser = argparse.ArgumentParser(
        description=f"Copies chromium modifications from {src_dir} to the chromium/src folder to. "
                    f"The structure and properties are preserved. "
                    f"Files which didn't change are ignored.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter)
    parser.add_argument("--chromium-src-dir", type=str, required=True, help="Path to the chromium/src directory.")
    parser.add_argument("--dry-run", action="store_true", help="Print filesystem operations without executing them.")
    parser.add_argument("--override-seglib", action="store_true", help="Overrides seglib assets.")
    parser.add_argument("--silent", action="store_true", help="Turn off logging.")
    parser.add_argument("--log-level", choices=["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"], default="INFO",
                        help="Set the logging level")

    args = parser.parse_args()
    logging.basicConfig(level=getattr(logging, args.log_level),
                        format="%(levelname)s [%(funcName)s:%(lineno)d] %(message)s")
    sync_dirs.sync_dirs(src_dir, args.chromium_src_dir, sync_dirs.DirRecursiveContentFileSource(), args.dry_run)
    setup_seglib(args.chromium_src_dir, args.override_seglib, args.dry_run)
    
    if platform.system() == 'Windows':
        # Copy Camera Driver dependencies to thirdy party Chromium folder
        copy_files_from_subfolder('../win/Camera/Include', args.chromium_src_dir + '\\third_party\\mmhmmCameraClient\\include')
        copy_files_from_subfolder('../win/Camera/Client', args.chromium_src_dir + '\\third_party\\mmhmmCameraClient\\lib', 'mmhmmCameraClient.lib')
    
