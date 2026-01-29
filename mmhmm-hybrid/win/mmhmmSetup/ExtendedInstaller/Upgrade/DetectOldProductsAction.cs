using System;
using WixToolset.Dtf.WindowsInstaller;

namespace ExtendedInstaller.Upgrade
{
    internal class DetectOldProductsAction
    {
        internal static ActionResult DetectOldProducts(Session session)
        {
            try
            {
                // Change to per-machine scope to find old products
                session["ALLUSERS"] = "1";
                session.DoAction("FindRelatedProducts");
                if (!string.IsNullOrWhiteSpace(session[LoggingConstants.OldProductFound]))
                {
                    // Old version found, we should install Camera by default.
                    session["CAMERA_NEEDS_UPGRADE"] = "1";
                }

                // Run discovery for pre-user scope.
                session["ALLUSERS"] = "";
                session.DoAction("FindRelatedProducts");
            }
            catch(Exception ex)
            {
                session.Log($"DetectOldProducts::Exception {ex.ToString()}");
            }

            session["ALREADY_RAN_DETECT"] = "1";
            return ActionResult.Success;
        }
    }
}

