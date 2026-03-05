# CGNAT.xyz

**CGNAT.xyz** is a lightweight diagnostic tool that helps determine whether your internet connection is behind **Carrier-Grade NAT (CGNAT)** and whether **inbound ports are reachable from the public internet**.

The tool combines IP detection techniques with real network probes to give a clear picture of how your connection behaves externally.

---

## What It Detects

### CGNAT / Public IP Status
CGNAT.xyz compares multiple signals to determine how your connection appears online:

- Cloudflare edge IP detection
- WebRTC STUN reflexive IP
- RFC6598 CGNAT range detection (`100.64.0.0/10`)

Results are classified as:

- **Public IPv4**
- **CGNAT (carrier-grade NAT)**
- **Private / non-routable address**

---

## Inbound Connectivity Test

The tool can run probes from the public internet to test whether a port on your connection is reachable.

### UDP Probe
Commonly used for services like:

- WireGuard
- Game servers
- VoIP
- Custom UDP services

Possible results:

- **Reachable** – a response was received
- **Echo verified** – probe token returned by service
- **Port closed** – host reachable but nothing listening
- **Filtered / timeout** – packets likely blocked by NAT or firewall

### TCP Probe

Checks whether a TCP connection can be established to the specified port.

Results include:

- **Reachable** – TCP handshake succeeded
- **Latency** – connection time
- **HTTP status** (optional for web ports)

Example:

```
TCP reachable • HTTP 404
```

This means the port is open but the web server returned a 404 response.

---

## Common Uses

CGNAT.xyz helps diagnose:

- Carrier‑grade NAT on mobile networks
- Port forwarding issues
- WireGuard connectivity problems
- ISP inbound filtering
- Firewall or router misconfiguration

---

## Privacy

The tool only uses:

- Your detected public IP
- The host and port you choose to probe

No persistent logs or tracking are stored.
