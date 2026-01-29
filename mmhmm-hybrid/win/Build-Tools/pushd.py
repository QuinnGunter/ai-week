import contextlib
import os

@contextlib.contextmanager
def pushd(new_dir):
    print("pushd")
    print(new_dir)
    previous_dir = os.getcwd()
    print(previous_dir)
    os.chdir(new_dir)
    try:
        yield
    finally:
        os.chdir(previous_dir)