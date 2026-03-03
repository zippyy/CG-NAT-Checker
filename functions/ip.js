export async function onRequest(context) {
  const req = context.request;
  const h = req.headers;

  const cfConnectingIp = h.get("CF-Connecting-IP") || "";
  const xff = h.get("X-Forwarded-For") || "";
  const xffFirst = xff ? xff.split(",")[0].trim() : "";

  const ip = (cfConnectingIp || xffFirst || "").trim();

  const cf = req.cf || {};

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
  }), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*"
    }
  });
}
