import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'gas-proxy',
        configureServer(server) {
          server.middlewares.use('/api/gas-proxy', async (req, res) => {
            if (req.method === 'POST') {
              let body = '';
              req.on('data', (chunk) => {
                body += chunk;
              });
              req.on('end', async () => {
                try {
                  const { scriptUrl, method, payload, queryParams } = JSON.parse(body || '{}');
                  let targetUrl = scriptUrl;
                  if (!targetUrl) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'Missing scriptUrl' }));
                    return;
                  }
                  if (queryParams) {
                    const q = new URLSearchParams(queryParams).toString();
                    targetUrl += (targetUrl.includes('?') ? '&' : '?') + q;
                  }
                  const fetchOptions: RequestInit = {
                    method: method || 'GET',
                    redirect: 'follow',
                  };
                  if (method === 'POST' && payload) {
                    fetchOptions.headers = { 'Content-Type': 'application/json' };
                    fetchOptions.body = JSON.stringify(payload);
                  }
                  const upstream = await fetch(targetUrl, fetchOptions);
                  const data = await upstream.text();
                  res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
                  res.statusCode = upstream.status;
                  res.end(data);
                } catch (e) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: String(e) }));
                }
              });
            } else {
              res.statusCode = 405;
              res.end('Method Not Allowed');
            }
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname || '.', '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
