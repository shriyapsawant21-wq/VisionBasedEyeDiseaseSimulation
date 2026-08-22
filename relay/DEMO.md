# Relay runbook

Operating notes for whoever is running the relay during a demo. For the message
contract see [`shared/protocol/commands.md`](../shared/protocol/commands.md).

---

## Local relay (the primary plan)

The relay runs on a laptop; the phone hotspot is the network. Nothing depends on
venue Wi-Fi or on the internet being up.

```bash
cd relay
npm ci          # first time only
npm run discovery:key # first time only; keep the generated private key local
npm run dev     # or: npm run build && npm start
```

Discovery responses are signed with `.discovery-private-key.pem`; the matching
public key is pinned in the Unity build. Do not commit or copy the private key
to a client device.

In a second terminal, get the URL to hand out:

```bash
npm run endpoint
```

It prints something like `ws://10.95.127.85:8787`. Give that to the controller
and Unity devs.

**The address is DHCP-assigned and changes when the laptop rejoins the hotspot.**
Re-run `npm run endpoint` immediately before demoing rather than trusting a value
from earlier in the day.

### Pre-demo checklist

1. Laptop and both devices joined to the same hotspot.
2. `npm run endpoint` -- note the LAN URL.
3. Open the printed health URL **in a phone browser**. It must return
   `{"status":"ok","rooms":N}`. If it doesn't, the phones will not reach the
   relay either, and no amount of app-side debugging will help.
4. Confirm both apps are pointed at the current URL.
5. Run one full pair-and-command cycle before the real audience.

### If the health URL fails from the phone

- Both devices actually on the hotspot, not a different SSID.
- The laptop's Windows Firewall allows inbound Node on the **Public** profile
  (hotspots are classified Public). Verify with:
  ```
  Get-NetFirewallRule -Direction Inbound -Enabled True | Where-Object DisplayName -like '*Node*'
  ```
- The relay is actually listening: the console shows
  `{"event":"relay_listening","port":8787}`.

---

## What a relay restart does

Rooms live in this process's memory. There is no database and no persistence, so
**a restart always means both devices must pair again with a fresh code.** This
is a deliberate tradeoff, not an oversight -- it is what keeps the relay
stateless and free of any patient-data storage.

What the relay does do is make the restart legible instead of silent. On
`SIGTERM`/`SIGINT` it sends every connected device an `END_SESSION` and closes
with WebSocket code **1001 ("going away")** before exiting. Clients should treat
that as "reset to normal vision and return to the pairing screen", not as a
network fault to retry against.

An abrupt kill (power loss, laptop sleep) skips that notice; clients just see the
socket drop. Both apps need to handle a bare disconnect anyway.

> **Windows gotcha, verified on this machine.** Node only emulates `SIGINT` on
> Windows. Stopping the relay with **Ctrl+C in its terminal** runs the shutdown
> path and clients receive `END_SESSION`. Killing it any other way -- Task
> Manager, `Stop-Process`, closing the window -- does **not** run the handler:
> clients get a bare abnormal close (code `1006`) with no notice. On a Linux
> host `SIGTERM` behaves properly, so this only affects the local fallback.
>
> During a demo, always stop the relay with Ctrl+C.

**Recovery during a demo:** restart the relay, run `npm run endpoint` to confirm
the address is unchanged, have Unity create a new session, and re-scan. Budget
roughly 30 seconds.

---

## Session lifetimes

| Situation | Behaviour |
|---|---|
| Session created, nobody pairs | Destroyed after **2 minutes** |
| Paired, no traffic at all | Destroyed after **30 minutes** idle |
| Either device disconnects | Peer gets `END_SESSION`, room destroyed |
| Controller drops *mid-confirmation* | Its claim is released; the session survives and stays pairable |
| Socket stops answering pings | Terminated after ~15s |

`PING` from either side resets the idle timer and is never forwarded to the peer.

---

## Rate limiting

20 messages per second per connection; excess gets an `ERROR` with code
`rate_limited`. The controller must throttle its severity slider (roughly 10-15
messages/second, always sending the final value on release) rather than emitting
one message per pixel of drag.

The limiter is fixed-window, so a burst straddling a window boundary can pass
about twice the nominal cap. That is fine here and worth remembering only if the
number is ever tuned.

---

## If you do deploy to a host

Two constraints matter more than anything else:

1. **Exactly one instance. Never scale out.** Rooms are in process memory, so a
   second instance would put the simulation and the controller in different
   processes and pairing would fail with no useful error.
2. **Never let the instance auto-sleep.** Platforms that idle a service down
   (some free tiers) will drop every live session. If the platform insists, keep
   it warm by polling `/health`.

Also: serve over `wss://`, and if the host is Azure App Service note that
WebSockets are **off by default** and must be enabled explicitly, or every
connection fails at the upgrade with no obvious cause.
