import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { runScrape } from './scrape_respect.js';

const ROOT_DIR = process.cwd();
const DEFAULT_PORT = Number(process.env.PORT || 8787);
const RAW_PRODUCTS_PATH = path.join(ROOT_DIR, 'data', 'respect_products_raw.json');

const CONTENT_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
};

let refreshPromise = null;
const refreshState = {
  running: false,
  startedAt: '',
  finishedAt: '',
  lastError: '',
  totalProducts: 0,
  generatedAt: '',
};

async function loadSnapshotState() {
  if (refreshState.totalProducts || refreshState.generatedAt) return;

  try {
    const [content, stats] = await Promise.all([
      fs.readFile(RAW_PRODUCTS_PATH, 'utf8'),
      fs.stat(RAW_PRODUCTS_PATH),
    ]);
    const products = JSON.parse(content);
    const collectedTimes = Array.isArray(products)
      ? products.map((product) => product.data_hora_coleta).filter(Boolean).sort()
      : [];

    refreshState.totalProducts = Array.isArray(products) ? products.length : 0;
    refreshState.generatedAt = collectedTimes.at(-1) || stats.mtime.toISOString();
  } catch {
    // Status still works before the first scrape creates the data file.
  }
}

function jsonResponse(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  response.end(JSON.stringify(payload));
}

function textResponse(response, statusCode, message) {
  response.writeHead(statusCode, {
    'content-type': 'text/plain; charset=utf-8',
    'cache-control': 'no-store',
  });
  response.end(message);
}

function redirect(response, location) {
  response.writeHead(302, { location });
  response.end();
}

function getContentType(filePath) {
  return CONTENT_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

function resolveStaticPath(requestPath) {
  const decoded = decodeURIComponent(requestPath.split('?')[0]);
  const safeRelativePath = decoded.replace(/^\/+/, '') || 'reports/respect_price_report.html';
  const resolved = path.resolve(ROOT_DIR, safeRelativePath);
  const relative = path.relative(ROOT_DIR, resolved);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return null;
  }

  return resolved;
}

async function startRefresh() {
  if (refreshPromise) return refreshPromise;

  refreshState.running = true;
  refreshState.startedAt = new Date().toISOString();
  refreshState.finishedAt = '';
  refreshState.lastError = '';

  refreshPromise = runScrape({ printSummary: false })
    .then((reportData) => {
      refreshState.totalProducts = reportData.products.length;
      refreshState.generatedAt = reportData.generatedAt;
      refreshState.finishedAt = new Date().toISOString();
      return {
        ok: true,
        generatedAt: reportData.generatedAt,
        totalProducts: reportData.products.length,
        finishedAt: refreshState.finishedAt,
      };
    })
    .catch((error) => {
      refreshState.lastError = error.message || String(error);
      refreshState.finishedAt = new Date().toISOString();
      throw error;
    })
    .finally(() => {
      refreshState.running = false;
      refreshPromise = null;
    });

  return refreshPromise;
}

async function serveStatic(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || '127.0.0.1'}`);

  if (url.pathname === '/') {
    redirect(response, '/reports/respect_price_report.html');
    return;
  }

  const filePath = resolveStaticPath(url.pathname);
  if (!filePath) {
    textResponse(response, 403, 'Caminho nao permitido.');
    return;
  }

  try {
    const content = await fs.readFile(filePath);
    response.writeHead(200, {
      'content-type': getContentType(filePath),
      'cache-control': filePath.endsWith('.html') ? 'no-store' : 'public, max-age=60',
    });
    response.end(content);
  } catch (error) {
    const status = error.code === 'ENOENT' ? 404 : 500;
    textResponse(response, status, status === 404 ? 'Arquivo nao encontrado.' : error.message);
  }
}

function createDashboardServer() {
  return http.createServer(async (request, response) => {
    const url = new URL(request.url, `http://${request.headers.host || '127.0.0.1'}`);

    if (url.pathname === '/api/status') {
      await loadSnapshotState();
      jsonResponse(response, 200, {
        app: 'respect-dashboard',
        ...refreshState,
      });
      return;
    }

    if (url.pathname === '/api/refresh') {
      if (!['POST', 'GET'].includes(request.method)) {
        jsonResponse(response, 405, { ok: false, error: 'Metodo nao permitido.' });
        return;
      }

      try {
        const result = await startRefresh();
        jsonResponse(response, 200, result);
      } catch (error) {
        jsonResponse(response, 500, {
          ok: false,
          error: error.message || String(error),
          finishedAt: refreshState.finishedAt,
        });
      }
      return;
    }

    await serveStatic(request, response);
  });
}

function parsePort(argv) {
  const index = argv.findIndex((arg) => arg === '--port' || arg === '-p');
  if (index >= 0) {
    return Number(argv[index + 1] || DEFAULT_PORT);
  }

  const inline = argv.find((arg) => arg.startsWith('--port='));
  if (inline) {
    return Number(inline.split('=')[1] || DEFAULT_PORT);
  }

  return DEFAULT_PORT;
}

async function main() {
  const port = parsePort(process.argv.slice(2));
  await loadSnapshotState();
  const server = createDashboardServer();

  server.listen(port, '127.0.0.1', () => {
    console.log(`Dashboard live: http://127.0.0.1:${port}/reports/respect_price_report.html`);
    console.log('Ao abrir/recarregar, a pagina chama /api/refresh e regenera os dados.');
  });
}

export { createDashboardServer, getContentType, parsePort };

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main().catch((error) => {
    console.error('\nFalha ao iniciar dashboard live.');
    console.error(error.message || error);
    process.exitCode = 1;
  });
}
