import shutil
import os
import os.path
import sys
import getpass
import argparse
from pathlib import Path
import subprocess
import urllib.request
import shlex
from pushd import pushd

bold_text_const='\033[1m'
normal_text_const='\033[0m'
red_const='\033[0;31m'
yellow_const='\033[0;33m'
purple_const='\033[0;35m'
no_color_const='\033[0m'

required_disk_space_GiB=150
bytes_in_gigabyte=1024*1024*1024
minimum_ram_GiB=16

minimum_visual_studio_version="2022"
minimum_windows_sdk_version="10.0.22621.2428"

cef_checkout=""
cef_checkout_id=""
cef_checkout_branch=""

root_dir=os.getcwd()
hybrid_repo_dir=os.getcwd()

# URLs used in this script
depot_tools_repo_url="https://chromium.googlesource.com/chromium/tools/depot_tools.git"
automate_script_url="https://bitbucket.org/chromiumembedded/cef/raw/master/tools/automate/automate-git.py"
# SSH and HTTPS origin of the hybrid repo look different but share some components
hybrid_repo_url_components="All-Turtles/mmhmm-hybrid.git"

# Prints a highlighted message to stdout.
def decorate(value):
    print(f"{purple_const}{bold_text_const}{value}{normal_text_const}{no_color_const}")

# Prints a bold message to stdout.
def bold(value):
    print(f"{bold_text_const}{value}{normal_text_const}")

# Prints a warning to stderr. This allows printing messages from within functions that echo to stdout in order to return a string value.
def warning(value):
   print(f"{yellow_const}{bold_text_const}{value}{normal_text_const}{no_color_const}", file=sys.stderr)

# Prints an error to stderr. This allows printing messages from within functions that echo to stdout in order to return a string value.
def error(value):
    print(f"{red_const}{bold_text_const}{value}{normal_text_const}{no_color_const}", file=sys.stderr)

# Usage: resolve_path "path"
# Example: resolve_path "../../path/to/somewhere"
def resolve_path(input_path):
    resolved_path = Path(input_path).resolve(True)
    if os.access(input_path, os.W_OK):
        return resolved_path.as_posix()
    else:
        bail(f"Cannot resolve {input_path}. Make sure the path exists and is accessible to the current effective user $(id -un).{getpass.getuser()}")

def bail(value):
    error(value)
    sys.exit()

def checkDiskSpace():
    disk_usage = shutil.disk_usage("C:\\")
    if disk_usage.free > (required_disk_space_GiB * bytes_in_gigabyte):
        return True
    else:
        return False
    
def validateCEFCheckout(cef_checkout):
    cef_checkout_file=f"{hybrid_repo_dir}/cef-modifications/CEF_BUILD_COMPATIBILITY.txt"
    if os.path.exists(cef_checkout_file):
        # Get the checkout from file
        cef_checkout_file_handle = open(cef_checkout_file,"r")
        global cef_checkout_branch
        cef_checkout_branch = cef_checkout_file_handle.readline().rstrip()
        global cef_checkout_id
        cef_checkout_id = cef_checkout_file_handle.readline().rstrip()
        print(f"CEF branch: {cef_checkout_branch}")
        print(f"CEF checkout: {cef_checkout_id}")

    if not (cef_checkout_id or cef_checkout_branch):
        bail("Unable to determine the CEF version to checkout.")

def get_git_url_from_directory(path):
    proc = subprocess.run(['git', '-C', path, 'remote', 'get-url', 'origin'], capture_output=True, check=True,text=True)
    return proc.stdout

def get_root_of_git_dir(path):
    proc = subprocess.run(['git', '-C', path, 'rev-parse', '--show-toplevel'], capture_output=True, check=True,text=True)
    return proc.stdout.replace('\n', '')

def validate_visual_studio_version():
    proc = subprocess.run(['C:\\Program Files (x86)\\Microsoft Visual Studio\\Installer\\vswhere.exe', '-latest', '-property', 'catalog_productLineVersion'], capture_output=True, check=True,text=True)
    if proc.stdout.strip() == minimum_visual_studio_version:
        print("Correct Visual Studio version installed")
    else:
        bail(f"Incorrect version of Visual Studio installed, found {proc.stdout} expected {minimum_visual_studio_version}")

def validate_ram():
    process = os.popen('wmic ComputerSystem get TotalPhysicalMemory')
    result = process.read()
    process.close()
    total_ram = 0
    for line in str.splitlines(result):
        stripped = line.strip()
        if stripped.isdigit():
            total_ram += int(stripped)

    if total_ram / bytes_in_gigabyte > minimum_ram_GiB:
        print(f"Sufficient RAM to build ({round(total_ram / bytes_in_gigabyte) }GB)")
    else:
        warning(f"Insufficient RAM, minimum of {minimum_ram_GiB}GB suggested you only have {round(total_ram/bytes_in_gigabyte)}GB")

def validate_cmake_install():
    try:
        proc = subprocess.run(['cmake', '--version'], capture_output=True, check=True,text=True)
        print(proc.stdout)
    except Exception as e:
        bail(f"cmake not installed or not in your path {e}")

def validate_gh_install():
    try:
        proc = subprocess.run(['gh', 'version'], capture_output=True, check=True,text=True)
        print(proc.stdout)
    except Exception as e:
        bail("gh (GitHub CLI) is not installed or not in your path")

def validate_gh_login():
    try:
        subprocess.check_output(['gh', 'auth', 'status'])
    except Exception as e:
        print(e)
        decorate("Logging into GitHub...")
        try:
            proc2 = subprocess.run(['gh', 'auth', 'login'])
        except Exception as e:
            print(f"gh login failed: {e}")


def compare_version(version1, version2):
    versions1 = [int(v) for v in version1.split(".")]
    versions2 = [int(v) for v in version2.split(".")]
    for i in range(max(len(versions1),len(versions2))):
        v1 = versions1[i] if i < len(versions1) else 0
        v2 = versions2[i] if i < len(versions2) else 0
        if v1 > v2:
            return 1
        elif v1 <v2:
            return -1
    return 0

def validate_windows_sdk_version():
    os.environ["VSCMD_ARG_HOST_ARCH"] = "x64"
    os.environ["VSCMD_ARG_TGT_ARCH"] = "x64"
    p = subprocess.Popen(['cmd', '/v:on', '/q', '/c', 'C:\\Program Files\\Microsoft Visual Studio\\2022\\Community\\Common7\\Tools\\vsdevcmd\\core\\winsdk.bat', '&echo(!WindowsSDKVersion!'], stdout=subprocess.PIPE, universal_newlines=True)
    stdout, stderr = p.communicate()
    version = stdout.strip()[:-1]
    if compare_version(version, minimum_windows_sdk_version) >=0:
        print(f"validated Windows SDK version, using version {version}")
    else:
        bail(f"Windows SDK doesn't meet the minimum version. Using {version} minimum version is {minimum_windows_sdk_version}")

def git_clone(url, directory):
    try:
        proc = subprocess.check_output(['git', 'clone', url, directory])
    except Exception as e:
        print(e)
        bail(f"Unable to clone repo {url}")

def git_checkout(dir):
    try:
        proc = subprocess.check_output(['git','-C',dir,'checkout','main'])
    except Exception as e:
        print(e)
        bail(f"Unable to checkout repo in {dir}")

def git_pull(dir):
    try:
        proc = subprocess.check_output(['git','-C',dir,'pull'])
    except Exception as e:
        print(e)
        bail(f"Unable to pull repo in {dir}")

def git_hard_reset(dir):
    try:
        proc = subprocess.check_output(['git','-C',dir,'reset','--hard'])
    except Exception as e:
        print(e)
        bail(f"Unable to reset repo in {dir}")

def git_apply(patch_file_path, check, reverse,):
    try:
        cmd = ['git','apply']
        if reverse:
            cmd.append('--reverse')
        if check:
            cmd.append('--check')

        cmd.append(patch_file_path)
        cmd.append('--verbose')
        cmd.append('--ignore-space-change')
        cmd.append('--ignore-whitespace')
        proc = subprocess.check_output(cmd)
        print(f"apply result = {proc}")
        return True
    except Exception as e:
        print(f"Error during git apply: {e}")
        return False

# Usage: patch patch-dir patch-file-path patch-description
# Example: patch /patch/this/dir the-patch-file.patch "Foo repo"
def patch(patch_dir, patch_file_path, patch_description):
    with pushd(patch_dir):
        decorate(f"Patch root dir {patch_dir}")
    # Check if patch has been applied
        decorate("Checking if patch has been applied")
        if not git_apply(patch_file_path, True, True):
            # Check if patch can be applied
            decorate("Checking if patch can be applied")
            if not git_apply(patch_file_path, True, False):
                bail(f"{patch_description} is out of sync, patch can't be applied. Might the patch need an update?")
            else:
                decorate(f"Applying {patch_description} patch...")
            
            git_apply(patch_file_path, False, False)
        else:
            decorate(f"Skipped applying {patch_description} patch, because it was already applied.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Downloads, updates, and patches CEF sources as required. Builds CEF. Takes forever.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter)
    parser.add_argument("--build-arch", choices=["x64"], default="x64", required=False, help="Architectures to build")
    parser.add_argument("--build-type", choices=["full", "only_debug", "only_release"], default="full", required=False, help="Configurations to build")
    parser.add_argument("--hybrid-repo-dir", type=str, required=True, help="The mmhmm Hybrid repo directory.")
    parser.add_argument("--root-dir", type=str, required=True, help="The mmhmm Hybrid repo directory.")

    args = parser.parse_args()

    # Resolve relative paths
    root_dir=resolve_path(args.root_dir)
    hybrid_repo_dir=resolve_path(args.hybrid_repo_dir)

    decorate(f"Validating prerequisites...")
    validate_ram()
    validateCEFCheckout(cef_checkout)
    validate_visual_studio_version()
    validate_cmake_install()
    validate_windows_sdk_version()
    validate_gh_install()
    validate_gh_login()

    hybrid_dir_git_url = get_git_url_from_directory(hybrid_repo_dir)
    if hybrid_repo_url_components in hybrid_dir_git_url:
        print(f"validated hybrid repo {hybrid_dir_git_url}")
    else:
        bail(f"hybrid_repo_dir is not the repo, the mmhmm-hybrid repo is required. Found {hybrid_dir_git_url} instead")
    
    hybrid_repo_dir=get_root_of_git_dir(hybrid_repo_dir)

    ### Validate Directories and Tools ###
    decorate(f"Setting up build stage in {root_dir}...")

    git_dir=f"{root_dir}/git"
    cef_dir=f"{git_dir}/cef"
    automate_dir=f"{cef_dir}/tools/automate"
    depot_tools_dir=f"{cef_dir}/tools/depot_tools"
    download_dir=f"{root_dir}/cef_{cef_checkout_id}"
    chromium_src_dir=f"{download_dir}/chromium/src"
    chromium_cef_dir=f"{chromium_src_dir}/cef"
    seglib_dir=f"{chromium_src_dir}/third_party/seglib/lib"

    # Make dir if it doesn't exist.
    if not os.path.exists(git_dir):
        os.makedirs(git_dir)

    decorate(f"Checking CEF repo at {automate_dir}")

    # Make dir if it doesn't exist.
    if not os.path.exists(automate_dir):
        os.makedirs(automate_dir)
    
    if not os.path.isfile(f"{automate_dir}/automate-git.py"):
        decorate("Downloading the CEF automate script...")
        urllib.request.urlretrieve(automate_script_url,f"{automate_dir}/automate-git.py")
    else:
        decorate("Skipped downloading the CEF automate script because it already exists.")

    decorate(f"Checking Chromium depot tools at {depot_tools_dir}")    
    if not os.path.exists(depot_tools_dir):
        git_clone(depot_tools_repo_url, depot_tools_dir)
    else:
        git_checkout(depot_tools_dir)
        git_pull(depot_tools_dir)

    ### Sources Preperation ###

    os.environ["GN_DEFINES"] = "is_official_build=true proprietary_codecs=true ffmpeg_branding=Chrome use_thin_lto=false use_siso=false"
    gn_args = "--ide=vs2022 --sln=cef --filters=//cef/*"

    if args.build_type == "only_debug":
        gn_args += " --build-debug"
    elif args.build_type == "only_release":
        gn_args += " --build-release"

    os.environ["GN_ARGUMENTS"] = gn_args

    if not os.path.exists(download_dir):
        decorate(f"python3 {automate_dir}/automate-git.py --download-dir={download_dir} --depot-tools-dir={depot_tools_dir} --checkout={cef_checkout_id} --branch={cef_checkout_branch} --no-build --force-clean --x64-build --with-pgo-profiles")
        os.system(f"python3 {automate_dir}/automate-git.py --download-dir={download_dir} --depot-tools-dir={depot_tools_dir} --checkout={cef_checkout_id} --branch={cef_checkout_branch} --no-build --force-clean --x64-build --with-pgo-profiles")

    chromium_modifications_dir=f"{hybrid_repo_dir}/chromium-modifications"
    decorate(f"Change dir to {chromium_modifications_dir} to apply Chromium Modifications")
    with pushd(chromium_modifications_dir):
        os.system(f"python3 copy_modifications_to_chromium.py --chromium-src-dir {chromium_src_dir}")
    

    # if cef dir hasn't been copied yet, patch source dir
    if not os.path.exists(chromium_cef_dir):
        chromium_cef_dir=f"{download_dir}/cef"

    # Patch CEF files
    file_picker_patch=f"{hybrid_repo_dir}/cef-modifications/1400_file_picker_enumeration.patch"
    patch(chromium_cef_dir, file_picker_patch, "Fix for file picker")

    make_distrib_patch=f"{hybrid_repo_dir}/cef-modifications/2181_win_cef_make_distrib.patch"
    patch(chromium_cef_dir, make_distrib_patch, "Change make_distrib.py to include seglib files")

    ### Do Build ###
    # The actual builds pass --no-update to ensure nothing is changed after the above patching
    build_cmd = f"python3 {automate_dir}/automate-git.py --download-dir={download_dir} --depot-tools-dir={depot_tools_dir} --checkout={cef_checkout_id} --branch={cef_checkout_branch} --force-build --x64-build --with-pgo-profiles"
    if args.build_type == "only_debug":
        build_cmd += " --debug-build"
    elif args.build_type == "only_release":
        build_cmd += " --release-build"

    os.system(build_cmd)


    decorate("All done! 🎉") 
