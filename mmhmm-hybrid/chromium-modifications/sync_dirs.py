#!/usr/bin/env python3

import enum
import hashlib
import logging
import os
import pathlib
import shlex
import shutil
import subprocess
import sys
import typing


class Modifier(enum.Enum):
    modified = 1
    added = 2
    deleted = 3
    untracked = 4


class UntrackedFilesMode(str, enum.Enum):
    not_allowed = "not_allowed"
    allowed = "allowed"
    ignored = "ignored"


def git_status(dir_path: os.PathLike):
    proc = subprocess.run(shlex.split("git status --porcelain"), capture_output=True, cwd=dir_path, check=True,
                          text=True)
    return proc.stdout


def copy_file(src_path: os.PathLike, target_path: os.PathLike, dry_run: bool):
    """
        Copies a file preserving all file metadata.
    """
    logging.info(f"Copying {src_path} -> {target_path}")
    if not dry_run:
        if sys.version_info <= (3, 7):
            shutil.copy2(str(src_path), str(target_path))
        else:
            shutil.copy2(src_path, target_path)


def calc_file_hash(file_path: os.PathLike) -> hashlib.md5:
    with open(file_path, "rb") as f:
        file_hash = hashlib.md5()
        while chunk := f.read(8192):
            file_hash.update(chunk)
        return file_hash


def sync_file(src_dir: os.PathLike, target_dir: os.PathLike, src_file: os.PathLike, modifier: Modifier, dry_run: bool):
    src_file_full_path = pathlib.Path(os.path.join(src_dir, src_file))
    target_file_full_path = pathlib.Path(os.path.join(target_dir, src_file))
    target_file_dir = target_file_full_path.parent
    assert modifier != Modifier.deleted  # TODO: implement it (not needed so far)
    if not target_file_dir.is_dir():
        logging.debug(f"Creating directory {target_file_dir}")
        if not dry_run:
            target_file_dir.mkdir(parents=True)

    do_copy = True
    if target_file_full_path.is_file():
        do_copy = calc_file_hash(src_file_full_path).digest() != calc_file_hash(
            target_file_full_path).digest()
        if not do_copy:
            logging.debug(f"File \"{src_file_full_path}\" didn't change")

    if not target_file_full_path.is_file() or do_copy:
        copy_file(src_file_full_path, target_file_full_path, dry_run)


def parse_git_status_line(line: str) -> typing.Tuple[pathlib.Path, Modifier]:
    """
        Example input:

        M third_party/blink/renderer/platform/webrtc/webrtc_video_frame_adapter.cc
        ?? media/capture/video/segmentor.cc
        A media/capture/video/segmentor.h
        D media/capture/video/win/mmhmm_gpu_renderer_win.cc
        A third_party/directory
    """
    tokens = line.split()
    assert len(tokens) == 2
    modifier_str = tokens[0]
    if modifier_str == "M":
        modifier = Modifier.modified
    elif modifier_str == "MM":
        modifier = Modifier.modified
    elif modifier_str == "A":
        modifier = Modifier.added
    elif modifier_str == "AM":
        modifier = Modifier.added
    elif modifier_str == "D":
        modifier = Modifier.deleted
    elif modifier_str == "??":
        modifier = Modifier.untracked
    else:
        raise RuntimeError("Unsupported modifier string: " + modifier_str)
    return pathlib.Path(tokens[1]), modifier


def dirs_sanity_check(src_dir: os.PathLike, target_dir: os.PathLike):
    src_dir_path = pathlib.Path(src_dir).absolute()
    target_dir_path = pathlib.Path(target_dir).absolute()

    if src_dir_path == target_dir_path:
        raise RuntimeError("Source and target directories shall not be the same")

    if src_dir_path.name != "src" and target_dir_path.name != "src" and \
            src_dir_path.parent != "chromium-modifications" and target_dir_path.parent != "chromium-modifications":
        raise RuntimeError("Invalid sub-tree chromium path")

    if src_dir_path.name != "src" and target_dir_path.name != "src" and \
            src_dir_path.parent != "chromium" and target_dir_path.parent != "chromium":
        raise RuntimeError("Invalid full chromium repo path")


FileList = list[typing.Tuple[pathlib.Path, Modifier]]


def get_files_based_on_git_status(src_dir: os.PathLike, untracked_files_mode: UntrackedFilesMode) -> FileList:
    status_out = git_status(src_dir)
    entries_to_process = []
    for line in status_out.splitlines():
        striped_line = line.strip()
        if len(striped_line) != 0:
            entry, modifier = parse_git_status_line(striped_line)
            if modifier == Modifier.untracked:
                if untracked_files_mode == UntrackedFilesMode.not_allowed:
                    raise RuntimeError(
                        f"Untracked file found while untracked files are not allowed "
                        f"\"{os.path.join(src_dir, entry)}\"")
                elif untracked_files_mode == UntrackedFilesMode.ignored:
                    logging.info(f"Ignoring untracked file \"{os.path.join(src_dir, entry)}\"")
                    continue
            entry_full_path = pathlib.Path(os.path.join(src_dir, entry))
            if entry_full_path.is_dir():
                assert modifier != Modifier.deleted  # TODO: implement it (not needed so far)
                dir_content = get_dir_recursive_content_files(entry_full_path, False)
                expanded_dir_entries = [(item[0].relative_to(src_dir), item[1]) for item in dir_content]
                entries_to_process.extend(expanded_dir_entries)
            else:
                entries_to_process.append((entry, modifier))
    return entries_to_process


def get_dir_recursive_content_files(src_dir: os.PathLike, relative: bool) -> FileList:
    entries_to_process = []
    for p in pathlib.Path(src_dir).rglob("*"):
        if p.is_file():
            entries_to_process.append((p.relative_to(src_dir) if relative else p, Modifier.added))
    return entries_to_process


class FileSource:
    def get_files(self, src_dir: os.PathLike) -> FileList:
        raise NotImplementedError()


class GitStatusBasedFileSource(FileSource):
    def __init__(self, untracked_files_mode: UntrackedFilesMode):
        FileSource.__init__(self)
        self._untracked_files_mode = untracked_files_mode

    def get_files(self, src_dir: os.PathLike) -> FileList:
        return get_files_based_on_git_status(src_dir, self._untracked_files_mode)


class DirRecursiveContentFileSource(FileSource):
    def __init__(self):
        FileSource.__init__(self)

    def get_files(self, src_dir: os.PathLike) -> FileList:
        return get_dir_recursive_content_files(src_dir, True)


def sync_dirs(src_dir: os.PathLike, target_dir: os.PathLike, file_source: FileSource, dry_run: bool):
    dirs_sanity_check(src_dir, target_dir)
    entries_to_process = file_source.get_files(src_dir)
    for src_file, modifier in entries_to_process:
        sync_file(src_dir, target_dir, src_file, modifier, dry_run)
