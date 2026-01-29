using System;

using WixToolset.Dtf.WindowsInstaller;

using ExtendedInstaller.Sentry;

namespace ExtendedInstaller.MixPanel
{
    internal class MixPanelActions
    {
        internal static ActionResult GenerateUserUUID(Session session)
        {
            try
            {
                var userUUID = session[LoggingConstants.UserIdKey];
                session.Log("GenerateUserUUID: " + userUUID);
                if (string.IsNullOrEmpty(userUUID))
                {
                    session[LoggingConstants.UserIdKey] = Guid.NewGuid().ToString();
                }
                else
                {
                    session.Log("Already has a UUID in the registry.");
                }
            }
            catch (Exception ex)
            {
                session.Log(ex.ToString());
            }

            return ActionResult.Success;
        }

        internal static ActionResult ReportInstallAttempted(Session session)
        {
            try
            {
                // Clear any deffered error which may be present in temporary file.
                MixPanelMessage.CleanUpDeferredError(session);

                MixPanelMessage.SendMessage(session, LoggingConstants.InstallAttemptedEvent);
            }
            catch (Exception ex)
            {
                session.Log($"Error during reporting install attempted. Ex: {ex.ToString()}");
            }

            return ActionResult.Success;
        }

        internal static ActionResult ReportInstallSuccess(Session session)
        {
            try
            {
                var remove = session[LoggingConstants.RemoveKey];
                if (string.IsNullOrEmpty(remove))
                {
                    MixPanelMessage.SendMessage(session, LoggingConstants.InstallSuccessfulEvent);
                }
                else
                {
                    MixPanelMessage.SendMessage(session, LoggingConstants.UninstallSuccessfulEvent);
                }
            }
            catch (Exception ex)
            {
                session.Log($"Error during reporting install success. Ex: {ex.ToString()}");
            }

            return ActionResult.Success;
        }

        internal static ActionResult ReportInstallCancelled(Session session)
        {
            try
            {
                MixPanelMessage.SendMessage(session, LoggingConstants.InstallCancelledEvent);
            }
            catch (Exception ex)
            {
                session.Log($"Error during reporting install canceled. Ex: {ex.ToString()}");
            }

            return ActionResult.Success;
        }

        internal static ActionResult ReportInstallError(Session session)
        {
            try
            {
                // Check if we can extract error from temporary file.
                string deferredError = MixPanelMessage.GetDeferredError(session);

                if (!string.IsNullOrEmpty(deferredError))
                {
                    session[LoggingConstants.ExtendedErrorKey] = deferredError;
                }

                SentryLogger.SendLogToSentry(session);
                MixPanelMessage.SendMessage(session, LoggingConstants.InstallFailedEvent);
            }
            catch (Exception ex)
            {
                session.Log($"Error during reporting report install fail. Error: {ex.ToString()}");
            }

            return ActionResult.Success;
        }
    }
}
