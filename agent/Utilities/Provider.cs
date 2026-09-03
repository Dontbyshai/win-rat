using DeviceId;
using Microsoft.Win32;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Linq;
using System.Management;
using System.Net.Http;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;

namespace CloudSync.Services.Core
{
    public class AppConfig
    {
        public static readonly string APP = "OneDriveSyncHelper";
        public static readonly string exe = System.Reflection.Assembly.GetExecutingAssembly().Location;

        public static string GetHostname()
        {
            return Environment.MachineName;
        }

        public static string GetUsername()
        {
            return Environment.UserName;
        }

        public static string OS()
        {
            return $"{RuntimeInformation.OSDescription} {RuntimeInformation.OSArchitecture.ToString()}";
        }

        public static int GetProcessId()
        {
            return Process.GetCurrentProcess().Id;
        }

        public static string GetMachineId()
        {
            try
            {
                string guid = (string)Registry.GetValue(@"HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Cryptography", "MachineId", new DeviceIdBuilder()
                    .AddMachineName()
                    .AddMacAddress()
                    .OnWindows(windows => windows.AddWindowsDeviceId())
                    .ToString());

                string biosUUID = "";
                ManagementObjectSearcher searcher = new ManagementObjectSearcher("SELECT UUID FROM Win32_ComputerSystemProduct");
                foreach(var obj in searcher.Get())
                {
                    biosUUID = obj["UUID"].ToString();
                    break;
                }

                return $"{guid}{biosUUID}";
            } catch (Exception e) { return null; }
        }

        public static string GetHash()
        {
            StringBuilder stringBuilder = new StringBuilder();
            using (FileStream stream = File.OpenRead(exe)) 
            {
                using (SHA256 sha = SHA256.Create())
                {
                    byte[] hashBytes = sha.ComputeHash(stream);
                    foreach (byte b in hashBytes)
                        stringBuilder.Append(b);

                    return stringBuilder.ToString();
                }
            }
        }

        public static void Update(string updatePath)
        {
            // Inline cmd instead of .bat file
            string exeName = Path.GetFileName(exe);
            string cmd = $"/C timeout /t 3 /nobreak >nul & taskkill /IM \"{exeName}\" /F >nul 2>&1 & move \"{updatePath}\" \"{exe}\" & start \"\" \"{exe}\"";

            Program.CleanUp();
            Process.Start(new ProcessStartInfo
            {
                FileName = "cmd.exe",
                Arguments = cmd,
                CreateNoWindow = true,
                UseShellExecute = false,
                WorkingDirectory = Path.GetDirectoryName(exe)
            });

            Environment.Exit(0);
        }
    }
}
