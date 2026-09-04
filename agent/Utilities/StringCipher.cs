using System;
using System.Text;

namespace CloudSync.Services.Core
{
    public class StringCipher
    {
        // Simple Base64 + XOR obfuscation to hide strings from static analysis
        // The key is hardcoded to avoid needing external parameters for simple strings
        private static readonly byte[] KEY = { 0x55, 0xAA, 0x11, 0x77 }; 

        public static string Decrypt(string b64Encoded)
        {
            if (string.IsNullOrEmpty(b64Encoded)) return b64Encoded;
            
            try 
            {
                byte[] data = Convert.FromBase64String(b64Encoded);
                byte[] decoded = new byte[data.Length];
                
                for (int i = 0; i < data.Length; i++)
                {
                    decoded[i] = (byte)(data[i] ^ KEY[i % KEY.Length]);
                }
                
                return Encoding.UTF8.GetString(decoded);
            }
            catch 
            {
                return string.Empty;
            }
        }
        
        // Helper method to encrypt strings (used by developer to generate the obfuscated strings)
        public static string Encrypt(string plainText)
        {
            if (string.IsNullOrEmpty(plainText)) return plainText;
            
            byte[] data = Encoding.UTF8.GetBytes(plainText);
            byte[] encoded = new byte[data.Length];
            
            for (int i = 0; i < data.Length; i++)
            {
                encoded[i] = (byte)(data[i] ^ KEY[i % KEY.Length]);
            }
            
            return Convert.ToBase64String(encoded);
        }
    }
}
