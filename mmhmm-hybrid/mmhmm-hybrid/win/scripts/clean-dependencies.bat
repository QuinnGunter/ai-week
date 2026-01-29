@echo off

set third_party_folder="%~dp0\..\..\..\third_party"
set camera_folder="%~dp0\..\..\..\win\Camera"

echo Removing CEF and seglib %third_party_folder%

DEL /F /Q /S %third_party_folder%\*

for /D %%i in ("%third_party_folder%\*") do RD /S /Q "%%i"
RD /S /Q "%third_party_folder%"

echo Removing Camera package %camera_folder%
DEL /F /Q /S %camera_folder%\*

for /D %%i in ("%camera_folder%\*") do RD /S /Q "%%i"
RD /S /Q "%camera_folder%"
