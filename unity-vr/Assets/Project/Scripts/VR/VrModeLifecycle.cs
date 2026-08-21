using System.Collections;
using UnityEngine;
using UnityEngine.XR.Management;

namespace VisionSimulation.VR
{
    /// <summary>
    /// Keeps setup and QR scanning monoscopic, then starts Cardboard immediately
    /// before the paired simulation scene is loaded.
    /// </summary>
    public static class VrModeLifecycle
    {
        public static void StopForSetup()
        {
            var manager = XRGeneralSettings.Instance?.Manager;
            if (manager == null || !manager.isInitializationComplete)
                return;

            manager.StopSubsystems();
            manager.DeinitializeLoader();

            if (Camera.main != null)
                Camera.main.ResetAspect();
        }

        public static IEnumerator StartForSimulation()
        {
            var manager = XRGeneralSettings.Instance?.Manager;
            if (manager == null)
            {
                Debug.LogError("[VrModeLifecycle] XR Manager is unavailable.");
                yield break;
            }

            if (!manager.isInitializationComplete)
                yield return manager.InitializeLoader();

            if (manager.activeLoader == null)
            {
                Debug.LogError("[VrModeLifecycle] Cardboard XR failed to initialize.");
                yield break;
            }

            manager.StartSubsystems();
        }
    }
}
