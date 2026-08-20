using UnityEngine;
using UnityEngine.InputSystem;

namespace VisionSimulation.VR
{
    public sealed class DesktopMouseLook : MonoBehaviour
    {
        [SerializeField] private Transform cameraPivot;
        [SerializeField, Range(0.01f, 1f)] private float sensitivity = 0.15f;
        [SerializeField] private float minimumPitch = -80f;
        [SerializeField] private float maximumPitch = 80f;
        [SerializeField] private bool lockCursorOnPlay = true;

        private float yaw;
        private float pitch;

        private void Awake()
        {
            if (cameraPivot == null)
                cameraPivot = transform;

            Vector3 initialAngles = cameraPivot.localEulerAngles;
            yaw = initialAngles.y;
            pitch = NormalizeAngle(initialAngles.x);
        }

        private void OnEnable()
        {
            if (lockCursorOnPlay)
                SetCursorLocked(true);
        }

        private void Update()
        {
            if (Keyboard.current == null || Mouse.current == null)
                return;

            if (Keyboard.current.escapeKey.wasPressedThisFrame)
                SetCursorLocked(false);

            if (Mouse.current.leftButton.wasPressedThisFrame)
                SetCursorLocked(true);

            if (Keyboard.current.rKey.wasPressedThisFrame)
                Recenter();

            if (Cursor.lockState != CursorLockMode.Locked)
                return;

            Vector2 delta = Mouse.current.delta.ReadValue();
            yaw += delta.x * sensitivity;
            pitch = Mathf.Clamp(pitch - delta.y * sensitivity, minimumPitch, maximumPitch);
            cameraPivot.localRotation = Quaternion.Euler(pitch, yaw, 0f);
        }

        public void Recenter()
        {
            yaw = 0f;
            pitch = 0f;
            cameraPivot.localRotation = Quaternion.identity;
        }

        private static void SetCursorLocked(bool locked)
        {
            Cursor.lockState = locked ? CursorLockMode.Locked : CursorLockMode.None;
            Cursor.visible = !locked;
        }

        private static float NormalizeAngle(float value)
        {
            return value > 180f ? value - 360f : value;
        }
    }
}
