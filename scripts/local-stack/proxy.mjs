// Local Supabase stand-in: /rest/v1 -> PostgREST, /storage/v1 -> tiny file store.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
const ROOT = process.env.STORE_DIR ?? "/var/tmp/kstore";
const send = (res, code, body, type = "application/json") => { res.writeHead(code, { "content-type": type, "access-control-allow-origin": "*" }); res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body)); };
const readBody = (req) => new Promise((r) => { const c = []; req.on("data", (d) => c.push(d)); req.on("end", () => r(Buffer.concat(c))); });
http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  if (u.pathname.startsWith("/rest/v1")) {
    const body = await readBody(req);
    const headers = { ...req.headers }; delete headers.host;
    const p = http.request({ host: "127.0.0.1", port: 54322, path: u.pathname.replace("/rest/v1", "") + u.search, method: req.method, headers }, (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
    p.end(body); return;
  }
  if (u.pathname.startsWith("/storage/v1/object/sign/")) {
    const rest = decodeURIComponent(u.pathname.slice("/storage/v1/object/sign/".length));
    if (req.method === "POST") {
      const { paths } = JSON.parse((await readBody(req)).toString());
      return send(res, 200, paths.map((p) => ({ path: p, signedURL: `/object/sign/${rest}/${p}?token=t`, error: null })));
    }
    const f = path.join(ROOT, rest);
    return fs.existsSync(f) ? send(res, 200, fs.readFileSync(f), "image/jpeg") : send(res, 404, { error: "nf" });
  }
  if (u.pathname.startsWith("/storage/v1/object/")) {
    const rest = decodeURIComponent(u.pathname.slice("/storage/v1/object/".length));
    if (req.method === "DELETE") { const { prefixes } = JSON.parse((await readBody(req)).toString()); for (const p of prefixes) fs.rmSync(path.join(ROOT, rest, p), { force: true }); return send(res, 200, []); }
    const f = path.join(ROOT, rest); fs.mkdirSync(path.dirname(f), { recursive: true });
    const body = await readBody(req);
    fs.writeFileSync(f, body);
    return send(res, 200, { Key: rest, Id: "1" });
  }
  send(res, 404, { error: "unknown " + u.pathname });
}).listen(54321, () => console.log("proxy on 54321"));
