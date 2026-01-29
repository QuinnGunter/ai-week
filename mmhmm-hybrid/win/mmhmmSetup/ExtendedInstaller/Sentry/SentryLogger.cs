using System;
using System.IO;
using System.Net;
using System.Text.RegularExpressions;

using Sentry;

using WixToolset.Dtf.WindowsInstaller;

using ExtendedInstaller.MixPanel;

namespace ExtendedInstaller.Sentry
{
    internal static class SentryLogger
    {
        internal static void SendLogToSentry(Session session)
        {
            try
            {
                var logPath = session[LoggingConstants.LogFilePathName];
                var trackValue = session[LoggingConstants.AppTrackKey];
                var appVersion = session[LoggingConstants.AppVersionKey];
                appVersion = FormatAppVersion(appVersion);

                var outputFilePath = CopyLogFileForSentry(session, logPath);
                var sent = SendAttachmentToSentry(LoggingConstants.InstallationErrorMessage, Track.GetFriendlyTrackName(trackValue), appVersion, outputFilePath);
                if (!sent)
                    session.Log("Unable to save log");

                File.Delete(outputFilePath);
            }
            catch (Exception ex)
            {
                session.Log(ex.ToString());
            }
        }

        private static string FormatAppVersion(string appVersion)
        {
            Version formatted_version;
            if (Version.TryParse(appVersion, out formatted_version))
            {
                appVersion = formatted_version.ToString(3);
            }
            else
            {
                // App version was malformed, set to zero so it is valid.
                appVersion = "0.0.0";
            }

            return appVersion;
        }

        private static bool SendAttachmentToSentry(string message, string environment, string version, string logpath)
        {
            ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;
            using (SentrySdk.Init(options =>
            {
                options.Dsn = LoggingConstants.SentryDsn;
                options.AutoSessionTracking = false;
                options.AttachStacktrace = false;
                options.CacheDirectoryPath = null;
                options.EnableTracing = false;
                options.Environment = environment;
                options.FlushTimeout = TimeSpan.FromSeconds(10);
                options.IsGlobalModeEnabled = false;
                options.Release = "mmhmm-hybrid-win@"+version;
                options.ShutdownTimeout = TimeSpan.FromSeconds(10);
            }))
            {
                SentrySdk.CaptureMessage(message, scope =>
                {
                    scope.Level = SentryLevel.Error;
                    scope.AddAttachment(logpath);
                });

                SentrySdk.Flush();
            }
            return true;
        }

        private static string CopyLogFileForSentry(Session session, string logPath)
        {
            string outputFilePath = Path.GetDirectoryName(logPath);
            outputFilePath = outputFilePath + Path.DirectorySeparatorChar + LoggingConstants.TempLogFileName + Path.GetExtension(logPath);
            using (var inputStream = new FileStream(logPath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
            using (var outputStream = new FileStream(outputFilePath, FileMode.Create))
            {
                string contents;
                using (var reader = new StreamReader(inputStream))
                using (var writer = new StreamWriter(outputStream))
                {
                    while ((contents = reader.ReadLine()) != null)
                    {
                        if (ShouldLogLine(contents))
                        {
                            contents = AnonymiseString(contents);
                            writer.WriteLine(contents);
                        }
                    }
                }
            }
            return outputFilePath;
        }

        private static bool ShouldLogLine(string line)
        {
            return !string.IsNullOrWhiteSpace(line) && line.ToLower().Contains("error");
        }

        private static string AnonymiseString(string content)
        {
            return RemoveFilepathInfo(RemoveUsernameInfo(content));
        }

        private static string RemoveUsernameInfo(string content)
        {
            return content.Contains(LoggingConstants.LogUsernameToken) ? string.Empty : content;
        }

        private static string RemoveFilepathInfo(string content)
        {
            return Regex.Replace(content, LoggingConstants.FilePathPattern, string.Empty);
        }
    }
}
