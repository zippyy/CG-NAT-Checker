export async function onRequest(context) {
  const url = new URL(context.request.url);

  const host = (url.searchParams.get("host") || "").trim();
  const port = (url.searchParams.get("port") || "51820").trim();
  const mode = (url.searchParams.get("mode") || "both").trim(); // udp|tcp|both

  if (!host) {
    return new Response(JSON.stringify({ error: "host is required" }), {
      status: 400,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      }
    });
  }

  // Cloudflare Pages env vars (Project Settings -> Environment variables)
  // - FLY_PROBE_BASE: e.g. https://udp-probe.fly.dev
  // - PROBE_KEY: optional, but recommended (must match Fly PROBE_KEY)
  const env = context.env || {};
  const flyBase = (env.FLY_PROBE_BASE || "").trim();
  const key = (env.PROBE_KEY || "").trim();

  if (!flyBase) {
    return new Response(JSON.stringify({ error: "Missing Pages env var FLY_PROBE_BASE" }), {
      status: 500,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      }
    });
  }

  const base = flyBase.replace(/\/+$/, "");

  async function call(path) {
    const u = new URL(base + path);
    u.searchParams.set("host", host);
    u.searchParams.set("port", port);
    if (key) u.searchParams.set("key", key);

    const resp = await fetch(u.toString(), {
      method: "GET",
      headers: {
        "accept": "application/json",
        "user-agent": "cgnat.xyz-pages-proxy"
      },
      cf: { cacheTtl: 0, cacheEverything: false }
    });

    const text = await resp.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* ignore */ }

    return { ok: resp.ok, status: resp.status, text, json };
  }

  // Fly app supports:
  // - /udp-probe
  // - /tcp-probe
  const wantUDP = (mode === "udp" || mode === "both");
  const wantTCP = (mode === "tcp" || mode === "both");

  const out = {
    host,
    port,
    timestamp: new Date().toISOString(),
    udp: null,
    tcp: null,
    fly: { base }
  };

  const [udpRes, tcpRes] = await Promise.all([
    wantUDP ? call("/udp-probe") : Promise.resolve(null),
    wantTCP ? call("/tcp-probe") : Promise.resolve(null),
  ]);

  function normalize(r) {
    if (!r) return null;
    if (r.ok && r.json) return r.json;
    return {
      target: host + ":" + port,
      reachable: false,
      error: r.json?.error || r.text || ("HTTP " + r.status)
    };
  }

  if (udpRes) out.udp = normalize(udpRes);
  if (tcpRes) out.tcp = normalize(tcpRes);

  const allFailed = (wantUDP && !udpRes?.ok) && (wantTCP && !tcpRes?.ok);
  const status = allFailed ? 502 : 200;

  return new Response(JSON.stringify(out), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    }
  });
}
