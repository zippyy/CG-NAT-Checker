export async function onRequest(context) {
  const req = context.request;

  const ip =
    req.headers.get("CF-Connecting-IP") ||
    req.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    "";

  const cf = req.cf || {};
  const gateway = req.headers.get("X-CGNAT-Gateway") || null;

  const headers = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "Content-Type, X-CGNAT-Gateway",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  return new Response(JSON.stringify({
    ip,
    family: ip.includes(":") ? "IPv6" : "IPv4",
    gateway,
    cf: {
      asn: cf.asn ?? null,
      asOrganization: cf.asOrganization ?? null,
      country: cf.country ?? null,
      region: cf.region ?? null,
      city: cf.city ?? null,
      colo: cf.colo ?? null,
      timezone: cf.timezone ?? null,
    }
  }), { headers });
}
