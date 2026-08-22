using System;
using System.Net;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;

namespace VisionSimulation.Networking
{
    /// <summary>Discovers a VisionBridge relay through a LAN UDP broadcast.</summary>
    public static class RelayDiscovery
    {
        private const int DiscoveryPort = 8788;
        private const string RequestPrefix = "VISIONBRIDGE_DISCOVER_V3:";
        private const string ResponseName = "VISIONBRIDGE_RELAY_V3";
        private const string PublicModulus =
            "sfO+yRGBIX9MSRac17RGoFD+mJIY2Oz9HehbFHx9+ICVCTBYfznlbMtzzPgaH3dOiBE4zJyvVSsTuB169hfHD6Fx7izdOgkfdc+sC60hghfsrhljOgKkg1xoDVRyZ5pi5o8MgHzRUi7fak2JAIpkUcuXZlTOq3eVPF9a0l5+9lLy2b++A3dYeYhtAzfxknpX9akKFcG5Z5L9miELu4zUQv+k1nOIVA+Y3DQllaWCqQlviFoiAvieUi7eUpNjO4883aPaFpBIP1AkvglfTcSbrjnqsMWNj1M9SJC1lBvuT2YEXEa1sze67qcVTnlocw0Yr2GR8Jjkb9opHSHKEakPkw==";
        private const string PublicExponent = "AQAB";

        public static async Task<string> FindAsync(string trustedRelayUrl, int timeoutMilliseconds = 2500)
        {
            if (!Uri.TryCreate(trustedRelayUrl, UriKind.Absolute, out Uri trustedUri) ||
                (trustedUri.Scheme != "ws" && trustedUri.Scheme != "wss"))
                return null;

            byte[] nonceBytes = new byte[16];
            using (RandomNumberGenerator random = RandomNumberGenerator.Create())
            {
                random.GetBytes(nonceBytes);
            }
            string nonce = Convert.ToBase64String(nonceBytes);

            using (var udp = new UdpClient())
            {
                udp.EnableBroadcast = true;
                byte[] request = Encoding.UTF8.GetBytes(RequestPrefix + nonce);
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
                    string response = Encoding.UTF8.GetString(result.Buffer);
                    string[] parts = response.Split(':');
                    if (parts.Length != 5 || parts[0] != ResponseName || parts[3] != nonce)
                        continue;

                    if (!int.TryParse(parts[1], out int port) || port < 1 || port > 65535)
                        continue;

                    if (!IPAddress.TryParse(parts[2], out IPAddress advertisedHost) ||
                        !advertisedHost.Equals(result.RemoteEndPoint.Address))
                        continue;

                    if (!VerifySignature(nonce, advertisedHost.ToString(), port, parts[4]))
                        continue;

                    var builder = new UriBuilder(trustedUri) { Port = port };
                    // A wss certificate authenticates the configured hostname,
                    // not its current LAN address. Only cleartext LAN URLs need
                    // discovery to replace the host after a DHCP change.
                    if (trustedUri.Scheme == "ws")
                        builder.Host = advertisedHost.ToString();
                    return builder.Uri.AbsoluteUri.TrimEnd('/');
                }
            }
        }

        private static bool VerifySignature(string nonce, string host, int port, string encodedSignature)
        {
            try
            {
                var parameters = new RSAParameters
                {
                    Modulus = Convert.FromBase64String(PublicModulus),
                    Exponent = Convert.FromBase64String(PublicExponent)
                };
                byte[] payload = Encoding.UTF8.GetBytes($"{nonce}:{host}:{port}");
                byte[] signature = Convert.FromBase64String(encodedSignature);
                using (RSA rsa = RSA.Create())
                {
                    rsa.ImportParameters(parameters);
                    return rsa.VerifyData(payload, signature, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
                }
            }
            catch (CryptographicException)
            {
                return false;
            }
            catch (FormatException)
            {
                return false;
            }
        }
    }
}
