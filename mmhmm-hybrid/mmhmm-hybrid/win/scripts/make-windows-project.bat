@echo off

if exist "../../../build" (
echo Build directory already exists. Delete before recreating.
pause
exit -1
)

mkdir "../../../build"
cd "../../../build"
cmake -G "Visual Studio 17" -A x64 ..
start Airtime.sln