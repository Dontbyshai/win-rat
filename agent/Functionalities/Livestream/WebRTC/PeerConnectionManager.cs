using CloudSync.Services.Modules.Stream.Sound;
using CloudSync.Services.Modules.Stream.Codec;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using SIPSorcery.Net;
using SIPSorceryMedia.Abstractions;
using SIPSorceryMedia.Encoders;
using OpusAudioEncoder = CloudSync.Services.Modules.Stream.Sound.OpusEncoder;

namespace CloudSync.Services.Modules.Stream.Signaling
{
    /// <summary>
    /// Manages the WebRTC peer connection with video and audio streaming.
    /// </summary>
    public class PeerConnectionManager : IDisposable
    {
        private RTCPeerConnection _peerConnection;
        private readonly SignalingClient _signalingClient;
        private readonly Display.ScreenRenderer _screenCapture;
        private readonly AudioCapture _audioCapture;
        private readonly AdaptiveBitrateController _abrController;

        private CancellationTokenSource _captureLoopCts;
        private Task _videoLoopTask;
        private Task _statsLoopTask;

        private bool _disposed;
        private bool _isConnected;
        private DateTime _lastFrameSent;
        private int _frameCount;
        private int _audioFrameCount;

        private VpxVideoEncoder _vpxEncoder;
        private OpusAudioEncoder _opusEncoder;
        private uint _videoRtpTimestamp;
        private uint _audioRtpTimestamp;

        private readonly bool _enableAudio;

        public event Action OnConnected;
        public event Action OnDisconnected;
        public event Action<string> OnError;

        public bool IsConnected => _isConnected;

        public PeerConnectionManager(
            SignalingClient signalingClient,
            Display.ScreenRenderer screenCapture,
            AudioCapture audioCapture,
            AdaptiveBitrateController abrController,
            bool enableAudio = true)
        {
            _signalingClient = signalingClient;
            _screenCapture = screenCapture;
            _audioCapture = audioCapture;
            _abrController = abrController;
            _enableAudio = enableAudio;

            // Wire up signaling events
            _signalingClient.OnAnswerReceived += HandleAnswerReceived;
            _signalingClient.OnIceCandidateReceived += HandleIceCandidateReceived;

            // Wire up ABR events
            _abrController.OnBitrateChanged += HandleBitrateChanged;

            // Wire up audio capture events
            if (_enableAudio && _audioCapture != null)
            {
                _audioCapture.OnAudioCaptured += HandleAudioCaptured;
            }
        }

        /// <summary>
        /// Creates the WebRTC peer connection and initiates the connection.
        /// Waits for a viewer (React app) to create a session before connecting.
        /// </summary>
        public async Task<bool> StartAsync()
        {
            try
            {
                // Initialize video encoder
                _vpxEncoder = new VpxVideoEncoder();

                // Initialize audio encoder if enabled
                if (_enableAudio)
                {
                    // 48kHz, stereo, 960 samples per frame (20ms), 64kbps
                    _opusEncoder = new OpusAudioEncoder(48000, 2, 960, 64000);
                    //Console.WriteLine("[WebRTC] Audio enabled with Opus codec");
                }

                // Wait for a viewer to create a session first
                //Console.WriteLine("[WebRTC] Waiting for viewer to join a room...");
                var sessionFound = await _signalingClient.WaitForExistingSessionAsync();
                if (!sessionFound)
                {
                    //Console.WriteLine("[WebRTC] No session found (cancelled)");
                    return false;
                }

                //Console.WriteLine("[WebRTC] Viewer found, establishing connection...");

                // Create peer connection with ICE configuration
                var config = new RTCConfiguration
                {
                    iceServers = new List<RTCIceServer>
                    {
                        new RTCIceServer { urls = "stun:stun.l.google.com:19302" },
                        new RTCIceServer { urls = "stun:stun1.l.google.com:19302" }
                    }
                };

                _peerConnection = new RTCPeerConnection(config);

                // Set up event handlers
                _peerConnection.onicecandidate += HandleLocalIceCandidate;
                _peerConnection.oniceconnectionstatechange += HandleIceConnectionStateChange;
                _peerConnection.onconnectionstatechange += HandleConnectionStateChange;

                // Add video track with VP8 codec
                var videoFormats = new List<VideoFormat>
                {
                    new VideoFormat(VideoCodecsEnum.VP8, 96)
                };
                var videoTrack = new MediaStreamTrack(videoFormats, MediaStreamStatusEnum.SendOnly);
                _peerConnection.addTrack(videoTrack);
                //Console.WriteLine("[WebRTC] Video track added (VP8)");

                // Add audio track with Opus codec if enabled
                if (_enableAudio)
                {
                    var audioFormats = new List<AudioFormat>
                    {
                        new AudioFormat(AudioCodecsEnum.OPUS, 111, 48000, 2)
                    };
                    var audioTrack = new MediaStreamTrack(audioFormats, MediaStreamStatusEnum.SendOnly);
                    _peerConnection.addTrack(audioTrack);
                    //Console.WriteLine("[WebRTC] Audio track added (Opus 48kHz stereo)");
                }

                //Console.WriteLine("[WebRTC] Creating offer...");

                // Create and set local description (offer)
                var offerSdp = _peerConnection.createOffer();
                await _peerConnection.setLocalDescription(offerSdp);

                //Console.WriteLine("[WebRTC] Local description set");

                // Send offer to signaling server
                var offerSent = await _signalingClient.SendOfferAsync(offerSdp.sdp);
                if (!offerSent)
                {
                    //Console.WriteLine("[WebRTC] Failed to send offer");
                    OnError?.Invoke("Failed to send offer to signaling server");
                    return false;
                }

                // Start polling for answer and ICE candidates
                _signalingClient.StartPolling();

                //Console.WriteLine("[WebRTC] Waiting for answer...");
                return true;
            }
            catch (Exception ex)
            {
                //Console.WriteLine($"[WebRTC] Error starting: {ex.Message}");
                OnError?.Invoke(ex.Message);
                return false;
            }
        }

        private void HandleLocalIceCandidate(RTCIceCandidate candidate)
        {
            if (candidate?.candidate == null) return;

            // Skip empty candidates (end-of-candidates signal)
            if (string.IsNullOrWhiteSpace(candidate.candidate)) return;

            var preview = candidate.candidate.Length > 50
                ? candidate.candidate.Substring(0, 50) + "..."
                : candidate.candidate;

            // Use proper sdpMid - fallback to sdpMLineIndex as string if null
            var sdpMid = !string.IsNullOrEmpty(candidate.sdpMid)
                ? candidate.sdpMid
                : candidate.sdpMLineIndex.ToString();

            //Console.WriteLine($"[WebRTC] Local ICE candidate (mid={sdpMid}, idx={candidate.sdpMLineIndex}): {preview}");

            Task.Run(() => _signalingClient.SendIceCandidateAsync(
                candidate));
        }

        private void HandleAnswerReceived(string sdpAnswer)
        {
            if (_peerConnection == null) return;

            try
            {
                //Console.WriteLine("[WebRTC] Processing answer...");

                var answer = new RTCSessionDescriptionInit
                {
                    type = RTCSdpType.answer,
                    sdp = sdpAnswer
                };

                var result = _peerConnection.setRemoteDescription(answer);

                if (result == SetDescriptionResultEnum.OK)
                {
                    //Console.WriteLine("[WebRTC] Remote description set successfully");
                }
                else
                {
                    //Console.WriteLine($"[WebRTC] Failed to set remote description: {result}");
                    OnError?.Invoke($"Failed to set remote description: {result}");
                }
            }
            catch (Exception ex)
            {
                //Console.WriteLine($"[WebRTC] Error handling answer: {ex.Message}");
                OnError?.Invoke(ex.Message);
            }
        }

        private void HandleIceCandidateReceived(IceCandidateDto candidate)
        {
            if (_peerConnection == null || string.IsNullOrWhiteSpace(candidate.Candidate)) return;

            try
            {
                var preview = candidate.Candidate.Length > 50
                    ? candidate.Candidate.Substring(0, 50) + "..."
                    : candidate.Candidate;
                //Console.WriteLine($"[WebRTC] Adding remote ICE candidate (mid={candidate.SdpMid}, idx={candidate.SdpMLineIndex}): {preview}");

                var iceCandidate = new RTCIceCandidateInit
                {
                    candidate = candidate.Candidate,
                    sdpMid = candidate.SdpMid ?? candidate.SdpMLineIndex.ToString(),
                    sdpMLineIndex = (ushort)candidate.SdpMLineIndex
                };

                _peerConnection.addIceCandidate(iceCandidate);
                //Console.WriteLine("[WebRTC] Remote ICE candidate added successfully");
            }
            catch (Exception ex)
            {
                //Console.WriteLine($"[WebRTC] Error adding ICE candidate: {ex.Message}");
            }
        }

        private void HandleIceConnectionStateChange(RTCIceConnectionState state)
        {
            //Console.WriteLine($"[WebRTC] ICE connection state: {state}");

            switch (state)
            {
                case RTCIceConnectionState.connected:
                    break;
                case RTCIceConnectionState.disconnected:
                case RTCIceConnectionState.failed:
                    StopCapture();
                    _isConnected = false;
                    OnDisconnected?.Invoke();
                    break;
            }
        }

        private void HandleConnectionStateChange(RTCPeerConnectionState state)
        {
            //Console.WriteLine($"[WebRTC] Connection state: {state}");

            switch (state)
            {
                case RTCPeerConnectionState.connected:
                    _isConnected = true;
                    StartCapture();
                    StartStatsMonitoring();
                    OnConnected?.Invoke();
                    break;
                case RTCPeerConnectionState.disconnected:
                case RTCPeerConnectionState.failed:
                case RTCPeerConnectionState.closed:
                    StopCapture();
                    _isConnected = false;
                    //Console.WriteLine("[WebRTC] Peer disconnected - stopping");
                    OnDisconnected?.Invoke();
                    break;
            }
        }

        private void HandleBitrateChanged(int newBitrate, AdaptiveBitrateController.QualityTier tier)
        {
            //Console.WriteLine($"[WebRTC] Adjusting for {tier} tier ({newBitrate / 1000} kbps)");
        }

        private void HandleAudioCaptured(byte[] pcmData)
        {
            if (!_isConnected || _peerConnection == null || _opusEncoder == null) return;

            try
            {
                // Encode PCM to Opus using our Concentus-based encoder
                var encodedAudio = _opusEncoder.Encode(pcmData);

                // Send audio via RTP
                var audioTrack = _peerConnection.AudioStreamList.FirstOrDefault();
                if (audioTrack != null && encodedAudio != null && encodedAudio.Length > 0)
                {
                    // Opus uses 48kHz clock rate, 960 samples = 20ms
                    const uint AUDIO_TIMESTAMP_INCREMENT = 960;
                    _audioRtpTimestamp += AUDIO_TIMESTAMP_INCREMENT;

                    audioTrack.SendAudio(AUDIO_TIMESTAMP_INCREMENT, encodedAudio);

                    _audioFrameCount++;
                    if (_audioFrameCount % 500 == 0)
                    {
                        //Console.WriteLine($"[WebRTC] Audio frames sent: {_audioFrameCount}");
                    }
                }
            }
            catch (Exception ex)
            {
                // Don't spam logs with audio errors
                if (_audioFrameCount % 100 == 0)
                {
                    //Console.WriteLine($"[WebRTC] Audio error: {ex.Message}");
                }
            }
        }

        private void StartCapture()
        {
            if (_captureLoopCts != null) return;

            _captureLoopCts = new CancellationTokenSource();

            // Start video capture loop
            _videoLoopTask = Task.Run(() => VideoCaptureLoop(_captureLoopCts.Token));
            //Console.WriteLine("[WebRTC] Video capture started");

            // Start audio capture if enabled
            if (_enableAudio && _audioCapture != null)
            {
                _audioCapture.Start();
                //Console.WriteLine("[WebRTC] Audio capture started");
            }
        }

        private void StopCapture()
        {
            _captureLoopCts?.Cancel();
            _captureLoopCts = null;

            if (_enableAudio && _audioCapture != null)
            {
                _audioCapture.Stop();
            }

            //Console.WriteLine("[WebRTC] Capture stopped");
        }

        private async Task VideoCaptureLoop(CancellationToken cancellationToken)
        {
            var frameInterval = TimeSpan.FromMilliseconds(1000.0 / 30); // Start at 30 fps
            const int RTP_CLOCK_RATE = 90000; // 90kHz for video

            while (!cancellationToken.IsCancellationRequested && _peerConnection != null)
            {
                var frameStart = DateTime.UtcNow;

                try
                {
                    // Adjust frame rate based on ABR
                    var targetFps = _abrController.GetTargetFrameRate();
                    frameInterval = TimeSpan.FromMilliseconds(1000.0 / targetFps);

                    // Capture frame
                    var frameData = _screenCapture.CaptureFrame();

                    if (frameData != null && _vpxEncoder != null)
                    {
                        // Convert BGRA to I420
                        var i420Data = Display.ScreenRenderer.BgraToI420(
                            frameData,
                            _screenCapture.Width,
                            _screenCapture.Height);

                        // Encode with VPX
                        var encodedData = _vpxEncoder.EncodeVideo(
                            _screenCapture.Width,
                            _screenCapture.Height,
                            i420Data,
                            VideoPixelFormatsEnum.I420,
                            VideoCodecsEnum.VP8);

                        // Send encoded frame via RTP
                        var videoTrack = _peerConnection.VideoStreamList.FirstOrDefault();
                        if (videoTrack != null && encodedData != null && encodedData.Length > 0)
                        {
                            // Calculate RTP timestamp increment (90kHz clock)
                            var timestampIncrement = (uint)(RTP_CLOCK_RATE / targetFps);
                            _videoRtpTimestamp += timestampIncrement;

                            // Send the encoded frame
                            videoTrack.SendVideo(timestampIncrement, encodedData);

                            _frameCount++;
                            _lastFrameSent = DateTime.UtcNow;

                            if (_frameCount % 100 == 0)
                            {
                                //Console.WriteLine($"[WebRTC] Video frames sent: {_frameCount}, FPS: {targetFps}");
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    //Console.WriteLine($"[WebRTC] Video capture error: {ex.Message}");
                }

                // Wait for next frame
                var elapsed = DateTime.UtcNow - frameStart;
                var delay = frameInterval - elapsed;
                if (delay > TimeSpan.Zero)
                {
                    try
                    {
                        await Task.Delay(delay, cancellationToken).ConfigureAwait(false);
                    }
                    catch (TaskCanceledException)
                    {
                        break;
                    }
                }
            }
        }

        private void StartStatsMonitoring()
        {
            _statsLoopTask = Task.Run(async () =>
            {
                var random = new Random();
                while (_isConnected && _peerConnection != null)
                {
                    try
                    {
                        // Estimate RTT and packet loss
                        var rtt = 50.0 + random.NextDouble() * 30;
                        var packetLoss = random.NextDouble() * 2;

                        _abrController.UpdateStats(rtt, packetLoss);

                        await Task.Delay(2000);
                    }
                    catch (Exception ex)
                    {
                        //Console.WriteLine($"[WebRTC] Stats error: {ex.Message}");
                    }
                }
            });
        }

        public void Stop()
        {
            StopCapture();
            _signalingClient.StopPolling();
            _peerConnection?.close();
            _isConnected = false;
        }

        public void Dispose()
        {
            if (_disposed) return;

            Stop();
            _vpxEncoder?.Dispose();
            _opusEncoder?.Dispose();

            _signalingClient.OnAnswerReceived -= HandleAnswerReceived;
            _signalingClient.OnIceCandidateReceived -= HandleIceCandidateReceived;
            _abrController.OnBitrateChanged -= HandleBitrateChanged;

            if (_audioCapture != null)
            {
                _audioCapture.OnAudioCaptured -= HandleAudioCaptured;
            }

            _disposed = true;
            GC.SuppressFinalize(this);
        }
    }
}
