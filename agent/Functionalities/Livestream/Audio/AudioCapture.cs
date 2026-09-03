using System;
using System.Collections.Concurrent;
using NAudio.CoreAudioApi;
using NAudio.Wave;

namespace CloudSync.Services.Modules.Stream.Sound
{
    /// <summary>
    /// Captures system audio using WASAPI loopback (what you hear through speakers).
    /// Outputs PCM audio in the format required for WebRTC (16kHz mono 16-bit).
    /// </summary>
    public class SoundRecorderCapture : IDisposable
    {
        private WasapiLoopbackCapture _loopbackCapture;
        private WaveFormat _captureFormat;
        private WaveFormat _targetFormat;
        private BufferedWaveProvider _bufferedProvider;
        private MediaFoundationResampler _resampler;

        private readonly ConcurrentQueue<byte[]> _audioQueue = new ConcurrentQueue<byte[]>();
        private readonly object _lock = new object();

        private bool _isCapturing;
        private bool _disposed;

        // WebRTC typically uses 48kHz for Opus, but we'll use 16kHz for compatibility
        public const int TARGET_SAMPLE_RATE = 48000;
        public const int TARGET_CHANNELS = 2; // Stereo for better quality
        public const int TARGET_BITS_PER_SAMPLE = 16;
        public const int SAMPLES_PER_FRAME = 960; // 20ms at 48kHz
        public const int BYTES_PER_FRAME = SAMPLES_PER_FRAME * TARGET_CHANNELS * (TARGET_BITS_PER_SAMPLE / 8);

        public event Action<byte[]> OnAudioCaptured;
        public event Action<string> OnError;

        public bool IsCapturing => _isCapturing;
        public WaveFormat OutputFormat => _targetFormat;

        public SoundRecorderCapture()
        {
            _targetFormat = new WaveFormat(TARGET_SAMPLE_RATE, TARGET_BITS_PER_SAMPLE, TARGET_CHANNELS);
        }

        /// <summary>
        /// Starts capturing system audio.
        /// </summary>
        public bool Start()
        {
            if (_isCapturing) return true;

            try
            {
                // Create loopback capture (captures what's playing through speakers)
                _loopbackCapture = new WasapiLoopbackCapture();
                _captureFormat = _loopbackCapture.WaveFormat;

                //Console.WriteLine($"[Audio] Capture format: {_captureFormat.SampleRate}Hz, {_captureFormat.Channels}ch, {_captureFormat.BitsPerSample}bit");
                //Console.WriteLine($"[Audio] Target format: {_targetFormat.SampleRate}Hz, {_targetFormat.Channels}ch, {_targetFormat.BitsPerSample}bit");

                // Set up buffered provider for resampling
                _bufferedProvider = new BufferedWaveProvider(_captureFormat)
                {
                    BufferLength = _captureFormat.AverageBytesPerSecond * 2,
                    DiscardOnBufferOverflow = true
                };

                // Set up resampler if formats don't match
                if (_captureFormat.SampleRate != TARGET_SAMPLE_RATE ||
                    _captureFormat.Channels != TARGET_CHANNELS)
                {
                    _resampler = new MediaFoundationResampler(_bufferedProvider, _targetFormat)
                    {
                        ResamplerQuality = 60 // High quality resampling
                    };
                }

                _loopbackCapture.DataAvailable += OnDataAvailable;
                _loopbackCapture.RecordingStopped += OnRecordingStopped;

                _loopbackCapture.StartRecording();
                _isCapturing = true;

                Console.WriteLine("[Audio] Loopback capture started");
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Audio] Error starting capture: {ex.Message}");
                OnError?.Invoke(ex.Message);
                return false;
            }
        }

        /// <summary>
        /// Stops capturing audio.
        /// </summary>
        public void Stop()
        {
            if (!_isCapturing) return;

            try
            {
                _loopbackCapture?.StopRecording();
                _isCapturing = false;
                Console.WriteLine("[Audio] Capture stopped");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Audio] Error stopping capture: {ex.Message}");
            }
        }

        private void OnDataAvailable(object sender, WaveInEventArgs e)
        {
            if (e.BytesRecorded == 0) return;

            try
            {
                // Add captured data to buffer
                _bufferedAppConfig.AddSamples(e.Buffer, 0, e.BytesRecorded);

                // Read and resample data
                byte[] outputBuffer = new byte[BYTES_PER_FRAME];
                int bytesRead;

                if (_resampler != null)
                {
                    // Read through resampler
                    while ((bytesRead = _resampler.Read(outputBuffer, 0, outputBuffer.Length)) > 0)
                    {
                        if (bytesRead == BYTES_PER_FRAME)
                        {
                            byte[] frame = new byte[bytesRead];
                            Array.Copy(outputBuffer, frame, bytesRead);
                            OnAudioCaptured?.Invoke(frame);
                        }
                    }
                }
                else
                {
                    // Direct read if no resampling needed
                    while ((bytesRead = _bufferedAppConfig.Read(outputBuffer, 0, outputBuffer.Length)) > 0)
                    {
                        if (bytesRead == BYTES_PER_FRAME)
                        {
                            byte[] frame = new byte[bytesRead];
                            Array.Copy(outputBuffer, frame, bytesRead);
                            OnAudioCaptured?.Invoke(frame);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Audio] Error processing audio: {ex.Message}");
            }
        }

        private void OnRecordingStopped(object sender, StoppedEventArgs e)
        {
            if (e.Exception != null)
            {
                Console.WriteLine($"[Audio] Recording stopped with error: {e.Exception.Message}");
                OnError?.Invoke(e.Exception.Message);
            }
            _isCapturing = false;
        }

        /// <summary>
        /// Gets the next available audio frame, or null if none available.
        /// </summary>
        public byte[] GetNextFrame()
        {
            if (_audioQueue.TryDequeue(out byte[] frame))
            {
                return frame;
            }
            return null;
        }

        public void Dispose()
        {
            if (_disposed) return;

            Stop();

            _resampler?.Dispose();
            _loopbackCapture?.Dispose();

            _disposed = true;
            GC.SuppressFinalize(this);
        }
    }
}
