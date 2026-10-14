import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Test endpoint for Apps Script
  app.post('/api/test-gas', async (req: Request, res: Response) => {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      res.status(400).json({ success: false, message: 'URL is required' });
      return;
    }

    try {
      const startTime = Date.now();
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'HygieneInspectionApp/1.0',
        },
        redirect: 'follow',
      });
      const responseTime = Date.now() - startTime;
      const text = await response.text();
      let parsed = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        // Not JSON
      }

      const isPermissionDenied = text.includes('accounts.google.com') || 
                                 text.includes('Sign in to continue') ||
                                 text.includes('warning-bar-table') ||
                                 response.status === 403;

      res.json({
        success: response.ok && !isPermissionDenied,
        status: response.status,
        responseTimeMs: responseTime,
        isJson: parsed !== null,
        data: parsed,
        isPermissionDenied,
        htmlTitle: text.match(/<title>([^<]+)<\/title>/i)?.[1] || null,
        rawPreview: text.slice(0, 300),
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, message: errorMsg });
    }
  });

  // Proxy endpoint to communicate with Google Apps Script Web App
  app.post('/api/gas-proxy', async (req: Request, res: Response) => {
    const { scriptUrl, method = 'POST', payload, queryParams } = req.body;

    if (!scriptUrl) {
      res.status(400).json({ success: false, message: 'scriptUrl is required' });
      return;
    }

    try {
      let targetUrl = scriptUrl;
      if (queryParams && typeof queryParams === 'object') {
        const urlObj = new URL(scriptUrl);
        Object.entries(queryParams).forEach(([key, val]) => {
          if (val !== undefined && val !== null) {
            urlObj.searchParams.set(key, String(val));
          }
        });
        targetUrl = urlObj.toString();
      }

      const fetchOptions: RequestInit = {
        method: method.toUpperCase(),
        headers: {
          'Accept': 'application/json, text/plain, */*',
        },
        redirect: 'follow',
      };

      if (method.toUpperCase() === 'POST' && payload) {
        fetchOptions.headers = {
          ...fetchOptions.headers,
          'Content-Type': 'application/json',
        };
        fetchOptions.body = JSON.stringify(payload);
      }

      const response = await fetch(targetUrl, fetchOptions);
      const text = await response.text();

      let data: unknown = text;
      try {
        data = JSON.parse(text);
      } catch {
        // keep text
      }

      res.status(response.status).json({
        ok: response.ok,
        status: response.status,
        data,
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, message: errorMsg });
    }
  });

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
