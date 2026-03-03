async function fetchWithTimeout(url, timeoutMs) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: ctrl.signal,
      headers: { "user-agent": "cgnat.xyz inbound probe" }
    });
    const text = await res.text().catch(() => "");
    const lower = text.toLowerCase();

    // Cloudflare edge/intercept signatures (common when hitting an IP that's behind CF or blocked by CF)
    const cfEdge =
      lower.includes("error code: 1003") ||
      lower.includes("cloudflare") && lower.includes("ray id") ||
      lower.includes("direct ip access not allowed") ||
      lower.includes("attention required") && lower.includes("cloudflare");

    // Some carrier/captive portal patterns (very heuristic)
    const captive =
      lower.includes("captive portal") ||
      lower.includes("sign in to network") ||
      lower.includes("walled garden");

    return {
      tcpReachable: true,
      status: res.status,
      ok2xx: res.status >= 200 && res.status < 300,
      redirect: [301,302,307,308].includes(res.status),
      edgeIntercept: cfEdge,
      captivePortalLikely: captive,
      sample: text.slice(0, 220)
    };
  } catch (e) {
    return { tcpReachable: false, error: String(e) };
  } finally {
    clearTimeout(t);
  }
}

export async function onRequest(context) {
  const req = context.request;
  const url = new URL(req.url);

  const host = (url.searchParams.get("host") || "").trim();
  const scheme = (url.searchParams.get("scheme") || "http").trim().toLowerCase();
  const port = (url.searchParams.get("port") || "").trim();
  const path = (url.searchParams.get("path") || "/").trim() || "/";

  if (!host) return new Response(JSON.stringify({ error: "host is required" }), { status: 400 });
  if (scheme !== "http" && scheme !== "https") return new Response(JSON.stringify({ error: "scheme must be http or https" }), { status: 400 });

  const p = port ? Number(port) : (scheme === "https" ? 443 : 80);
  if (!Number.isInteger(p) || p < 1 || p > 65535) return new Response(JSON.stringify({ error: "invalid port" }), { status: 400 });

  const safePath = path.startsWith("/") ? path : "/" + path;
  const target = `${scheme}://${host}:${p}${safePath}`;

  const result = await fetchWithTimeout(target, 4500);

  return new Response(JSON.stringify({ target, result }), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*"
    }
  });
}
