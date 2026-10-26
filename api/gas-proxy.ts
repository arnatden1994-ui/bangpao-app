import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  maxDuration: 60,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      // keep as is
    }
  }

  const { scriptUrl, method = 'POST', payload, queryParams } = body || {};

  if (!scriptUrl) {
    res.status(400).json({ ok: false, success: false, message: 'scriptUrl is required' });
    return;
  }

  try {
    let targetUrl = scriptUrl;
    if (queryParams && typeof queryParams === 'object') {
      try {
        const urlObj = new URL(scriptUrl);
        Object.entries(queryParams).forEach(([key, val]) => {
          if (val !== undefined && val !== null) {
            urlObj.searchParams.set(key, String(val));
          }
        });
        targetUrl = urlObj.toString();
      } catch {
        const q = new URLSearchParams(queryParams as Record<string, string>).toString();
        targetUrl += (targetUrl.includes('?') ? '&' : '?') + q;
      }
    }

    const fetchOptions: RequestInit = {
      method: String(method).toUpperCase(),
      headers: {
        'Accept': 'application/json, text/plain, */*',
      },
      redirect: 'follow',
    };

    if (String(method).toUpperCase() === 'POST' && payload) {
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
      // keep raw text
    }

    res.status(response.status).json({
      ok: response.ok,
      status: response.status,
      data,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, success: false, message: errorMsg });
  }
}
