export async function onRequest(context) {
  const req = context.request;
  const h = req.headers;

  const cfConnectingIp = h.get("CF-Connecting-IP") || "";
  const xff = h.get("X-Forwarded-For") || "";
  const xffFirst = xff ? xff.split(",")[0].trim() : "";
  const ip = cfConnectingIp || xffFirst || "";

  const cf = req.cf || {};

  const headers = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "Content-Type",
  };

  if (req.method === "OPTIONS") return new Response(null, { headers });

  return new Response(JSON.stringify({
    ip,
    forwardedFor: xffFirst || null,
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
