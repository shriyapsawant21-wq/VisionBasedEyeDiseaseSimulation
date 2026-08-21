using System;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading.Tasks;

namespace VisionSimulation.Networking
{
    /// <summary>Discovers a VisionBridge relay through a LAN UDP broadcast.</summary>
    public static class RelayDiscovery
    {
        private const int DiscoveryPort = 8788;
        private const string Request = "VISIONBRIDGE_DISCOVER_V1";
        private const string ResponsePrefix = "VISIONBRIDGE_RELAY_V1:";

        public static async Task<string> FindAsync(int timeoutMilliseconds = 2500)
        {
            using (var udp = new UdpClient())
            {
                udp.EnableBroadcast = true;
                byte[] request = Encoding.UTF8.GetBytes(Request);
                await udp.SendAsync(request, request.Length, new IPEndPoint(IPAddress.Broadcast, DiscoveryPort))
                    .ConfigureAwait(false);

                Task<UdpReceiveResult> receive = udp.ReceiveAsync();
                Task completed = await Task.WhenAny(receive, Task.Delay(timeoutMilliseconds)).ConfigureAwait(false);
                if (completed != receive)
                    return null;

                UdpReceiveResult result = await receive.ConfigureAwait(false);
                string response = Encoding.UTF8.GetString(result.Buffer);
                if (!response.StartsWith(ResponsePrefix, StringComparison.Ordinal))
                    return null;

                string portText = response.Substring(ResponsePrefix.Length);
                if (!int.TryParse(portText, out int port) || port < 1 || port > 65535)
                    return null;

                return $"ws://{result.RemoteEndPoint.Address}:{port}";
            }
        }
    }
}
