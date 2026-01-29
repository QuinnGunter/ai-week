using WixToolset.Dtf.WindowsInstaller;

using ExtendedInstaller.MixPanel;
using ExtendedInstaller.Prerequisites;
using ExtendedInstaller.CameraUninstall;
using ExtendedInstaller.Upgrade;
using ExtendedInstaller.UninstallForm;

namespace ExtendedInstaller
{
    public class CustomActions
    {
        [CustomAction]
        public static ActionResult GenerateUserUUID(Session session)
        {
            return MixPanelActions.GenerateUserUUID(session);
        }

        [CustomAction]
        public static ActionResult ReportInstallAttempted(Session session)
        {
            return MixPanelActions.ReportInstallAttempted(session);
        }

        [CustomAction]
        public static ActionResult ReportInstallSuccess(Session session)
        {
            return MixPanelActions.ReportInstallSuccess(session);
        }

        [CustomAction]
        public static ActionResult ReportInstallCancelled(Session session)
        {
            return MixPanelActions.ReportInstallCancelled(session);
        }

        [CustomAction]
        public static ActionResult ReportInstallError(Session session)
        {
            return MixPanelActions.ReportInstallError(session);
        }

        [CustomAction]
        public static ActionResult CheckPrerequisites(Session session)
        {
            return PrerequisitesActions.CheckPrerequisites(session);
        }

        [CustomAction]
        public static ActionResult UninstallCamera(Session session)
        {
            return CameraAction.UninstallCamera(session);
        }

        [CustomAction]
        public static ActionResult InstallCamera(Session session)
        {
            return CameraAction.InstallCamera(session);
        }

        [CustomAction]
        public static ActionResult DetectOldProducts(Session session)
        {
            return DetectOldProductsAction.DetectOldProducts(session);
        }

        [CustomAction]
        public static ActionResult ShowUninstallForm(Session session)
        {
            return UninstallFormAction.ShowUninstallDialog(session);
        }
    }
}
