const http = require('http');
const fs = require('fs');
const path = require('path');
const dist = path.join(__dirname, 'app/dist');
const basePath = '/chess';
const mime = {'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.woff2':'font/woff2','.woff':'font/woff','.png':'image/png','.ico':'image/x-icon'};
http.createServer((req, res) => {
  // Strip base path prefix
  let urlPath = req.url.split('?')[0];
  if (urlPath.startsWith(basePath)) {
    urlPath = urlPath.slice(basePath.length) || '/';
  }
  let fp = path.join(dist, urlPath === '/' ? 'index.html' : urlPath);
  if (!fs.existsSync(fp)) fp = path.join(dist, 'index.html');
  const ext = path.extname(fp);
  res.writeHead(200, {'Content-Type': mime[ext] || 'application/octet-stream'});
  fs.createReadStream(fp).pipe(res);
}).listen(8090, () => console.log('Chess AI serving on :8090'));
