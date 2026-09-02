using G2DK.Utilities;
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace G2DK.Functionalities
{
    public class ScreenCapture
    {
        public static byte[] Capture()
        {
            try
            {
                Rectangle bounds = Screen.PrimaryScreen.Bounds;

                using (Bitmap bitmap = new Bitmap(bounds.Width, bounds.Height))
                {
                    using (Graphics g = Graphics.FromImage(bitmap))
                    {
                        g.CopyFromScreen(bounds.Location, Point.Empty, bounds.Size);
                    }

                    using (MemoryStream memoryStream = new MemoryStream())
                    {
                        bitmap.Save(memoryStream, ImageFormat.Png);
                        return memoryStream.ToArray();
                    }
                }
            }
            catch (Exception ex) 
            {
                //// Console.WriteLine(ex.ToString());
                return null;
            }
        }
    }
}
