async function fetchWithTimeout(url, timeoutMs) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      redirect: "manual",
      signal: ctrl.signal,
      headers: { "user-agent": "cgnat.xyz inbound probe" }
    });

    const body = await res.text().catch(() => "");
    const lower = body.toLowerCase();

    const cloudflareIntercept =
      lower.includes("error code: 1003") ||
      lower.includes("cloudflare") ||
      lower.includes("ray id");

    return {
      tcpReachable: true,
      status: res.status,
      ok: res.status >= 200 && res.status < 300,
      intercept: cloudflareIntercept
    };

  } catch (e) {
    return {
      tcpReachable: false,
      error: String(e)
    };
  } finally {
    clearTimeout(t);
  }
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const host = (url.searchParams.get("host") || "").trim();
  const port = url.searchParams.get("port") || "80";
  const scheme = url.searchParams.get("scheme") || "http";

  if (!host) {
    return new Response(JSON.stringify({ error: "host required" }), { status: 400 });
  }

  const target = `${scheme}://${host}:${port}/`;
  const result = await fetchWithTimeout(target, 4000);

  return new Response(JSON.stringify({ target, result }), {
    headers: { "content-type": "application/json", "cache-control": "no-store" }
  });
}
