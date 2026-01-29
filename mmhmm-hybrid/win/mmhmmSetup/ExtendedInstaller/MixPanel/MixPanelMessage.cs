using System;
using System.IO;

using Mixpanel;

using WixToolset.Dtf.WindowsInstaller;

namespace ExtendedInstaller.MixPanel
{
    internal class MixPanelMessage
    {
        internal static void SendMessage(Session session, string analytic)
        {
            try
            {
                var trackValue = session[LoggingConstants.AppTrackKey];
                var track = Track.GetFriendlyTrackName(trackValue);
                var token = Track.GetTokenForTrack(trackValue);
                var uuid = session[LoggingConstants.UserIdKey];
                var appVersion = session[LoggingConstants.AppVersionKey];
                var extendedError = session[LoggingConstants.ExtendedErrorKey];
                var uninstallReason = session[LoggingConstants.UninstallReason];
                var mode = GetAppModeMixpanelString(session[LoggingConstants.AppModeName]);

                var mixpanel = new MixpanelClient(token, new MixpanelConfig() { IpAddressHandling = MixpanelIpAddressHandling.UseRequestIp });

                mixpanel.TrackAsync(analytic, new
                {
                    DistinctId = uuid,
                    hybrid_version = appVersion,
                    release_track = track,
                    app = LoggingConstants.AppName,
                    hardware_id = uuid,
                    os = LoggingConstants.OsName,
                    os_version = SystemInfo.GetWindowsVersion(),
                    hardware_signature = SystemInfo.GetHardwareSignature(),
                    language = SystemInfo.GetLanguage(),
                    cores = SystemInfo.GetProcessorCount(),
                    gpu = SystemInfo.GetGpuName(),
                    processor = SystemInfo.GetProcessorName(),
                    ErrorSignature = extendedError,
                    UninstallReason = uninstallReason,
                    mode = mode
                }).Wait();
            }
            catch (Exception ex)
            {
                session.Log($"Error during sending message. Ex: {ex.ToString()}");
            }
        }

        internal static void SetDeferredError(Session session, string value)
        {
            try
            {
                // Write the value to a temporary file
                string outputFilePath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Temp");
                string tempFilePath = Path.Combine(outputFilePath, LoggingConstants.TempDeferredErrorFileName);
                File.WriteAllText(tempFilePath, value);

                session.Log("Deferred action set error value to: " + value);
            }
            catch (Exception ex)
            {
                session.Log("Error in SetDeferredError: " + ex.Message);
            }
        }

        internal static string GetDeferredError(Session session)
        {
            try
            {
                // Read the value from the temporary file
                string outputFilePath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Temp");
                string tempFilePath = Path.Combine(outputFilePath, LoggingConstants.TempDeferredErrorFileName);
                if (File.Exists(tempFilePath))
                {
                    string valueRead = File.ReadAllText(tempFilePath);
                    session.Log("Action read value: " + valueRead);
                    return valueRead;
                }

                return string.Empty;
            }
            catch (Exception ex)
            {
                session.Log("Error in GetDeferredError: " + ex.Message);
                return string.Empty;
            }
        }

        internal static void CleanUpDeferredError(Session session)
        {
            try
            {
                // Delete the temporary file
                string outputFilePath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Temp");
                string tempFilePath = Path.Combine(outputFilePath, LoggingConstants.TempDeferredErrorFileName);
                if (File.Exists(tempFilePath))
                {
                    File.Delete(tempFilePath);
                    session.Log("Deleted temporary error file.");
                }
                else
                {
                    session.Log("Temporary file not found for deletion.");
                }
            }
            catch (Exception ex)
            {
                session.Log("Error in CleanUpDeferredError: " + ex.Message);
            }
        }

        internal static string GetAppModeMixpanelString(string appMode)
        {
            return appMode?.ToLower() == LoggingConstants.AppModeMiniName.ToLower() ? LoggingConstants.CameraModeName : LoggingConstants.CreatorModeName;
        }
    }
}
