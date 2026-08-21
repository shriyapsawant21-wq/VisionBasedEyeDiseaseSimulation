using System;
using UnityEngine;

namespace VisionSimulation.Pairing
{
    /// <summary>
    /// The JSON the QR code carries.
    ///
    /// The controller parses this with JSON.parse and reads sessionId and
    /// pairingToken (see controller-app/src/screens/PairingScreen.tsx); it
    /// ignores fields it does not know, so version and expiresAt are safe to
    /// include and give the payload room to grow.
    ///
    /// Deliberately absent: any relay host or IP address. The controller keeps
    /// its own relay URL setting, and putting an address in the QR would both
    /// leak network topology and break the moment DHCP reassigns it.
    /// </summary>
    [Serializable]
    public sealed class PairingPayload
    {
        /// <summary>Payload schema version, not the relay protocol version.</summary>
        public int version = 1;

        public string sessionId;
        public string pairingToken;

        /// <summary>Unix seconds; mirrors SESSION_CREATED.expiresAt.</summary>
        public long expiresAt;

        public static string ToJson(string sessionId, string pairingToken, long expiresAt)
        {
            if (string.IsNullOrEmpty(sessionId))
                throw new ArgumentException("sessionId is required.", nameof(sessionId));
            if (string.IsNullOrEmpty(pairingToken))
                throw new ArgumentException("pairingToken is required.", nameof(pairingToken));

            var payload = new PairingPayload
            {
                sessionId = sessionId,
                pairingToken = pairingToken,
                expiresAt = expiresAt
            };

            return JsonUtility.ToJson(payload);
        }
    }
}
