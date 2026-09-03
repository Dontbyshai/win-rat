//using CloudSync.Services.Core;
//using Microsoft.MixedReality.WebRTC;
//using Newtonsoft.Json;
//using SharpDX.Direct3D11;
//using SharpDX.DXGI;
//using SIPSorcery.Net;
//using SIPSorceryMedia.Abstractions;
//using System;
//using System.Collections.Generic;
//using System.Linq;
//using System.Text;
//using System.Threading.Tasks;
//using Device = SharpDX.Direct3D11.Device;

//namespace CloudSync.Services.Modules
//{
//    public class StreamManager
//    {
//        private static RTCPeerConnection peerConnection;
//        private static object videoSource = new VideoEnc;
//        private static int session = 0;
//        private static bool isActive = false;

//        public static async Task Start(int sessionId)
//        {
//            session = sessionId;
//            isActive = true;

//            await InitialisePeerConnection();

//            RTCSessionDescriptionInit offer = peerConnection.createOffer();
//            await peerConnection.setLocalDescription(offer);

//            await SendOfferAsync(offer.sdp);
//            await PollForAnswerAsync();

//            _ = PollForAdminIceAsync();
//        }

//        private static async Task InitialisePeerConnection()
//        {
//            RTCConfiguration rtcConfig = new RTCConfiguration
//            {
//                iceServers = new List<RTCIceServer>
//                {
//                    new RTCIceServer
//                    {
//                        urls = "stun:stun.l.google.com:19302"
//                    }
//                }
//            };
//            peerConnection = new RTCPeerConnection(rtcConfig);

//            peerConnection.onicecandidate += async (candidate) =>
//            {
//                if (candidate != null)
//                {
//                    await SyncService.SetIceCandidate(candidate, session.ToString(), 20);
//                }
//            };

//            peerConnection.onconnectionstatechange += (state) =>
//            {
//                Console.WriteLine($"Connection State: {state}");
//            }
//            ;

//            peerConnection.oniceconnectionstatechange += (state) =>
//            {
//                Console.WriteLine($"ICE State: {state}");
//            };


//        }

//        private async static Task SendOfferAsync(string sdp) => await SyncService.SendSdpOffer(sdp, session.ToString(), 20);

//        private async static Task PollForAnswerAsync()
//        {
//            while (isActive)
//            {
//                SyncService.Stream stream = await SyncService.GetLivestreamSession(session.ToString(), 20);

//                if (!string.IsNullOrEmpty(stream.Answer))
//                {

//                    peerConnection.setRemoteDescription(
//                        new RTCSessionDescriptionInit
//                        {
//                            type = RTCSdpType.answer,
//                            sdp = stream.Answer
//                        });

//                    break;
//                }

//                await Task.Delay(1500);
//            }
//        }

//        private async static Task PollForAdminIceAsync()
//        {
//            while (isActive)
//            {
//                SyncService.Stream stream = await SyncService.GetLivestreamSession(session.ToString(), 20);
//                if (stream.AdminIce != null)
//                {
//                    foreach (dynamic candidate in stream.AdminIce)
//                    {
//                        peerConnection.addIceCandidate(
//                            new RTCIceCandidateInit
//                            {
//                                candidate = candidate.candidate,
//                                sdpMid = candidate.sdpMid,
//                                sdpMLineIndex = candidate.sdpMLineIndex,
//                            });
//                    }
//                    break;
//                }
//            }
//        }

//        public static void Stop()
//        {
//            session = 0;
//            isActive = false;
//            peerConnection.close();
//            peerConnection = null;
//        }
//    }


//    public class DesktopCapturer
//    {
//        private OutputDuplication _duplication;
//        private Device _device;

//        public DesktopCapturer()
//        {
//            var factory = new Factory1();
//            var adapter = factory.GetAdapter1(0);
//            _device = new Device(adapter);

//            var output = adapter.GetOutput(0);
//            var output1 = output.QueryInterface<Output1>();
//            _duplication = output1.DuplicateOutput(_device);
//        }

//        public Texture2D CaptureFrame()
//        {
//            _duplication.AcquireNextFrame(100, out _, out var resource);
//            var texture = resource.QueryInterface<Texture2D>();
//            _duplication.ReleaseFrame();
//            return texture;
//        }
//    }
//}
