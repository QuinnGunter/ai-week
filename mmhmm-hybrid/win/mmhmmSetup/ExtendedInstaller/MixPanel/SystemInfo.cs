using System;
using System.Globalization;
using System.Management;

using Microsoft.Win32;

namespace ExtendedInstaller.MixPanel
{
    internal static class SystemInfo
    {
        internal const string Unknown = "Unknown";
        internal static string GetLanguage()
        {
            return CultureInfo.InstalledUICulture.Name;
        }

        internal static string GetWindowsVersion()
        {
            try
            {
                using (var registryKey = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Windows NT\CurrentVersion"))
                {
                    var buildNumber = registryKey.GetValue("UBR").ToString();
                    var version = registryKey.GetValue("CurrentBuild").ToString();

                    return version + "." + buildNumber;
                }
            }
            catch
            {
                return Unknown;
            }
        }

        internal static string GetProcessorId()
        {
            string processorId = Unknown;
            try
            {
                using (var managementClass = new ManagementClass("win32_processor"))
                {
                    foreach (var managementObject in managementClass.GetInstances())
                    {
                        processorId = managementObject.Properties["processorID"].Value.ToString();
                    }
                    return processorId;
                }
            }
            catch { return processorId; }
        }

        internal static string GetMotherboardId()
        {
            string serial = Unknown;
            try
            {
                using (var managementObjectSearcher = new ManagementObjectSearcher("SELECT SerialNumber FROM Win32_BaseBoard"))
                {
                    foreach (var managementObject in managementObjectSearcher.Get())
                    {
                        serial = managementObject["SerialNumber"].ToString();
                    }
                    return serial;
                }
            }
            catch { return serial; }
        }

        internal static string GetBiosSerialNumber()
        {
            string serial = Unknown;
            try
            {
                using (var managementObjectSearcher = new ManagementObjectSearcher("SELECT * FROM Win32_BIOS"))
                {
                    foreach (var managementObject in managementObjectSearcher.Get())
                    {
                        serial = managementObject["SerialNumber"].ToString();
                    }
                    return serial;
                }
            }
            catch { return serial; }
        }

        internal static string GetHardwareSignature()
        {
            return $"{GetProcessorId()}:{GetMotherboardId()}:{GetBiosSerialNumber()}";
        }

        internal static string GetProcessorName()
        {
            string name = Unknown;
            try
            {
                using (var managementObjectSearcher = new ManagementObjectSearcher("root\\CIMV2", "SELECT * FROM Win32_Processor"))
                {
                    foreach (var managementObject in managementObjectSearcher.Get())
                    {
                        name = managementObject["Name"].ToString();
                    }
                    return name;
                }
            }
            catch { return name; }
        }

        internal static string GetProcessorCount()
        {
            return Environment.ProcessorCount.ToString();
        }

        internal static string GetGpuName()
        {
            string name = Unknown;
            try
            {
                using (var searcher = new ManagementObjectSearcher("select * from Win32_VideoController"))
                {
                    foreach (var managementObject in searcher.Get())
                    {
                        name = managementObject["Name"].ToString();
                    }
                    return name;
                }
            }
            catch { return name; }
        }
    }
}
