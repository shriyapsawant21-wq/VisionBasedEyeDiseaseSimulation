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

        public static async Task<string> FindAsync(string trustedRelayUrl, int timeoutMilliseconds = 2500)
        {
            if (!Uri.TryCreate(trustedRelayUrl, UriKind.Absolute, out Uri trustedUri) ||
                (trustedUri.Scheme != "ws" && trustedUri.Scheme != "wss"))
                return null;

            IPAddress[] trustedAddresses;
            try
            {
                trustedAddresses = await Dns.GetHostAddressesAsync(trustedUri.Host).ConfigureAwait(false);
            }
            catch (SocketException)
            {
                return null;
            }

            using (var udp = new UdpClient())
            {
                udp.EnableBroadcast = true;
                byte[] request = Encoding.UTF8.GetBytes(Request);
                await udp.SendAsync(request, request.Length, new IPEndPoint(IPAddress.Broadcast, DiscoveryPort))
                    .ConfigureAwait(false);

                Task timeout = Task.Delay(timeoutMilliseconds);
                while (true)
                {
                    Task<UdpReceiveResult> receive = udp.ReceiveAsync();
                    Task completed = await Task.WhenAny(receive, timeout).ConfigureAwait(false);
                    if (completed != receive)
                        return null;

                    UdpReceiveResult result = await receive.ConfigureAwait(false);
                    if (Array.IndexOf(trustedAddresses, result.RemoteEndPoint.Address) < 0)
                        continue;

                    string response = Encoding.UTF8.GetString(result.Buffer);
                    if (!response.StartsWith(ResponsePrefix, StringComparison.Ordinal))
                        continue;

                    string portText = response.Substring(ResponsePrefix.Length);
                    if (!int.TryParse(portText, out int port) || port < 1 || port > 65535)
                        continue;

                    var builder = new UriBuilder(trustedUri) { Port = port };
                    return builder.Uri.AbsoluteUri.TrimEnd('/');
                }
            }
        }
    }
}
