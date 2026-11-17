import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outDir = path.join(root, '.playwright-cli/build-trans/out');
fs.mkdirSync(outDir, { recursive: true });

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.json': 'application/json',
};

const server = http.createServer((req, res) => {
  const urlPath = (req.url || '/').split('?')[0];

  if (req.method === 'POST' && urlPath.startsWith('/save/')) {
    const name = urlPath.slice('/save/'.length).replace(/[^a-zA-Z0-9._-]/g, '');
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const buf = Buffer.concat(chunks);
      fs.writeFileSync(path.join(outDir, name), buf);
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('ok');
    });
    return;
  }

  let filePath;
  if (urlPath.startsWith('/public/')) {
    filePath = path.join(root, urlPath.slice(1));
  } else if (urlPath.startsWith('/build/')) {
    filePath = path.join(root, '.playwright-cli/build-trans', urlPath.slice('/build/'.length));
  } else {
    filePath = path.join(root, '.playwright-cli/build-trans', urlPath.replace(/^\/+/, ''));
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(4199, '127.0.0.1', () => {
  console.log('Asset server listening on http://127.0.0.1:4199');
});
