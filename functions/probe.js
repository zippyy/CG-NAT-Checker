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
  const mask = (0xFFFFFFFF << (32-maskBits))>>>0;
  return (ipInt & mask)===(baseInt & mask);
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

export async function onRequest(context) {
  const req = context.request;
  const url = new URL(req.url);

  const host = (url.searchParams.get("host") || "").trim();
  const port = Number(url.searchParams.get("port") || 80);
  const scheme = (url.searchParams.get("scheme") || "http").trim().toLowerCase();

  if (!host) {
    return new Response(JSON.stringify({ error: "host required" }), { status: 400 });
  }

  if (isIPv4(host) && isPrivateOrReservedIPv4(host)) {
    return new Response(JSON.stringify({ error: "refusing private/reserved probe" }), { status: 400 });
  }

  const target = `${scheme}://${host}:${port}/`;

  try {
    const res = await fetch(target, { redirect: "manual" });
    return new Response(JSON.stringify({
      target,
      status: res.status,
      ok: res.ok
    }), {
      headers: { "content-type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({
      target,
      error: String(e)
    }), {
      headers: { "content-type": "application/json" }
    });
  }
}
