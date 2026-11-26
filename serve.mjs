// Dev-only static server for SKY COURIER (Node 22, standard library only).
// Serves game/ on http://localhost:8080 — the entry itself needs no server.
// Usage: node serve.mjs [port]
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const root = join(here, 'game');
const port = Number(process.argv[2] || 8080);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json' };

createServer((req, res) => {
  const path = join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html');
  // join() normalises ".." away, so anything escaping game/ fails the prefix check
  if (!path.startsWith(root) || !existsSync(path)) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream' });
  res.end(readFileSync(path));
}).listen(port, () => console.log('SKY COURIER at http://localhost:' + port));
