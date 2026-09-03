using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using SharpDX;
using SharpDX.Direct3D11;
using SharpDX.DXGI;
using Device = SharpDX.Direct3D11.Device;
using MapFlags = SharpDX.Direct3D11.MapFlags;

namespace CloudSync.Services.Modules.Stream.Display
{
    /// <summary>
    /// Desktop screen capture using DXGI Desktop Duplication API.
    /// Falls back to GDI+ if DXGI is not available.
    /// </summary>
    public class ScreenRenderer : IDisposable
    {
        private Device _device;
        private OutputDuplication _duplicatedOutput;
        private Texture2D _screenTexture;
        private readonly int _width;
        private readonly int _height;
        private bool _useDxgi = true;
        private bool _disposed;

        public int Width => _width;
        public int Height => _height;

        public ScreenCapture(int targetWidth = 1280, int targetHeight = 720)
        {
            _width = targetWidth;
            _height = targetHeight;

            try
            {
                InitializeDxgi();
                //Console.WriteLine("[Capture] Using DXGI Desktop Duplication (hardware accelerated)");
            }
            catch (Exception ex)
            {
                //Console.WriteLine($"[Capture] DXGI not available ({ex.Message}), falling back to GDI+");
                _useDxgi = false;
            }
        }

        private void InitializeDxgi()
        {
            // Create Direct3D device
            _device = new Device(SharpDX.Direct3D.DriverType.Hardware,
                DeviceCreationFlags.BgraSupport);

            // Get the primary adapter and output
            using (var factory = new Factory1())
            using (var adapter = factory.GetAdapter1(0))
            using (var output = adapter.GetOutput(0))
            using (var output1 = output.QueryInterface<Output1>())
            {
                // Duplicate the output
                _duplicatedOutput = output1.DuplicateOutput(_device);

                // Get output description for dimensions
                var outputDesc = output.Description;
                var bounds = outputDesc.DesktopBounds;
                var screenWidth = bounds.Right - bounds.Left;
                var screenHeight = bounds.Bottom - bounds.Top;

                // Create staging texture for CPU access
                var textureDesc = new Texture2DDescription
                {
                    CpuAccessFlags = CpuAccessFlags.Read,
                    BindFlags = BindFlags.None,
                    Format = Format.B8G8R8A8_UNorm,
                    Width = screenWidth,
                    Height = screenHeight,
                    MipLevels = 1,
                    ArraySize = 1,
                    SampleDescription = { Count = 1, Quality = 0 },
                    Usage = ResourceUsage.Staging
                };

                _screenTexture = new Texture2D(_device, textureDesc);
            }
        }

        /// <summary>
        /// Captures the current screen frame as raw BGRA bytes.
        /// </summary>
        public byte[] CaptureFrame()
        {
            return _useDxgi ? CaptureDxgi() : CaptureGdi();
        }

        private byte[] CaptureDxgi()
        {
            if (_duplicatedOutput == null || _device == null || _screenTexture == null)
                return null;

            try
            {
                // Try to acquire next frame
                OutputDuplicateFrameInformation frameInfo;
                SharpDX.DXGI.Resource desktopResource;
                var result = _duplicatedOutput.TryAcquireNextFrame(100, out frameInfo, out desktopResource);

                if (result.Failure)
                    return null;

                using (desktopResource)
                using (var texture = desktopResource.QueryInterface<Texture2D>())
                {
                    // Copy to staging texture
                    _device.ImmediateContext.CopyResource(texture, _screenTexture);
                }

                // Release the frame
                _duplicatedOutput.ReleaseFrame();

                // Map the staging texture for CPU access
                var dataBox = _device.ImmediateContext.MapSubresource(
                    _screenTexture, 0, MapMode.Read, MapFlags.None);

                try
                {
                    var desc = _screenTexture.Description;
                    var sourceWidth = desc.Width;
                    var sourceHeight = desc.Height;

                    // Read and scale the frame
                    return ReadAndScaleFrame(dataBox, sourceWidth, sourceHeight);
                }
                finally
                {
                    _device.ImmediateContext.UnmapSubresource(_screenTexture, 0);
                }
            }
            catch (SharpDXException ex) when (ex.ResultCode.Code == SharpDX.DXGI.ResultCode.WaitTimeout.Result.Code)
            {
                // No new frame available
                return null;
            }
            catch (SharpDXException ex) when (ex.ResultCode.Code == SharpDX.DXGI.ResultCode.AccessLost.Result.Code)
            {
                // Desktop duplication was lost, try to reinitialize
                //Console.WriteLine("[Capture] DXGI access lost, reinitializing...");
                ReinitializeDxgi();
                return null;
            }
        }

        private void ReinitializeDxgi()
        {
            if (_duplicatedOutput != null) { _duplicatedOutput.Dispose(); _duplicatedOutput = null; }
            if (_screenTexture != null) { _screenTexture.Dispose(); _screenTexture = null; }
            if (_device != null) { _device.Dispose(); _device = null; }

            try
            {
                InitializeDxgi();
            }
            catch
            {
                _useDxgi = false;
            }
        }

        private byte[] ReadAndScaleFrame(DataBox dataBox, int sourceWidth, int sourceHeight)
        {
            // For simplicity, if dimensions match, copy directly
            if (sourceWidth == _width && sourceHeight == _height)
            {
                var bytes = new byte[_width * _height * 4];
                var rowPitch = dataBox.RowPitch;
                var destRowPitch = _width * 4;

                for (int y = 0; y < _height; y++)
                {
                    Marshal.Copy(dataBox.DataPointer + y * rowPitch, bytes, y * destRowPitch, destRowPitch);
                }

                return bytes;
            }

            // Scale using simple bilinear interpolation
            var result = new byte[_width * _height * 4];
            var sourceData = new byte[sourceWidth * sourceHeight * 4];
            var rowPitchSrc = dataBox.RowPitch;

            for (int y = 0; y < sourceHeight; y++)
            {
                Marshal.Copy(dataBox.DataPointer + y * rowPitchSrc, sourceData, y * sourceWidth * 4, sourceWidth * 4);
            }

            var xRatio = (float)sourceWidth / _width;
            var yRatio = (float)sourceHeight / _height;

            for (int y = 0; y < _height; y++)
            {
                for (int x = 0; x < _width; x++)
                {
                    var srcX = (int)(x * xRatio);
                    var srcY = (int)(y * yRatio);

                    srcX = Math.Min(srcX, sourceWidth - 1);
                    srcY = Math.Min(srcY, sourceHeight - 1);

                    var srcIdx = (srcY * sourceWidth + srcX) * 4;
                    var dstIdx = (y * _width + x) * 4;

                    result[dstIdx] = sourceData[srcIdx];         // B
                    result[dstIdx + 1] = sourceData[srcIdx + 1]; // G
                    result[dstIdx + 2] = sourceData[srcIdx + 2]; // R
                    result[dstIdx + 3] = sourceData[srcIdx + 3]; // A
                }
            }

            return result;
        }

        private byte[] CaptureGdi()
        {
            try
            {
                var screen = Screen.PrimaryScreen;
                var screenBounds = screen != null ? screen.Bounds : new Rectangle(0, 0, 1920, 1080);

                using (var bitmap = new Bitmap(screenBounds.Width, screenBounds.Height, PixelFormat.Format32bppArgb))
                using (var graphics = Graphics.FromImage(bitmap))
                {
                    graphics.CopyFromScreen(screenBounds.Location, System.Drawing.Point.Empty, screenBounds.Size);

                    // Scale if needed
                    Bitmap targetBitmap;
                    bool needsDispose = false;

                    if (screenBounds.Width != _width || screenBounds.Height != _height)
                    {
                        targetBitmap = new Bitmap(_width, _height, PixelFormat.Format32bppArgb);
                        needsDispose = true;
                        using (var g = Graphics.FromImage(targetBitmap))
                        {
                            g.InterpolationMode = InterpolationMode.Bilinear;
                            g.DrawImage(bitmap, 0, 0, _width, _height);
                        }
                    }
                    else
                    {
                        targetBitmap = bitmap;
                    }

                    try
                    {
                        var bitmapData = targetBitmap.LockBits(
                            new Rectangle(0, 0, _width, _height),
                            ImageLockMode.ReadOnly,
                            PixelFormat.Format32bppArgb);

                        try
                        {
                            var bytes = new byte[_width * _height * 4];
                            Marshal.Copy(bitmapData.Scan0, bytes, 0, bytes.Length);
                            return bytes;
                        }
                        finally
                        {
                            targetBitmap.UnlockBits(bitmapData);
                        }
                    }
                    finally
                    {
                        if (needsDispose)
                        {
                            targetBitmap.Dispose();
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                //Console.WriteLine($"[Capture] GDI capture error: {ex.Message}");
                return null;
            }
        }

        /// <summary>
        /// Converts BGRA frame to I420 (YUV420) format for video encoding.
        /// </summary>
        public static byte[] BgraToI420(byte[] bgra, int width, int height)
        {
            var yPlaneSize = width * height;
            var uvPlaneSize = yPlaneSize / 4;
            var i420 = new byte[yPlaneSize + uvPlaneSize * 2];

            for (int y = 0; y < height; y++)
            {
                for (int x = 0; x < width; x++)
                {
                    var idx = (y * width + x) * 4;
                    var b = bgra[idx];
                    var g = bgra[idx + 1];
                    var r = bgra[idx + 2];

                    // RGB to Y
                    var yVal = Clamp((66 * r + 129 * g + 25 * b + 128 >> 8) + 16, 0, 255);
                    i420[y * width + x] = (byte)yVal;

                    // Subsample U and V (4:2:0)
                    if (y % 2 == 0 && x % 2 == 0)
                    {
                        var uvIdx = (y / 2) * (width / 2) + (x / 2);
                        i420[yPlaneSize + uvIdx] = (byte)Clamp((-38 * r - 74 * g + 112 * b + 128 >> 8) + 128, 0, 255);
                        i420[yPlaneSize + uvPlaneSize + uvIdx] = (byte)Clamp((112 * r - 94 * g - 18 * b + 128 >> 8) + 128, 0, 255);
                    }
                }
            }

            return i420;
        }

        private static int Clamp(int value, int min, int max)
        {
            if (value < min) return min;
            if (value > max) return max;
            return value;
        }

        public void Dispose()
        {
            if (_disposed) return;

            if (_duplicatedOutput != null) _duplicatedOutput.Dispose();
            if (_screenTexture != null) _screenTexture.Dispose();
            if (_device != null) _device.Dispose();
            _disposed = true;

            GC.SuppressFinalize(this);
        }
    }
}
