export async function onRequest(context) {
  const req = context.request;
  const headers = req.headers;

  const cfConnectingIp = headers.get("CF-Connecting-IP") || "";
  const xff = headers.get("X-Forwarded-For") || "";

  const firstXff = xff
    .split(",")
    .map((part) => part.trim())
    .find(Boolean) || "";

  const isIPv4 = (value) => {
    if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) return false;
    const octets = value.split(".").map(Number);
    return octets.every((n) => Number.isInteger(n) && n >= 0 && n <= 255);
  };

  const isIPv6 = (value) =>
    /^[0-9a-fA-F:]+$/.test(value) && value.includes(":") && value.length <= 45;

  const normalizeIp = (value) => {
    const ip = String(value || "").trim();
    if (!ip) return "";
    return isIPv4(ip) || isIPv6(ip) ? ip : "";
  };

  const validatedCfIp = normalizeIp(cfConnectingIp);
  const validatedXffIp = normalizeIp(firstXff);
  const ip = validatedCfIp || validatedXffIp || "";

  const cf = req.cf || {};

  return new Response(
    JSON.stringify({
      ip,
      source: validatedCfIp ? "cf-connecting-ip" : validatedXffIp ? "x-forwarded-for" : null,
      forwardedFor: validatedXffIp || null,
      cf: {
        asn: cf.asn ?? null,
        asOrganization: cf.asOrganization ?? null,
        country: cf.country ?? null,
        region: cf.region ?? null,
        city: cf.city ?? null,
        colo: cf.colo ?? null,
        timezone: cf.timezone ?? null,
      },
    }),
    {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    }
  );
}
