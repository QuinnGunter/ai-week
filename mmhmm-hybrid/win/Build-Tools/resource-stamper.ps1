param(
    [string]$AppDll,
    [string]$BootstrapExe,
    [string]$RceditExe,
    [string]$IconPath
)

$version = (Get-Item $AppDll).VersionInfo.FileVersion
Write-Host "Stamping bootstrapper with version $version"

& $RceditExe $BootstrapExe `
    --set-file-version $version `
    --set-product-version $version `
    --set-version-string FileDescription "Airtime" `
    --set-version-string ProductName "Airtime" `
    --set-icon $IconPath `
    --set-version-string CompanyName "mmhmm" `
    --set-version-string OriginalFilename "Airtime.exe" `
    --set-version-string LegalCopyright "Copyright © 2020-2025 mmhmm inc. All rights reserved." `

