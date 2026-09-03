using AForge.Video;
using AForge.Video.DirectShow;
using CloudSync.Services.Core;
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CloudSync.Services.Modules
{
    public class DisplayCapture
    {
        private static Bitmap currentFrame;
        private static bool imageCaptured = false;

        public static byte[] Capture()
        {
            try
            {
                FilterInfoCollection videoDevices = new FilterInfoCollection(FilterCategory.VideoInputDevice);
                if (videoDevices.Count > 0)
                {
                    VideoCaptureDevice videoSource = new VideoCaptureDevice(videoDevices[0].MonikerString);
                    videoSource.NewFrame += new AForge.Video.NewFrameEventHandler(OnNewFrame);
                    videoSource.Start();

                    int waitTime = 0;
                    int maxWait = 5000; // 5 seconds
                    while (!imageCaptured && waitTime < maxWait)
                    {
                        System.Threading.Thread.Sleep(100);
                        waitTime += 100;
                    }

                    videoSource.SignalToStop();
                    videoSource.WaitForStop();

                    if (currentFrame != null)
                    {
                        using (MemoryStream memoryStream = new MemoryStream())
                        {
                            currentFrame.Save(memoryStream, ImageFormat.Png);
                            return memoryStream.ToArray();
                        }
                    }
                }

                return null;
            }
            catch (Exception ex) 
            {
                //// Console.WriteLine(ex.ToString());
                return null;
            }
        }

        private static void OnNewFrame(object sender, NewFrameEventArgs eventArgs)
        {
            if (!imageCaptured)
            {
                currentFrame = (Bitmap)eventArgs.Frame.Clone();
                imageCaptured = true;
            }
        }
    }
}
