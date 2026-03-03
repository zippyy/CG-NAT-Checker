export async function onRequest(context) {
  const url = new URL(context.request.url);

  const host = (url.searchParams.get("host") || "").trim();
  const port = (url.searchParams.get("port") || "51820").trim();
  const path = (url.searchParams.get("path") || "").trim(); // optional for HTTP probe through fly aggregator
  const scheme = (url.searchParams.get("scheme") || "http").trim();

  if (!host) {
    return new Response(JSON.stringify({ error: "host is required" }), {
      status: 400,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      }
    });
  }

  // Configure these in Cloudflare Pages project settings:
  // - FLY_PROBE_BASE (example: https://udp-probe.fly.dev)
  // - PROBE_KEY (same as Fly PROBE_KEY secret)
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

  const flyUrl = new URL(flyBase.replace(/\/+$/, "") + "/probe");
  flyUrl.searchParams.set("host", host);
  flyUrl.searchParams.set("port", port);
  if (path) flyUrl.searchParams.set("path", path);
  if (scheme) flyUrl.searchParams.set("scheme", scheme);
  if (key) flyUrl.searchParams.set("key", key);

  const resp = await fetch(flyUrl.toString(), {
    method: "GET",
    headers: {
      "accept": "application/json",
      "user-agent": "cgnat.xyz-pages-proxy"
    },
    cf: { cacheTtl: 0, cacheEverything: false }
  });

  const body = await resp.text();

  // Pass-through status + content-type, but ensure no caching
  const headers = new Headers(resp.headers);
  headers.set("cache-control", "no-store");
  if (!headers.get("content-type")) headers.set("content-type", "application/json; charset=utf-8");

  return new Response(body, { status: resp.status, headers });
}
