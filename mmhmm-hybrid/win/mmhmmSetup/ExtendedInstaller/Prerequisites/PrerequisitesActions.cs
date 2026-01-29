using System.Diagnostics;
using System.Linq;
using System.IO;
using System;

using WixToolset.Dtf.WindowsInstaller;

using ExtendedInstaller.MixPanel;
using System.Threading;

namespace ExtendedInstaller.Prerequisites
{
    internal class PrerequisitesActions
    {
        private const long REQUIRED_DISK_SPACE = 824 * 1024 * 1024; // 824MB in bytes
        private const string AppName = "Airtime";

        internal static ActionResult CheckPrerequisites(Session session)
        {
            // After user consent with admin privileges this action may be called second time (BeforeLaunchConditions)
            // Skip it at seccond attempt, we don't need to recheck anything.
            if (session[LoggingConstants.PrereqStatus] != "0")
                return ActionResult.Success;

            string installed = session[LoggingConstants.InstalledKey];
            string oldProductFound = session[LoggingConstants.OldProductFound];

            // Clean deferred error temporary file
            MixPanelMessage.CleanUpDeferredError(session);

            session.Log("Installed property: " + installed);
            session.Log("OLDPRODUCTFOUND property: " + oldProductFound);

            bool isFreshInstall = false;

            if (string.IsNullOrEmpty(installed) && string.IsNullOrEmpty(oldProductFound))
                isFreshInstall = true;

            session[LoggingConstants.PrereqStatus] = "2";
            bool isProcessRunning = Process.GetProcessesByName(AppName).Any();
            int tries = 6;
            while (isProcessRunning && tries > 0)
            {
                try
                {
                    var appProcesses = Process.GetProcessesByName(AppName);
                    foreach (var process in appProcesses)
                    {
                        process.Kill();
                    }
                    Thread.Sleep(5000);
                }
                catch (Exception ex)
                {
                    session.Log($"{ex.ToString()}");
                }
                isProcessRunning = Process.GetProcessesByName(AppName).Any();
                tries--;
            }

            if (isProcessRunning)
            {
                session[LoggingConstants.PrereqFailedReason] = $"Application {AppName} is running. Please close this process and restart the installation.";
                session[LoggingConstants.PrereqStatus] = "1";
                session[LoggingConstants.ExtendedErrorKey] = $"{AppName} is running";
            }

            string arch = Environment.GetEnvironmentVariable("PROCESSOR_ARCHITECTURE", EnvironmentVariableTarget.Machine);
            // Allow to proceed only on X64 architecture.
            if (!string.Equals(arch, "amd64", StringComparison.OrdinalIgnoreCase))
            {
                session[LoggingConstants.PrereqFailedReason] = "This application requires a 64-bit (x64) processor. Installation cannot proceed on 32-bit (x86) or ARM systems.";
                session[LoggingConstants.PrereqStatus] = "1";
                session[LoggingConstants.ExtendedErrorKey] = "unsupported architecture";
            }

            // Check available disk space on system disk as we are deploying app into AppData folder.
            string installDrive = Path.GetPathRoot(Environment.SystemDirectory);
            DriveInfo drive = new DriveInfo(installDrive);
            if (drive.AvailableFreeSpace < REQUIRED_DISK_SPACE)
            {
                session[LoggingConstants.PrereqFailedReason] = $"Insufficient disk space. The application requires at least 824 MB of free space. Available space: {drive.AvailableFreeSpace / (1024 * 1024)} MB";
                session[LoggingConstants.PrereqStatus] = "1";
                session[LoggingConstants.ExtendedErrorKey] = "insufficient disk space";
            }

            // Check if OS is Windows 10 version 1809 or newer
            bool isWindows10OrNewer = IsWindows10Version1809OrNewer();
            if (!isWindows10OrNewer)
            {
                session[LoggingConstants.PrereqFailedReason] = "This application requires Windows 10 version 1809 or newer. Please update your operating system and try again.";
                session[LoggingConstants.PrereqStatus] = "1";
                session[LoggingConstants.ExtendedErrorKey] = "bad OS";
            }

            // We are in early stage of installation here.
            // We need to check if prerequisities didn't met and raise failure to MixPanel,
            // as it will be not triggered by wix flow.
            if (isFreshInstall && session[LoggingConstants.PrereqStatus] == "1")
            {
                MixPanelActions.GenerateUserUUID(session);
                MixPanelActions.ReportInstallAttempted(session);
                MixPanelActions.ReportInstallError(session);
            }

            // Log the results
            session.Log($"Process {AppName} running: {isProcessRunning}, Windows 10 1809 or newer: {isWindows10OrNewer}");

            return ActionResult.Success;
        }

        private static bool IsWindows10Version1809OrNewer()
        {
            // Check OS version
            Version currentVersion = Environment.OSVersion.Version;
            Version requiredVersion = new Version(10, 0, 17763); // Windows 10 version 1809

            return currentVersion >= requiredVersion;
        }
    }
}

