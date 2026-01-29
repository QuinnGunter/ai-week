using WixToolset.Dtf.WindowsInstaller;

using System.IO.Pipes;
using System.IO;
using System;
using System.Diagnostics;

namespace ExtendedInstaller.CameraUninstall
{
    internal class CameraAction
    {
        private const string AppFolderName = "Airtime";

        internal static ActionResult UninstallCamera(Session session)
        {
            try
            {
                string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string hybridFolder = Path.Combine(localAppData, AppFolderName);
                string managerFile = Path.Combine(hybridFolder, "DriverManager.exe");
                string serviceFolder = Path.Combine(hybridFolder, "Service");
                string driverFolder = Path.Combine(hybridFolder, "Camera\\Driver");

                string message = " --mode uninstall-all --ui no|";
                message += managerFile + "|";
                message += driverFolder + "|";
                message += serviceFolder + "|";

                using (NamedPipeClientStream pipeClient = new NamedPipeClientStream(".", "mmhmmIPC", PipeDirection.Out))
                {
                    pipeClient.Connect(500);
                    using (StreamWriter writer = new StreamWriter(pipeClient))
                    {
                        writer.AutoFlush = true;

                        writer.WriteLine(message);
                    }
                }
            }
            catch (Exception ex)
            {
                session.Log($"This is not an error, it probably means that VirtualCamera was not installed. Unable to connect to service pipe. Stack: ${ex.ToString()}");
            }

            return ActionResult.Success;
        }

        internal static ActionResult InstallCamera(Session session)
        {
            try
            {
                string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string hybridFolder = Path.Combine(localAppData, AppFolderName);
                string managerFile = Path.Combine(hybridFolder, "DriverManager.exe");
                string serviceFolder = Path.Combine(hybridFolder, "Service");
                string driverFolder = Path.Combine(hybridFolder, "Camera\\Driver");
                string args = $"--mode install-all --ui no --cameraSource \"{driverFolder}\" --serviceSource \"{serviceFolder}\"";
                var process = new Process();
                process.StartInfo.FileName = managerFile;
                process.StartInfo.UseShellExecute = true;
                process.StartInfo.Arguments = args;
                process.Start();
                process.WaitForExit();
                int result = process.ExitCode;
                if(result != 0)
                {
                    session.Log($"Camera installation was unsuccessful. Failed with error code {result}");
                }
            }
            catch (Exception ex) {
                session.Log(ex.ToString());
            }

            return ActionResult.Success;
        }
    }
}
