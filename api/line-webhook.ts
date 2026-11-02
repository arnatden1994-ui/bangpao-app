import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  maxDuration: 60,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Line-Signature');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'active',
      service: 'Bangpao Public Health LINE Webhook',
      time: new Date().toISOString(),
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      // keep raw
    }
  }

  const events = body?.events || [];
  if (!Array.isArray(events) || events.length === 0) {
    // LINE Developers Console "Verify" webhook check sends empty events
    return res.status(200).json({ ok: true, message: 'Webhook verified successfully' });
  }

  const lineToken =
    process.env.LINE_CHANNEL_ACCESS_TOKEN ||
    'wwggUYjz56cObGq7V7VhS1Yt6KvK1tsTqMjBiGcTev2laNR+un/w80ePcJqQguYc2D5EfKLPeGuTAqTXG3/HVrRpdI2H5sLbnDm02NTQtX+slSxnfiberfN8dUkQVLGmHiAYeINw/xpB7io7fxtWmQdB04t89/1O/w1cDnyilFU=';

  for (const event of events) {
    try {
      const { replyToken, source } = event;
      const groupId = source?.groupId;
      const userId = source?.userId;

      // 1. If event is from a GROUP: Auto-save real Group ID to Firestore!
      if (groupId) {
        try {
          const firestoreUrl =
            'https://firestore.googleapis.com/v1/projects/bangpao-public-health/databases/(default)/documents/system_settings/notifications?updateMask.fieldPaths=lineTargetId';
          await fetch(firestoreUrl, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fields: {
                lineTargetId: { stringValue: groupId },
              },
            }),
          });
        } catch (dbErr) {
          console.error('Failed to auto-update Firestore with groupId:', dbErr);
        }

        // Reply confirmation to group
        if (replyToken && lineToken) {
          await fetch('https://api.line.me/v2/bot/message/reply', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${lineToken}`,
            },
            body: JSON.stringify({
              replyToken,
              messages: [
                {
                  type: 'text',
                  text: `🔔 กองสาธารณสุขและสิ่งแวดล้อม ทต.บางเป้า\n------------------------------------\nเชื่อมต่อบอท Sasuk Notify เข้ากลุ่มนี้เรียบร้อยแล้ว!\n\n📋 Group ID: ${groupId}\n✅ บันทึกเข้าสู่ระบบหน้าเว็บให้อัตโนมัติแล้วครับ ทุกการแจ้งเตือนงานจะส่งเข้ากลุ่มนี้ทันที`,
                },
              ],
            }),
          });
        }
      } else if (userId && replyToken && lineToken) {
        // 2. Direct message 1-on-1 from user
        await fetch('https://api.line.me/v2/bot/message/reply', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${lineToken}`,
          },
          body: JSON.stringify({
            replyToken,
            messages: [
              {
                type: 'text',
                text: `สวัสดีครับคุณเจ้าหน้าที่! 👋\nUser ID ของท่านคือ:\n${userId}\n\n💡 หากต้องการแจ้งเตือนส่วนตัว สามารถนำ User ID ด้านบนไปวางในช่อง Group ID / User ID ในหน้าตั้งค่าได้ครับ\n\n👥 หากต้องการแจ้งเตือนเข้ากลุ่ม ให้ดึงบอทนี้เข้ากลุ่มไลน์ แล้วพิมพ์ข้อความใดๆ 1 ครั้ง ระบบจะดึง Group ID ให้อัตโนมัติครับ`,
              },
            ],
          }),
        });
      }
    } catch (eventErr) {
      console.error('Error processing LINE event:', eventErr);
    }
  }

  return res.status(200).json({ ok: true, processedCount: events.length });
}
