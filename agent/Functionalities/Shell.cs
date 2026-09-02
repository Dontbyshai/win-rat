using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace G2DK.Functionalities
{
    public class Shell
    {
        public static async Task<string> ExecuteCommand(string command)
        {
            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName = "cmd.exe",
                    Arguments = "/C " + command,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                using (var process = new Process { StartInfo = psi })
                {
                    var stdout = new StringBuilder();
                    var stderr = new StringBuilder();

                    process.OutputDataReceived += (s, e) =>
                    {
                        if (e.Data != null)
                            stdout.AppendLine(e.Data);
                    };

                    process.ErrorDataReceived += (s, e) =>
                    {
                        if (e.Data != null)
                            stderr.AppendLine(e.Data);
                    };

                    process.Start();

                    // IMPORTANT: start async drain immediately
                    process.BeginOutputReadLine();
                    process.BeginErrorReadLine();

                    bool exited = await Task.Run(() => process.WaitForExit(30000));

                    if (!exited)
                    {
                        try { process.Kill(); } catch { }

                        return $"{stdout.ToString()}\n{stderr.ToString()}\n";
                    }

                    // Flush remaining async output
                    process.WaitForExit();

                    return $"{stdout.ToString()}\n{stderr.ToString()}\n";
                }
            }
            catch (Exception ex)
            {
                // Console.WriteLine(ex.Message);
                return null;
            }
        }
    }
}
