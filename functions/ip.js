export async function onRequest(context) {
  const req = context.request;
  const ip = req.headers.get("CF-Connecting-IP") || "";
  const cf = req.cf || {};

  return new Response(JSON.stringify({
    ip,
    cf: {
      asn: cf.asn ?? null,
      asOrganization: cf.asOrganization ?? null,
      country: cf.country ?? null
    }
  }), {
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store"
    }
  });
}
