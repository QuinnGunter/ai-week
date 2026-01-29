import sync_dirs

import argparse
import logging
import os
import pathlib

if __name__ == "__main__":
    target_dir = pathlib.Path(os.path.join(os.path.dirname(os.path.realpath(__file__)), "src"))
    parser = argparse.ArgumentParser(
        description=f"Copies modifications from the chromium/src folder to {target_dir}. "
                    f"The structure and properties are preserved. "
                    f"Files which didn't change are ignored.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter)
    parser.add_argument("--chromium-src-dir", type=str, required=True, help="Path to the chromium/src directory.")
    parser.add_argument("--untracked_files", type=str, default='not_allowed',
                        choices=[i.lower() for i in sync_dirs.UntrackedFilesMode],
                        help="What to do with the untracked files.")
    parser.add_argument("--dry-run", action="store_true", help="Print filesystem operations without executing them.")
    parser.add_argument("--log-level", choices=["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"], default="INFO",
                        help="Set the logging level")

    args = parser.parse_args()
    logging.basicConfig(level=getattr(logging, args.log_level),
                        format="%(levelname)s [%(funcName)s:%(lineno)d] %(message)s")
    sync_dirs.sync_dirs(args.chromium_src_dir, target_dir, sync_dirs.GitStatusBasedFileSource(args.untracked_files),
                        args.dry_run)
