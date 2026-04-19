import fs from 'fs';
import fsp from 'fs/promises';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PORT = Number.parseInt(process.env.PORT || '8000', 10);
const HOST = process.env.HOST || '127.0.0.1';

const MIME_TYPES = {
    '.css': 'text/css; charset=utf-8',
    '.gif': 'image/gif',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain; charset=utf-8',
    '.webp': 'image/webp',
    '.xml': 'application/xml; charset=utf-8'
};

const WATCHED_EXTENSIONS = new Set([
    '.css',
    '.html',
    '.js',
    '.json',
    '.xml'
]);

const SSE_CLIENTS = new Set();

const LIVE_RELOAD_SNIPPET = `
<script>
(() => {
    if (window.__liveReloadConnected) return;
    window.__liveReloadConnected = true;

    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    const source = new EventSource(protocol + '//' + window.location.host + '/__live-reload');

    source.addEventListener('reload', () => {
        window.location.reload();
    });

    source.onerror = () => {
        source.close();
        window.__liveReloadConnected = false;
        setTimeout(() => window.location.reload(), 1000);
    };
})();
</script>
`;

function isSubPath(targetPath) {
    const relativePath = path.relative(ROOT_DIR, targetPath);
    return relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
}

function injectLiveReload(html) {
    if (html.includes('/__live-reload')) {
        return html;
    }

    if (html.includes('</body>')) {
        return html.replace('</body>', `${LIVE_RELOAD_SNIPPET}\n</body>`);
    }

    return `${html}\n${LIVE_RELOAD_SNIPPET}`;
}

async function readHtmlFile(filePath) {
    const html = await fsp.readFile(filePath, 'utf8');
    return injectLiveReload(html);
}

async function resolveFilePath(requestPath) {
    const urlPath = decodeURIComponent(requestPath.split('?')[0]);
    const normalizedPath = urlPath === '/' ? '/index.html' : urlPath;
    const targetPath = path.normalize(path.join(ROOT_DIR, normalizedPath));

    if (!isSubPath(targetPath) && targetPath !== path.join(ROOT_DIR, 'index.html')) {
        return null;
    }

    try {
        const stats = await fsp.stat(targetPath);
        if (stats.isDirectory()) {
            const indexPath = path.join(targetPath, 'index.html');
            const indexStats = await fsp.stat(indexPath);
            if (indexStats.isFile()) {
                return indexPath;
            }
        }

        if (stats.isFile()) {
            return targetPath;
        }
    } catch {
        return null;
    }

    return null;
}

function sendSseEvent(eventName, payload = '{}') {
    for (const client of SSE_CLIENTS) {
        client.write(`event: ${eventName}\n`);
        client.write(`data: ${payload}\n\n`);
    }
}

function watchProject() {
    fs.watch(ROOT_DIR, { recursive: true }, (_eventType, filename) => {
        if (!filename) {
            return;
        }

        const extension = path.extname(filename).toLowerCase();
        if (!WATCHED_EXTENSIONS.has(extension)) {
            return;
        }

        sendSseEvent('reload', JSON.stringify({ file: filename }));
    });
}

const server = http.createServer(async (req, res) => {
    if (!req.url) {
        res.writeHead(400);
        res.end('Bad Request');
        return;
    }

    if (req.url === '/__live-reload') {
        res.writeHead(200, {
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'Content-Type': 'text/event-stream; charset=utf-8'
        });
        res.write('\n');

        SSE_CLIENTS.add(res);
        req.on('close', () => {
            SSE_CLIENTS.delete(res);
        });
        return;
    }

    const filePath = await resolveFilePath(req.url);

    if (!filePath) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not Found');
        return;
    }

    const extension = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[extension] || 'application/octet-stream';

    try {
        if (extension === '.html') {
            const html = await readHtmlFile(filePath);
            res.writeHead(200, {
                'Cache-Control': 'no-store',
                'Content-Type': contentType
            });
            res.end(html);
            return;
        }

        const fileBuffer = await fsp.readFile(filePath);
        res.writeHead(200, {
            'Cache-Control': 'no-store',
            'Content-Type': contentType
        });
        res.end(fileBuffer);
    } catch (error) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`Server error: ${error.message}`);
    }
});

watchProject();

server.listen(PORT, HOST, () => {
    console.log(`Dev server running at http://${HOST}:${PORT}`);
});
