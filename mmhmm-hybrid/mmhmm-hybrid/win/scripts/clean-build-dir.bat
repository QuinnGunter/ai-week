@echo off

set build_folder="%~dp0\..\..\..\build"

echo Removing Build directory %build_folder%

DEL /F /Q /S %build_folder%\*

for /D %%i in ("%build_folder%\*") do RD /S /Q "%%i"
RD /S /Q "%build_folder%"
