using G2DK.Utilities;
using NAudio.Wave;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace G2DK.Functionalities
{
    public class Audio
    {
        public static async Task<byte[]> CaptureAsync(int durationMs)
        {
            try
            {
                var waveFormat = new WaveFormat(16000, 1);

                using (var waveIn = new WaveInEvent())
                using (var rawPcmStream = new MemoryStream())
                {
                    waveIn.WaveFormat = waveFormat;

                    // Optional: can help ensure you get DataAvailable events frequently
                    waveIn.BufferMilliseconds = 50;
                    waveIn.NumberOfBuffers = 3;

                    var stoppedTcs = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
                    var writeLock = new object();

                    waveIn.DataAvailable += (s, e) =>
                    {
                        lock (writeLock)
                        {
                            rawPcmStream.Write(e.Buffer, 0, e.BytesRecorded);
                        }
                    };

                    waveIn.RecordingStopped += (s, e) =>
                    {
                        if (e.Exception != null)
                            stoppedTcs.TrySetException(e.Exception);
                        else
                            stoppedTcs.TrySetResult(true);
                    };

                    waveIn.StartRecording();

                    // Stop after duration
                    await Task.Delay(durationMs).ConfigureAwait(false);
                    waveIn.StopRecording();

                    // IMPORTANT: wait until NAudio finishes pushing final buffers
                    await stoppedTcs.Task.ConfigureAwait(false);

                    // If you still got nothing, it's usually "no recording device / wrong device / no permission"
                    if (rawPcmStream.Length == 0)
                        return Array.Empty<byte>();

                    // Convert PCM -> WAV
                    using (var wavStream = new MemoryStream())
                    {
                        // Snapshot raw bytes under lock to avoid race (usually already stopped, but safe)
                        byte[] pcm;
                        lock (writeLock)
                        {
                            pcm = rawPcmStream.ToArray();
                        }

                        using (var writer = new WaveFileWriter(wavStream, waveFormat))
                        {
                            writer.Write(pcm, 0, pcm.Length);
                            writer.Flush();
                        }

                        return wavStream.ToArray();
                    }
                }
            }
            catch (Exception ex)
            {
                // Console.WriteLine(ex.Message);
                return null;
            }
        }
        //private static WaveInEvent wave = new WaveInEvent();
        //private static MemoryStream recordingStream;
        //private static bool isRecording = false;
        //private static DateTime recordingStarted;
        //private static readonly int DURATION = 20 * 1000;

        //public static void Start()
        //{
        //    wave.WaveFormat = new WaveFormat(16000, 1);

        //    wave.DataAvailable += async (s, e) =>
        //    {
        //        bool voiceDetected = CheckVoiceActivity(e.Buffer, e.BytesRecorded);
        //        if (voiceDetected && !isRecording)
        //        {
        //            recordingStream = new MemoryStream();
        //            isRecording = true;
        //            recordingStarted = DateTime.Now;
        //        }

        //        if (isRecording)
        //        {
        //            recordingStream.Write(e.Buffer, 0, e.BytesRecorded);
        //            if ((DateTime.Now - recordingStarted).TotalMilliseconds >= DURATION)
        //            {
        //                isRecording = false;
        //                byte[] rawAudio = recordingStream.ToArray();
        //                recordingStream.Dispose();

        //                byte[] wavData;
        //                using (MemoryStream ms = new MemoryStream())
        //                {
        //                    using (WaveFileWriter ws = new WaveFileWriter(ms, new WaveFormat(16000,1 )))
        //                    {
        //                        ws.Write(rawAudio, 0, rawAudio.Length);
        //                        ws.Flush();
        //                        wavData = ms.ToArray();
        //                        await Communication.UploadAudio(wavData, 20);
        //                    }
        //                }
        //            }
        //        }
        //    };

        //    wave.StartRecording();
        //}

        //private static bool CheckVoiceActivity(byte[] buffer, int bytesRecorded)
        //{
        //    for (int i = 0; i < bytesRecorded; i += 2)
        //    {
        //        short sample = BitConverter.ToInt16(buffer, i);
        //        if (Math.Abs(sample) > 1500)
        //        {
        //            return true;
        //        }
        //    }

        //    return false;
        //}

        ////private static void OnDataAvailable(object sender, WaveInEventArgs e)
        ////{
        ////    int bytesPerSample = 2;
        ////    int sampleCount = e.BytesRecorded / bytesPerSample;
        ////    double sum = 0;

        ////    for (int i = 0; i < e.BytesRecorded; i += bytesPerSample)
        ////    {
        ////        short sample = BitConverter.ToInt16(e.Buffer, i);
        ////        sum += sample * sample;
        ////    }

        ////    double rms = Math.Sqrt(sum / sampleCount);
        ////    double db = 20 * Math.Log10(rms / short.MaxValue);

        ////    if (db > -40 && !isRecording)
        ////    {
        ////        isRecording = true;
        ////        WaveFileWriter writer = new WaveFileWriter(recordingStream, wave.WaveFormat);
        ////        wave.DataAvailable -= OnDataAvailable;
        ////        wave.DataAvailable += (s, args) =>
        ////        {
        ////            writer.Write(args.Buffer, 0, args.BytesRecorded);

        ////            Task.Run(async ()=>
        ////            {
        ////                Thread.Sleep(DURATION);
        ////                writer.Dispose();
        ////                recordingStream.Position = 0;

        ////                // Console.WriteLine("Uploading audio");
        ////                await Communication.UploadAudio(recordingStream, 20);

        ////                isRecording = false;
        ////                wave.DataAvailable -= null;
        ////                wave.DataAvailable += OnDataAvailable;
        ////            });
        ////        };
        ////    }
        ////}

        //public static void Stop()
        //{
        //    wave.StopRecording();
        //    wave.Dispose();
        //    recordingStream.Dispose();
        //}
    }
}
