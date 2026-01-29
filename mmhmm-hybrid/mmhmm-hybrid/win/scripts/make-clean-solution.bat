@echo off

echo Clean Dependencies
call clean-dependencies.bat
echo Clean Build Directory
call clean-build-dir.bat
echo Make Windows Project
call make-windows-project.bat