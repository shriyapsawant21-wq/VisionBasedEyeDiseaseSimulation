using System;
using UnityEngine;

namespace VisionSimulation.Pairing
{
    /// <summary>
    /// The JSON the QR code carries.
    ///
    /// The controller parses this with JSON.parse and reads sessionId and
    /// pairingToken and relayUrl (see the controller pairing screen). Including
    /// the endpoint makes pairing a true one-scan flow: the QR is regenerated
    /// whenever Unity starts a session, so it carries the address that Unity is
    /// successfully using right now rather than a stale phone-side default.
    /// </summary>
    [Serializable]
    public sealed class PairingPayload
    {
        /// <summary>Payload schema version, not the relay protocol version.</summary>
        public int version = 2;

        public string sessionId;
        public string pairingToken;
        public string relayUrl;

        /// <summary>Unix seconds; mirrors SESSION_CREATED.expiresAt.</summary>
        public long expiresAt;

        public static string ToJson(string sessionId, string pairingToken, long expiresAt, string relayUrl)
        {
            if (string.IsNullOrEmpty(sessionId))
                throw new ArgumentException("sessionId is required.", nameof(sessionId));
            if (string.IsNullOrEmpty(pairingToken))
                throw new ArgumentException("pairingToken is required.", nameof(pairingToken));
            if (string.IsNullOrWhiteSpace(relayUrl))
                throw new ArgumentException("relayUrl is required.", nameof(relayUrl));

            var payload = new PairingPayload
            {
                sessionId = sessionId,
                pairingToken = pairingToken,
                relayUrl = relayUrl.Trim(),
                expiresAt = expiresAt
            };

            return JsonUtility.ToJson(payload);
        }
    }
}
