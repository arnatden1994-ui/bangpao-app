import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  maxDuration: 60,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
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
      // keep raw
    }
  }

  const { gasUrl, settings = {}, payload = {} } = body || {};

  let sentLine = false;
  let sentEmail = false;
  let forwardedToGas = false;
  const messages: string[] = [];

  // 1. Direct LINE Messaging API push (if Channel Access Token & Target ID are configured)
  const lineToken = settings.lineChannelAccessToken || process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
  const lineTarget = settings.lineTargetId || process.env.LINE_TARGET_ID || '';

  if (settings.lineEnabled !== false && lineToken && lineTarget) {
    try {
      const lineMessages = payload.lineFlexContents
        ? [
            {
              type: 'flex',
              altText: (payload.lineTextFallback || payload.title || 'แจ้งเตือนกองสาธารณสุข ทต.บางเป้า').slice(0, 390),
              contents: payload.lineFlexContents,
            },
          ]
        : [
            {
              type: 'text',
              text: payload.lineTextFallback || payload.title || 'แจ้งเตือนกองสาธารณสุข ทต.บางเป้า',
            },
          ];

      const lineResp = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${lineToken}`,
        },
        body: JSON.stringify({
          to: lineTarget,
          messages: lineMessages,
        }),
      });

      if (lineResp.ok) {
        sentLine = true;
        messages.push('ส่งเข้า LINE กลุ่มสำเร็จ');
      } else {
        const errTxt = await lineResp.text();
        messages.push(`LINE API (${lineResp.status}): ${errTxt.slice(0, 120)}`);
      }
    } catch (err: any) {
      messages.push(`LINE Error: ${err?.message || String(err)}`);
    }
  }

  // 2. Custom Webhook URL (Make / n8n / Discord / Custom Bot)
  if (settings.lineEnabled !== false && settings.lineWebhookUrl) {
    try {
      const whResp = await fetch(settings.lineWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings, payload }),
      });
      if (whResp.ok) {
        sentLine = true;
        messages.push('ส่งผ่าน Webhook สำเร็จ');
      }
    } catch {
      // ignore webhook error
    }
  }

  // 3. Forward to Google Apps Script (for Official Email + A4 PDF & Word .docx Form Attachments + LINE backup)
  const targetGasUrl = gasUrl || process.env.GAS_WEBAPP_URL || '';
  if (targetGasUrl && targetGasUrl.startsWith('https://script.google.com/')) {
    try {
      // Strip lineChannelAccessToken if we already sent LINE directly so GAS doesn't send duplicate LINE message
      const gasSettings = sentLine ? { ...settings, lineEnabled: false } : settings;
      const gasResp = await fetch(targetGasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        redirect: 'follow',
        body: JSON.stringify({
          action: 'sendNotification',
          settings: gasSettings,
          payload,
        }),
      });

      if (gasResp.ok) {
        forwardedToGas = true;
        sentEmail = settings.emailEnabled !== false;
        try {
          const gasJson = await gasResp.json();
          if (gasJson.sentLine) sentLine = true;
          if (gasJson.sentEmail) sentEmail = true;
        } catch {
          // ignore non-json
        }
        messages.push(
          `ส่งอีเมลพร้อมแนบไฟล์แบบฟอร์มราชการ A4 (${(payload.attachments || []).length} ฉบับ) ผ่าน Google Apps Script สำเร็จ`
        );
      }
    } catch (err: any) {
      messages.push(`GAS Error: ${err?.message || String(err)}`);
    }
  }

  res.status(200).json({
    ok: true,
    sentLine,
    sentEmail,
    forwardedToGas,
    message:
      messages.join(' | ') ||
      'สร้างไฟล์แบบฟอร์มราชการ A4 (.PDF และ .DOCX) พร้อมบันทึกประวัติแจ้งเตือนเรียบร้อยแล้ว',
  });
}
