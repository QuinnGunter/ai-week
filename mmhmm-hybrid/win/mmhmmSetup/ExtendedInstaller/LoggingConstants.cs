namespace ExtendedInstaller
{
    public static class LoggingConstants
    {
        public const string UatEnvironment = "uat";
        public const string QaEnvironment = "qa";
        public const string BetaEnvironment = "beta";
        public const string ProductionEnvironment = "prod";
        public const string DevelopmentFriendlyName = "development";
        public const string ProductionFriendlyName = "production";
        public const string ProductionToken = "0c26da7066a11eaf69262e5020ebbccf";
        public const string AppTrackKey = "AppTrack";
        public const string UserIdKey = "USERUUID";
        public const string AppVersionKey = "APPVERSION";
        public const string ExtendedErrorKey = "ExtendedError";
	    public const string UninstallReason = "UNINSTALL_REASON";
        public const string RemoveKey = "REMOVE";
        public const string InstalledKey = "Installed";
        public const string OldProductFound = "OLDPRODUCTFOUND";
        public const string PrereqFailedReason = "PREREQ_FAILURE_REASON";
        public const string PrereqStatus = "PREREQ_STATUS";
        public const string AppName = "mmhmm.windows.hybrid";
        public const string InstallAttemptedEvent = "application_installation_attempted";
        public const string InstallSuccessfulEvent = "application_installation_successful";
        public const string UninstallSuccessfulEvent = "application_uninstallation_successful";
        public const string InstallCancelledEvent = "application_installation_cancelled";
        public const string InstallFailedEvent = "application_installation_failed";
        public const string OsName = "Windows";
        public const string LogUsernameToken = "USERNAME";
        public const string FilePathPattern = @"(?<=\[)[a-zA-Z]:\\.*(?=])|(?<="")[a-zA-Z]:\\.*(?="")|([a-zA-Z]:\\[^\s]*)";
        public const string TempLogFileName = "Airtime_log";
        public const string TempDeferredErrorFileName = "mmhmm_deferred_error";
        public const string LogFilePathName = "MsiLogFileLocation";
        public const string InstallationErrorMessage = "Error installing application";
        public const string SentryDsn = "https://de77b03c5f534ee19bfcc88647152bf5@o405401.ingest.sentry.io/6731868";
        public const string AppModeName = "AppMode";
        public const string CameraModeName = "camera";
        public const string CreatorModeName = "creator";
        public const string AppModeFullName = "full";
        public const string AppModeMiniName = "mini";
    }
}
