import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
try {
  process.loadEnvFile(path.join(root, '.env'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const api = new URL(process.env.API_URL ?? 'http://127.0.0.1:3000');
if (!['http:', 'https:'].includes(api.protocol) || api.username || api.password)
  throw new Error('API_URL deve ser um endereço HTTP/HTTPS sem credenciais.');
const port = Number(process.env.WEB_PORT ?? 5173);
const host = process.env.WEB_HOST ?? '127.0.0.1';
const files = new Map([
  ['/', ['site/index.html', 'text/html; charset=utf-8']],
  ['/admin', ['admin/index.html', 'text/html; charset=utf-8']],
  ['/admin/', ['admin/index.html', 'text/html; charset=utf-8']],
  ['/admin/index.html', ['admin/index.html', 'text/html; charset=utf-8']],
  [
    '/admin/assets/admin.css',
    ['admin/assets/admin.css', 'text/css; charset=utf-8'],
  ],
  [
    '/admin/assets/admin.js',
    ['admin/assets/admin.js', 'text/javascript; charset=utf-8'],
  ],
  [
    '/admin/assets/api.js',
    ['admin/assets/api.js', 'text/javascript; charset=utf-8'],
  ],
  ['/admin/assets/logo-laco.png', ['admin/assets/logo-laco.png', 'image/png']],
]);

export function createServer() {
  return http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');
    try {
      const incoming = new URL(req.url ?? '/', 'http://localhost');
      if (
        decodeURIComponent(incoming.pathname)
          .split('/')
          .some((segment) => segment.startsWith('.'))
      ) {
        res.writeHead(404).end();
        return;
      }
      if (incoming.pathname.startsWith('/api/')) {
        if (!['GET', 'POST', 'PATCH'].includes(req.method)) {
          res.writeHead(405).end();
          return;
        }
        const target = new URL(api);
        target.pathname =
          api.pathname.replace(/\/$/, '') + incoming.pathname.slice(4);
        target.search = incoming.search;
        const chunks = [];
        let size = 0;
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 64 * 1024) {
            res
              .writeHead(413, { 'Content-Type': 'application/json' })
              .end(JSON.stringify({ message: 'Requisição muito grande.' }));
            return;
          }
          chunks.push(chunk);
        }
        const headers = { Accept: req.headers.accept ?? 'application/json' };
        for (const key of ['authorization', 'content-type'])
          if (req.headers[key]) headers[key] = req.headers[key];
        const upstream = await fetch(target, {
          method: req.method,
          headers,
          body: req.method === 'GET' ? undefined : Buffer.concat(chunks),
          signal: AbortSignal.timeout(15000),
          redirect: 'error',
        });
        for (const key of ['content-type', 'content-disposition'])
          if (upstream.headers.has(key))
            res.setHeader(key, upstream.headers.get(key));
        res.writeHead(upstream.status);
        res.end(Buffer.from(await upstream.arrayBuffer()));
        return;
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405).end();
        return;
      }
      let asset = files.get(incoming.pathname);
      if (!asset && !incoming.pathname.startsWith('/admin/')) {
        const relative = decodeURIComponent(incoming.pathname).replace(
          /^\/+/,
          '',
        );
        const candidate = path.resolve(root, 'site', relative || 'index.html');
        const siteRoot = path.resolve(root, 'site') + path.sep;
        const types = {
          '.html': 'text/html; charset=utf-8',
          '.css': 'text/css; charset=utf-8',
          '.js': 'text/javascript; charset=utf-8',
          '.json': 'application/json',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.svg': 'image/svg+xml',
          '.ico': 'image/x-icon',
          '.webp': 'image/webp',
          '.woff': 'font/woff',
          '.woff2': 'font/woff2',
        };
        const type = types[path.extname(candidate)];
        if (candidate.startsWith(siteRoot) && type)
          asset = [path.relative(root, candidate), type];
      }
      if (!asset) {
        res.writeHead(404).end('Página não encontrada.');
        return;
      }
      let contents;
      try {
        contents = await readFile(path.join(root, asset[0]));
      } catch (error) {
        if (error.code === 'ENOENT' || error.code === 'EISDIR') {
          res.writeHead(404).end('Página não encontrada.');
          return;
        }
        throw error;
      }
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
      );
      res.writeHead(200, { 'Content-Type': asset[1] });
      res.end(req.method === 'HEAD' ? undefined : contents);
    } catch {
      if (!res.headersSent)
        res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          message:
            'Não foi possível acessar o servidor. Verifique a conexão e tente novamente.',
        }),
      );
    }
  });
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const server = createServer();
  server.listen(port, host, () =>
    console.log(`Painel Laço: http://${host}:${port}`),
  );
  for (const signal of ['SIGTERM', 'SIGINT'])
    process.on(signal, () => server.close(() => process.exit(0)));
}
