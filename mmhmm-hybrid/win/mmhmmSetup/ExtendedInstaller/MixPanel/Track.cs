namespace ExtendedInstaller.MixPanel
{
    internal class Track
    {
        internal static string GetTokenForTrack(string track)
        {
            return LoggingConstants.ProductionToken;
        }

        internal static string GetFriendlyTrackName(string track)
        {
            if (!string.IsNullOrEmpty(track))
            {
                if (string.Compare(track.ToLower(), LoggingConstants.UatEnvironment) == 0 ||
                    string.Compare(track.ToLower(), LoggingConstants.QaEnvironment) == 0)
                {
                    return LoggingConstants.DevelopmentFriendlyName;
                }
                else if (string.Compare(track.ToLower(), LoggingConstants.BetaEnvironment) == 0 ||
                    string.Compare(track.ToLower(), LoggingConstants.ProductionEnvironment) == 0)
                {
                    return LoggingConstants.ProductionFriendlyName;
                }
            }

            return LoggingConstants.ProductionFriendlyName;
        }
    }
}
