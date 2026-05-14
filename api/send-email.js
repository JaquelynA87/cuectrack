import { Resend } from 'resend';

async function parseJsonBody(req) {
  if (req.body != null && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      success: false,
      error: 'Server misconfiguration: RESEND_API_KEY is not set',
    });
  }

  const body = await parseJsonBody(req);
  if (body === null) {
    return res.status(400).json({ success: false, error: 'Invalid JSON body' });
  }

  const { to, subject, html } = body;
  if (to == null || subject == null || html == null) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: to, subject, and html are required',
    });
  }

  const from =
    process.env.RESEND_FROM || 'onboarding@resend.dev';

  const toList = Array.isArray(to) ? to : [to];
  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to: toList,
    subject: String(subject),
    html: String(html),
  });

  if (error) {
    return res.status(502).json({
      success: false,
      error: error.message || 'Resend API error',
    });
  }

  return res.status(200).json({ success: true, id: data?.id ?? null });
}
