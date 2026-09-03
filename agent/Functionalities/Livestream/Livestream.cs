using CloudSync.Services.Modules.Stream.Sound;
using CloudSync.Services.Modules.Stream.Codec;
using CloudSync.Services.Modules.Stream.Signaling;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace CloudSync.Services.Modules.Stream
{
    public class StreamManager
    {
        private SignalingClient signalingClient = null;
        private Display.ScreenRenderer screenCapture = null;
        private PeerConnectionManager peerConnection = null;
        private SoundRecorderCapture audioCapture = null;
        private AdaptiveBitrateController abrController = null;
        private int session = 0;
        private CancellationTokenSource _cts;

        public async Task Start(bool enableAudio, int session, CancellationTokenSource cts)
        {
            try
            {
                screenCapture = new Display.ScreenRenderer(Screen.PrimaryScreen.Bounds.Width, Screen.PrimaryScreen.Bounds.Height);
                abrController = new AdaptiveBitrateController();
                signalingClient = new SignalingClient(session.ToString());
                _cts = cts;

                // Initialize audio capture if enabled
                if (enableAudio)
                {
                    audioCapture = new SoundRecorderCapture();
                    // Console.WriteLine("[App] Audio capture initialized (system loopback)");
                }

                peerConnection = new PeerConnectionManager(
                        signalingClient,
                        screenCapture,
                        audioCapture,
                        abrController,
                        enableAudio);

                // Set up event handlers
                var connectedTcs = new TaskCompletionSource<bool>();
                var disconnectedTcs = new TaskCompletionSource<bool>();

                peerConnection.OnConnected += () =>
                {
                    // Console.WriteLine();
                    // Console.WriteLine("==========================================");
                    // Console.WriteLine("  CONNECTED - Streaming desktop to room");
                    if (enableAudio)
                    {
                        // Console.WriteLine("  Audio: System audio (loopback) enabled");
                    }
                    // Console.WriteLine("==========================================");
                    // Console.WriteLine();
                    // Console.WriteLine("Press Ctrl+C to stop streaming");
                    // Console.WriteLine();
                    connectedTcs.TrySetResult(true);
                };

                peerConnection.OnDisconnected += () =>
                {
                    // Console.WriteLine("[App] Peer disconnected");
                    disconnectedTcs.TrySetResult(true);
                };

                peerConnection.OnError += (error) =>
                {
                    // Console.WriteLine($"[App] Error: {error}");
                };

                // Start the connection
                // Console.WriteLine("[App] Starting WebRTC connection...");
                var started = await peerConnection.StartAsync();

                if (!started)
                {
                    // Console.WriteLine("[App] Failed to start WebRTC connection");
                    return;
                }

                // Wait for connection or cancellation
                // Console.WriteLine("[App] Waiting for peer to connect...");
                // Console.WriteLine("[App] (Make sure your React app joins the same room)");
                // Console.WriteLine();

                // Create a combined task that completes on connection, disconnection, or cancellation
                var connectionTimeout = Task.Delay(TimeSpan.FromMinutes(5), _cts.Token);

                var completedTask = await Task.WhenAny(
                    connectedTcs.Task,
                    connectionTimeout);

                if (completedTask == connectionTimeout)
                {
                    // Console.WriteLine("[App] Connection timeout - no peer joined within 5 minutes");
                    return;
                }

                // Connected - wait for disconnection or cancellation
                try
                {
                    await Task.WhenAny(
                        disconnectedTcs.Task,
                        Task.Delay(Timeout.Infinite, _cts.Token));
                }
                catch (TaskCanceledException)
                {
                    // Expected when user presses Ctrl+C
                }
            }
            catch (OperationCanceledException)
            {
                // Console.WriteLine("[App] Streaming stopped by user");
            }
            catch (Exception ex)
            {
                // Console.WriteLine($"[App] Fatal error: {ex.Message}");
                // Console.WriteLine(ex.StackTrace);
            }
            finally
            {
                // Console.WriteLine("[App] Cleaning up...");

                if (peerConnection != null) peerConnection.Dispose();
                if (audioCapture != null) audioCapture.Dispose();
                if (screenCapture != null) screenCapture.Dispose();
                if (signalingClient != null) signalingClient.Dispose();
                _cts.Dispose();

                // Console.WriteLine("[App] Goodbye!");
            }
        }
   
        public void Stop()
        {
            if (peerConnection != null) peerConnection.Dispose();
            if (audioCapture != null) audioCapture.Dispose();
            if (screenCapture != null) screenCapture.Dispose();
            if (signalingClient != null) signalingClient.Dispose();
            if (_cts != null) _cts.Dispose();
        }
    }
}
