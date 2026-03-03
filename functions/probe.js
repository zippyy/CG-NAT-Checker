function isIPv4(ip) {
  return typeof ip === "string" && /^\d{1,3}(\.\d{1,3}){3}$/.test(ip);
}

function ipv4ToInt(ip) {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some(n => Number.isNaN(n) || n < 0 || n > 255)) return null;
  return ((p[0] << 24) >>> 0) + (p[1] << 16) + (p[2] << 8) + p[3];
}

function inCidr4(ip, base, maskBits) {
  const ipInt = ipv4ToInt(ip);
  const baseInt = ipv4ToInt(base);
  if (ipInt === null || baseInt === null) return false;
  const mask = maskBits === 0 ? 0 : (0xFFFFFFFF << (32 - maskBits)) >>> 0;
  return (ipInt & mask) === (baseInt & mask);
}

function isPrivateOrReservedIPv4(ip) {
  return (
    inCidr4(ip, "10.0.0.0", 8) ||
    inCidr4(ip, "172.16.0.0", 12) ||
    inCidr4(ip, "192.168.0.0", 16) ||
    inCidr4(ip, "127.0.0.0", 8) ||
    inCidr4(ip, "169.254.0.0", 16) ||
    inCidr4(ip, "100.64.0.0", 10) ||
    inCidr4(ip, "224.0.0.0", 4)
  );
}

async function fetchWithTimeout(url, timeoutMs) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: ctrl.signal,
      headers: { "user-agent": "cgnat.xyz inbound probe" },
    });
    const text = await res.text().catch(() => "");
    return {
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      url: res.url,
      sample: text.slice(0, 200),
    };
  } finally {
    clearTimeout(t);
  }
}

export async function onRequest(context) {
  const req = context.request;
  const url = new URL(req.url);

  const host = (url.searchParams.get("host") || "").trim();
  const portStr = (url.searchParams.get("port") || "").trim();
  const scheme = (url.searchParams.get("scheme") || "http").trim().toLowerCase();
  const path = (url.searchParams.get("path") || "/").trim() || "/";

  const headers = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "Content-Type",
  };

  if (req.method === "OPTIONS") return new Response(null, { headers });

  if (!host) return new Response(JSON.stringify({ error: "host is required" }), { status: 400, headers });
  if (scheme !== "http" && scheme !== "https") {
    return new Response(JSON.stringify({ error: "scheme must be http or https" }), { status: 400, headers });
  }

  const port = portStr ? Number(portStr) : (scheme === "https" ? 443 : 80);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return new Response(JSON.stringify({ error: "invalid port" }), { status: 400, headers });
  }

  if (isIPv4(host) && isPrivateOrReservedIPv4(host)) {
    return new Response(JSON.stringify({ error: "refusing to probe private/reserved IPv4" }), { status: 400, headers });
  }

  const safePath = path.startsWith("/") ? path : "/" + path;
  const target = `${scheme}://${host}:${port}${safePath}`;

  try {
    const result = await fetchWithTimeout(target, 3500);
    return new Response(JSON.stringify({ target, result }), { headers });
  } catch (e) {
    return new Response(JSON.stringify({ target, error: String(e) }), { headers });
  }
}
