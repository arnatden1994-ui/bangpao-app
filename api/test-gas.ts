import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  maxDuration: 30,
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

  const { url } = body || {};
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

    const isPermissionDenied =
      text.includes('accounts.google.com') ||
      text.includes('Sign in to continue') ||
      text.includes('warning-bar-table') ||
      response.status === 403;

    res.status(200).json({
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
}
