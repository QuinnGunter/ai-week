@echo off
set SOURCES_DIR=%1

if "%SOURCES_DIR%"=="" (
  echo Error: SOURCES_DIR is not provided.
  exit /b 1
)

echo locating visual studio installation...
for /f "tokens=*" %%i in ('"vswhere.exe" -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath') do set VSPATH=%%i
echo visual studio path: %VSPATH%

echo locating runtime files for x64...
for /d %%d in ("%VSPATH%\VC\Redist\MSVC\*") do (
  if exist "%%d\x64\Microsoft.VC143.CRT" set VCREDIST_X64=%%d\x64\Microsoft.VC143.CRT
)

if not defined VCREDIST_X64 (
  echo runtime files for x64 not found.
  exit /b 1
)

echo copying x64 runtime files from: %VCREDIST_X64% to: %SOURCES_DIR%

xcopy /Y /S "%VCREDIST_X64%\*.*" "%SOURCES_DIR%"
