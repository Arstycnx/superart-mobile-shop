
var http = require('http');
var fs = require('fs');
var path = require('path');

var PORT = 3012;
var DIST = '/home/st66223537/dist';
var PREFIX = '/~st66223537';

var MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.json': 'application/json',
};

function serveFile(res, filePath) {
    fs.readFile(filePath, function (err, data) {
        if (err) {
            res.writeHead(500);
            res.end('Server Error');
            return;
        }
        var ext = path.extname(filePath);
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(data);
    });
}

function serveIndex(res) {
    serveFile(res, path.join(DIST, 'index.html'));
}

http.createServer(function (req, res) {
    // Decode URL (handle %7E etc.)
    var rawUrl = req.url || '/';
    var urlPath = '';
    try { urlPath = decodeURIComponent(rawUrl.split('?')[0]); }
    catch (e) { urlPath = rawUrl.split('?')[0]; }

    // Normalize: strip prefix or redirect root
    if (urlPath === '/' || urlPath === '') {
        res.writeHead(302, { Location: PREFIX + '/' });
        res.end();
        return;
    }

    // Must start with prefix
    if (urlPath.indexOf(PREFIX) !== 0) {
        res.writeHead(404);
        res.end('Not Found');
        return;
    }

    var relative = urlPath.slice(PREFIX.length) || '/';
    if (relative === '' || relative === '/') {
        serveIndex(res);
        return;
    }

    var filePath = path.join(DIST, relative);

    // Prevent path traversal
    if (filePath.indexOf(DIST) !== 0) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    fs.stat(filePath, function (err, stat) {
        if (err || !stat.isFile()) {
            // SPA fallback — serve index.html for client-side routing
            serveIndex(res);
            return;
        }
        serveFile(res, filePath);
    });

}).listen(PORT, function () {
    console.log('Frontend server running on port ' + PORT);
    console.log('Access: 10.80.231.125:' + PORT + PREFIX + '/');
});
