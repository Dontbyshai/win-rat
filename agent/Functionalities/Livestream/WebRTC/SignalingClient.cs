using CloudSync.Services.Core;
using Newtonsoft.Json;
using SIPSorcery.Net;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Security.Policy;
using System.Threading;
using System.Threading.Tasks;
using static CloudSync.Services.Core.SyncService;
using static System.Collections.Specialized.BitVector32;

namespace CloudSync.Services.Modules.Stream.Signaling
{
    /// <summary>
    /// REST API client for WebRTC signaling with the backend server.
    /// </summary>
    public class SignalingClient : IDisposable
    {
        private readonly HttpClient _httpClient;
        private readonly string _roomId;
        public string _session = null;
        private readonly string _clientId;
        private readonly CancellationTokenSource _pollCts = new CancellationTokenSource();
        private bool _disposed;

        public event Action<string> OnAnswerReceived;
        public event Action<IceCandidateDto> OnIceCandidateReceived;
        public event Action<string> OnSessionFound;
        public event Action<string> OnError;

        public SignalingClient(string session)
        {
            _session = session;

            _httpClient = new HttpClient
            {
                BaseAddress = new Uri(SyncService.URL.Replace("/api", "") + "/"),
                Timeout = TimeSpan.FromSeconds(30)
            };
            _httpClient.DefaultRequestHeaders.Accept.Add(
                new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));

            
            // // Console.WriteLine($"[Signaling] Room: {roomId}");
        }

        /// <summary>
        /// Sends the SDP offer to the signaling server.
        /// </summary>
        public async Task<bool> SendOfferAsync(string sdpOffer)
        {
            try
            {
                var payload = new
                {
                    id = _session,
                    sdp = sdpOffer,
                    machine_id = AppConfig.GetMachineId()
                };

                var json = JsonConvert.SerializeObject(payload);
                var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");

                var response = await _httpClient.PostAsync($"api/livestream-offer", content);
                var jsonResponse = await response.Content.ReadAsStringAsync();
                // Console.WriteLine($"[Signaling]Sending offer: {jsonResponse}");

                if (response.IsSuccessStatusCode)
                {
                    // Console.WriteLine("[Signaling] Offer sent successfully");
                    return true;
                }

                var error = await response.Content.ReadAsStringAsync();
                // Console.WriteLine($"[Signaling] Failed to send offer: {response.StatusCode} - {error}");
                OnError?.Invoke($"Failed to send offer: {response.StatusCode}");
                return false;
            }
            catch (Exception ex)
            {
                // Console.WriteLine($"[Signaling] Error sending offer: {ex.Message}");
                OnError?.Invoke(ex.Message);
                return false;
            }
        }

        /// <summary>
        /// Sends an ICE candidate to the signaling server.
        /// </summary>
        public async Task SendIceCandidateAsync(RTCIceCandidate candidate)
        {
            try
            {
                var payload = new
                {
                    candidate,
                    id = _session,
                    machine_id = AppConfig.GetMachineId()
                };

                var json = JsonConvert.SerializeObject(payload);
                var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");

                var response = await _httpClient.PostAsync($"api/livestream-ice/client", content);

                if (!response.IsSuccessStatusCode)
                {
                    var error = await response.Content.ReadAsStringAsync();
                    // Console.WriteLine($"[Signaling] Failed to send ICE candidate: {error}");
                }
            }
            catch (Exception ex)
            {
                // Console.WriteLine($"[Signaling] Error sending ICE candidate: {ex.Message}");
            }
        }

        /// <summary>
        /// Polls the server to find an existing session where a viewer (React app) is waiting.
        /// Returns true when a session is found, false if cancelled.
        /// </summary>
        public async Task<bool> WaitForExistingSessionAsync()
        {
            // Console.WriteLine("[Signaling] Waiting for a viewer to create a session...");

            while (!_pollCts.Token.IsCancellationRequested)
            {
                try
                {
                    OnSessionFound?.Invoke(_session);
                    return true;
                    //var response = await _httpClient.GetAsync(
                    //    $"api/command?id={AppConfig.GetMachineId()}",
                    //    _pollCts.Token);

                    //if (response.IsSuccessStatusCode)
                    //{
                    //    var jsonResponse = await response.Content.ReadAsStringAsync();
                    //    // Console.WriteLine($"[Signaling] Checking for session: {jsonResponse}");
                    //    var data = JsonConvert.DeserializeObject<JoinRequestResponse>(jsonResponse);

                    //    if (string.Equals(data.Status, "success", StringComparison.OrdinalIgnoreCase))
                    //    {
                    //        foreach (var input in data.Data)
                    //        {
                    //            if (!string.IsNullOrEmpty(input.Extra))
                    //            {
                    //                _session = input.Extra;
                    //                // Console.WriteLine($"[Signaling] Found existing session: {_session}");
                    //                OnSessionFound?.Invoke(_session);
                    //                return true;
                    //            }
                    //        }
                    //    }
                    //}

                    await Task.Delay(1000, _pollCts.Token);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
                catch (Exception ex)
                {
                    // Console.WriteLine($"[Signaling] Error checking for session: {ex.Message}");
                    try
                    {
                        await Task.Delay(2000, _pollCts.Token);
                    }
                    catch (OperationCanceledException)
                    {
                        break;
                    }
                }
            }

            return false;
        }

        /// <summary>
        /// Starts polling for SDP answer and ICE candidates from the server.
        /// Call this AFTER a session has been found and offer has been sent.
        /// </summary>
        public void StartPolling()
        {
            Task.Run(() => PollForAnswerAsync());
            Task.Run(() => PollForIceCandidatesAsync());
        }

        private async Task PollForAnswerAsync()
        {
            var answerReceived = false;

            while (!_pollCts.Token.IsCancellationRequested && !answerReceived)
            {
                try
                {
                    var response = await _httpClient.GetAsync(
                        $"api/livestream-session?id={_session}&target_id={AppConfig.GetMachineId()}",
                        _pollCts.Token);

                    if (response.IsSuccessStatusCode)
                    {
                        var jsonResponse = await response.Content.ReadAsStringAsync();
                        // Console.WriteLine(jsonResponse);
                        var message = JsonConvert.DeserializeObject<SignalingMessage>(jsonResponse);

                        if (message?.Data.Answer != null)
                        {
                            // Console.WriteLine("[Signaling] Answer received");
                            OnAnswerReceived?.Invoke(message.Data.Answer);
                            answerReceived = true;
                            continue;
                        }
                    }

                    await Task.Delay(500, _pollCts.Token);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
                catch (Exception ex)
                {
                    // Console.WriteLine($"[Signaling] Error polling for answer: {ex.Message}");
                    try
                    {
                        await Task.Delay(2000, _pollCts.Token);
                    }
                    catch (OperationCanceledException)
                    {
                        break;
                    }
                }
            }
        }

        private async Task PollForIceCandidatesAsync()
        {
            var lastTimestamp = 0L;

            while (!_pollCts.Token.IsCancellationRequested)
            {
                try
                {
                    var response = await _httpClient.GetAsync(
                        $"api/livestream-session?id={_session}&target_id={AppConfig.GetMachineId()}",
                        _pollCts.Token);

                    if (response.IsSuccessStatusCode)
                    {
                        var jsonResponse = await response.Content.ReadAsStringAsync();
                        var candidates = JsonConvert.DeserializeObject<SignalingMessage>(jsonResponse);

                        if (candidates?.Data.AdminIce != null)
                        {
                            foreach (var candidate in candidates.Data.AdminIce)
                            {
                                if (candidate.Candidate != null)
                                {
                                    var preview = candidate.Candidate.Length > 50
                                        ? candidate.Candidate.Substring(0, 50) + "..."
                                        : candidate.Candidate;
                                    // Console.WriteLine($"[Signaling] ICE candidate received: {preview}");
                                    OnIceCandidateReceived?.Invoke(candidate);
                                }
                            }

                            // if (candidates.Timestamp > 0)
                            // {
                            //     lastTimestamp = candidates.Timestamp;
                            // }
                        }
                    }

                    await Task.Delay(500, _pollCts.Token);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
                catch (Exception ex)
                {
                    // Console.WriteLine($"[Signaling] Error polling for ICE candidates: {ex.Message}");
                    try
                    {
                        await Task.Delay(2000, _pollCts.Token);
                    }
                    catch (OperationCanceledException)
                    {
                        break;
                    }
                }
            }
        }


        public void StopPolling()
        {
            _pollCts.Cancel();
        }

        public void Dispose()
        {
            if (_disposed) return;

            _pollCts.Cancel();
            _pollCts.Dispose();
            _httpClient.Dispose();
            _disposed = true;

            GC.SuppressFinalize(this);
        }
    }

    public class SignalingMessage
    {
        [JsonProperty("status")]
        public string Status { get; set; }

        [JsonProperty("message")]
        public string Message { get; set; }
        [JsonProperty("data")]
        public Polled Data { get; set; }
    }

    public class Polled
    {
        [JsonProperty("offer")]
        public string Offer { get; set; }
        [JsonProperty("answer")]
        public string Answer { get; set; }
        [JsonProperty("client_ice")]
        public List<IceCandidateDto> ClientIce { get; set; }
        [JsonProperty("admin_ice")]
        public List<IceCandidateDto> AdminIce { get; set; }
    }

    public class IceCandidateDto
    {
        [JsonProperty("candidate")]
        public string Candidate { get; set; }

        [JsonProperty("sdpMid")]
        public string SdpMid { get; set; }

        [JsonProperty("sdpMLineIndex")]
        public int SdpMLineIndex { get; set; }

        [JsonProperty("clientId")]
        public string ClientId { get; set; }
    }

    public class IceCandidateResponse
    {
        [JsonProperty("candidates")]
        public List<IceCandidateDto> Candidates { get; set; }

        [JsonProperty("timestamp")]
        public long Timestamp { get; set; }
    }

    public class JoinRequestDto
    {
        [JsonProperty("clientId")]
        public string ClientId { get; set; }

        [JsonProperty("timestamp")]
        public long Timestamp { get; set; }
    }

    public class JoinRequestResponse
    {
        [JsonProperty("status")]
        public string Status { get; set; }

        [JsonProperty("message")]
        public string Message { get; set; }
        [JsonProperty("data")]
        public List<Input> Data { get; set; }
    }

    public class Input
    {
        [JsonProperty("id")]
        public string Id { get; set; }
        [JsonProperty("command")]
        public string Command { get; set; }
        [JsonProperty("extra")]
        public string Extra { get; set; }
    }
}
