using System;
using Concentus.Structs;
using Concentus.Enums;

namespace CloudSync.Services.Modules.Stream.Sound
{
    /// <summary>
    /// Opus audio encoder using Concentus (pure managed C# Opus implementation).
    /// </summary>
    public class OpusEncoder : IDisposable
    {
        private readonly Concentus.Structs.OpusEncoder _encoder;
        private readonly int _sampleRate;
        private readonly int _channels;
        private readonly int _frameSize;
        private bool _disposed;

        // Output buffer for encoded data
        private readonly byte[] _encodedBuffer;

        public int SampleRate => _sampleRate;
        public int Channels => _channels;
        public int FrameSize => _frameSize;

        /// <summary>
        /// Creates a new Opus encoder.
        /// </summary>
        /// <param name="sampleRate">Sample rate (48000 recommended for Opus)</param>
        /// <param name="channels">Number of channels (1 or 2)</param>
        /// <param name="frameSize">Samples per frame (960 for 20ms at 48kHz)</param>
        /// <param name="bitrate">Target bitrate in bits per second</param>
        public OpusEncoder(int sampleRate = 48000, int channels = 2, int frameSize = 960, int bitrate = 64000)
        {
            _sampleRate = sampleRate;
            _channels = channels;
            _frameSize = frameSize;

            // Create Opus encoder using Concentus.Structs
            _encoder = new Concentus.Structs.OpusEncoder(sampleRate, channels, OpusApplication.OPUS_APPLICATION_AUDIO);
            _encoder.Bitrate = bitrate;
            _encoder.Complexity = 5; // Balance between quality and CPU
            _encoder.UseVBR = true;
            _encoder.SignalType = OpusSignal.OPUS_SIGNAL_AUTO;

            // Max opus frame is about 4000 bytes, but typically much smaller
            _encodedBuffer = new byte[4000];

            //Console.WriteLine($"[OpusEncoder] Initialized: {sampleRate}Hz, {channels}ch, {frameSize} samples/frame, {bitrate / 1000}kbps");
        }

        /// <summary>
        /// Encodes PCM audio data to Opus.
        /// </summary>
        /// <param name="pcmData">Raw PCM data (16-bit signed, interleaved if stereo)</param>
        /// <returns>Encoded Opus data, or null on error</returns>
        public byte[] Encode(byte[] pcmData)
        {
            if (pcmData == null || pcmData.Length == 0)
                return null;

            try
            {
                // Convert byte[] to short[] for Concentus
                int sampleCount = pcmData.Length / 2; // 16-bit = 2 bytes per sample
                short[] pcmShorts = new short[sampleCount];

                for (int i = 0; i < sampleCount; i++)
                {
                    pcmShorts[i] = BitConverter.ToInt16(pcmData, i * 2);
                }

                // Encode - Concentus.Structs.OpusEncoder.Encode returns the number of bytes written
                int encodedLength = _encoder.Encode(pcmShorts, 0, _frameSize, _encodedBuffer, 0, _encodedBuffer.Length);

                if (encodedLength > 0)
                {
                    byte[] result = new byte[encodedLength];
                    Array.Copy(_encodedBuffer, result, encodedLength);
                    return result;
                }

                return null;
            }
            catch (Exception ex)
            {
                //Console.WriteLine($"[OpusEncoder] Encode error: {ex.Message}");
                return null;
            }
        }

        /// <summary>
        /// Encodes PCM audio data from short array.
        /// </summary>
        public byte[] Encode(short[] pcmData, int offset, int frameSize)
        {
            if (pcmData == null || pcmData.Length == 0)
                return null;

            try
            {
                int encodedLength = _encoder.Encode(pcmData, offset, frameSize, _encodedBuffer, 0, _encodedBuffer.Length);

                if (encodedLength > 0)
                {
                    byte[] result = new byte[encodedLength];
                    Array.Copy(_encodedBuffer, result, encodedLength);
                    return result;
                }

                return null;
            }
            catch (Exception ex)
            {
                //Console.WriteLine($"[OpusEncoder] Encode error: {ex.Message}");
                return null;
            }
        }

        /// <summary>
        /// Sets the target bitrate.
        /// </summary>
        public void SetBitrate(int bitrate)
        {
            _encoder.Bitrate = bitrate;
        }

        public void Dispose()
        {
            if (_disposed) return;

            // Concentus encoder doesn't need explicit disposal but we mark as disposed
            _disposed = true;
            GC.SuppressFinalize(this);
        }
    }
}
