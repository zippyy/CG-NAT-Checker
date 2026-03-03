export async function onRequest(context) {
  const req = context.request;
  const h = req.headers;
  const ip = h.get("CF-Connecting-IP") || "";
  const cf = req.cf || {};
  return new Response(JSON.stringify({
    ip,
    cf: {
      asn: cf.asn ?? null,
      asOrganization: cf.asOrganization ?? null
    }
  }), {
    headers:{
      "content-type":"application/json",
      "cache-control":"no-store",
      "access-control-allow-origin":"*"
    }
  });
}
