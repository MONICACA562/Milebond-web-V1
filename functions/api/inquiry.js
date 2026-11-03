/**
 * Pages Function: POST /api/inquiry
 *
 * Sends three things on every valid quote submission:
 *   1. internal notification email (info@milebond.com by default)
 *   2. branded auto-reply to the buyer
 *   3. optional Feishu/Lark group alert (env.FEISHU_WEBHOOK)
 *
 * Pages project env vars (Dashboard → Settings → Variables and Secrets):
 *   RESEND_API_KEY  required to send mail; without it this returns 503 and the
 *                   browser falls back to FormSubmit.
 *   INQUIRY_TO      optional, comma separated. Default: info@milebond.com
 *   INQUIRY_FROM    optional. Default: Milebond <quotes@milebond.com>
 *   FEISHU_WEBHOOK  optional. Full webhook URL.
 */

const WHATSAPP = 'https://wa.me/8615057960102';

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);
  if (!isSameSite(request)) return json({ ok: false, error: 'forbidden_origin' }, 403);

  let data;
  try {
    data = await request.formData();
  } catch (e) {
    return json({ ok: false, error: 'invalid_body' }, 400);
  }

  if (clean(data.get('_honey'))) return json({ ok: true, skipped: true }, 200);

  const f = {
    email: clean(data.get('email')),
    name: clean(data.get('name')),
    contact: clean(data.get('contact')),
    company: clean(data.get('company')),
    product: clean(data.get('product')),
    qty: clean(data.get('qty')),
    category: clean(data.get('category')),
    service: clean(data.get('service')),
    timeline: clean(data.get('timeline')),
    channel: clean(data.get('channel')),
    supplier: clean(data.get('supplier')),
    price: clean(data.get('price')) + (clean(data.get('currency')) ? ' ' + clean(data.get('currency')) : ''),
    sku: clean(data.get('sku')),
    message: clean(data.get('message')),
    source: clean(data.get('source_page')) || clean(data.get('page_url')),
    utm: clean(data.get('utm'))
  };

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email) || !f.product) {
    return json({ ok: false, error: 'invalid_fields' }, 400);
  }

  if (!env.RESEND_API_KEY) return json({ ok: false, error: 'email_not_configured' }, 503);

  const attachments = await collectAttachments(data);

  try {
    await sendEmail(env, {
      from: env.INQUIRY_FROM || 'Milebond <quotes@milebond.com>',
      to: splitList(env.INQUIRY_TO || 'info@milebond.com'),
      reply_to: f.email,
      subject: 'New inquiry · ' + (f.product || 'Sourcing request') + ' · ' + f.email,
      html: notificationHtml(f),
      text: notificationText(f),
      attachments
    });
  } catch (err) {
    /* Delivery failed: let the browser fall back to FormSubmit so the lead survives. */
    return json({ ok: false, error: 'send_failed', detail: String((err && err.message) || err) }, 502);
  }

  try {
    await sendEmail(env, {
      from: env.INQUIRY_FROM || 'Milebond <quotes@milebond.com>',
      to: [f.email],
      reply_to: 'info@milebond.com',
      subject: 'We got your sourcing request — reply within 24 hours',
      html: autoReplyHtml(f),
      text: autoReplyText(f)
    });
  } catch (e) { /* best effort: the lead is already captured */ }

  if (env.FEISHU_WEBHOOK) {
    try { await notifyFeishu(env.FEISHU_WEBHOOK, f); } catch (e) { /* noop */ }
  }

  return json({ ok: true }, 200);
}

function isSameSite(request) {
  const origin = request.headers.get('Origin') || '';
  const referer = request.headers.get('Referer') || '';
  const ok = (v) => /^https:\/\/(www\.)?milebond\.com$/i.test(v) ||
    /^https:\/\/[a-z0-9-]+\.milebond-web-v1\.pages\.dev$/i.test(v) ||
    /^http:\/\/localhost(:\d+)?$/i.test(v) ||
    /^http:\/\/127\.0\.0\.1(:\d+)?$/i.test(v);
  if (origin) return ok(origin);
  return /^https:\/\/(www\.)?milebond\.com(\/|$)/i.test(referer) || /^http:\/\/(localhost|127\.0\.0\.1)/i.test(referer);
}

function clean(v) {
  if (v === null || v === undefined) return '';
  return String(v).replace(/\s+/g, ' ').trim().slice(0, 4000);
}

function splitList(v) {
  return String(v).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
}

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function collectAttachments(data) {
  const out = [];
  for (const [key, value] of data.entries()) {
    if (key !== 'attachment') continue;
    if (!value || typeof value === 'string') continue;
    if (!value.size || value.size > 10 * 1024 * 1024) continue;
    out.push({ filename: value.name || 'attachment', content: toBase64(await value.arrayBuffer()) });
  }
  return out;
}

function toBase64(buf) {
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function sendEmail(env, payload) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: 'Bearer ' + env.RESEND_API_KEY,
      'content-type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('resend ' + res.status + ': ' + (await res.text()).slice(0, 300));
  return res.json();
}

async function notifyFeishu(webhook, f) {
  const lines = [
    '新询盘 · ' + (f.product || '未填写产品'),
    '邮箱：' + f.email,
    f.qty ? '数量：' + f.qty : '',
    f.company ? '公司：' + f.company : '',
    f.contact ? '联系方式：' + f.contact : '',
    f.timeline ? '时间：' + f.timeline : '',
    f.message ? '需求：' + f.message.slice(0, 200) : '',
    '页面：' + (f.source || '')
  ].filter(Boolean);
  await fetch(webhook, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ msg_type: 'text', content: { text: lines.join('\n') } })
  });
}

function row(label, value) {
  if (!value) return '';
  return '<tr><td style="padding:8px 12px;border-bottom:1px solid #eceff3;color:#64748b;font-size:13px;width:150px;vertical-align:top">' +
    esc(label) + '</td><td style="padding:8px 12px;border-bottom:1px solid #eceff3;color:#0f2a4a;font-size:14px">' +
    esc(value) + '</td></tr>';
}

function notificationHtml(f) {
  return '' +
    '<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:640px;margin:0 auto;background:#fff">' +
    '<div style="background:#0f2a4a;padding:22px 24px">' +
    '<div style="color:#f59e0b;font-size:12px;letter-spacing:.16em;font-weight:700">NEW INQUIRY</div>' +
    '<div style="color:#fff;font-size:20px;font-weight:800;margin-top:6px">' + esc(f.product || 'Sourcing request') + '</div>' +
    '</div><table style="width:100%;border-collapse:collapse">' +
    row('Email', f.email) + row('WhatsApp / WeChat', f.contact) + row('Name', f.name) +
    row('Company', f.company) + row('Quantity', f.qty) + row('Category', f.category) +
    row('Service', f.service) + row('Timeline', f.timeline) + row('Sales channel', f.channel) +
    row('Current supplier', f.supplier) + row('Target price', f.price) + row('SKU', f.sku) +
    row('Requirements', f.message) + row('Source page', f.source) + row('UTM', f.utm) +
    '</table><div style="padding:18px 24px">' +
    '<a href="mailto:' + esc(f.email) + '" style="display:inline-block;background:#008138;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:11px 20px;border-radius:8px">Reply to buyer</a>' +
    '<span style="color:#94a3b8;font-size:12px;margin-left:12px">Target: first reply within 24h (avg 6h)</span>' +
    '</div></div>';
}

function notificationText(f) {
  return [
    'NEW INQUIRY',
    'Product: ' + (f.product || ''),
    'Email: ' + f.email,
    'WhatsApp/WeChat: ' + (f.contact || '-'),
    'Name: ' + (f.name || '-'),
    'Company: ' + (f.company || '-'),
    'Quantity: ' + (f.qty || '-'),
    'Service: ' + (f.service || '-'),
    'Timeline: ' + (f.timeline || '-'),
    'Target price: ' + (f.price || '-'),
    'SKU: ' + (f.sku || '-'),
    'Requirements: ' + (f.message || '-'),
    'Source: ' + (f.source || '-'),
    'UTM: ' + (f.utm || '-')
  ].join('\n');
}

function autoReplyHtml(f) {
  const greeting = f.name ? 'Hi ' + esc(f.name.split(' ')[0]) + ',' : 'Hi there,';
  return '' +
    '<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;color:#1f2937;line-height:1.65">' +
    '<div style="background:#0f2a4a;padding:22px 24px;border-radius:12px 12px 0 0">' +
    '<div style="color:#fff;font-size:18px;font-weight:800">Milebond</div>' +
    '<div style="color:#b8c7db;font-size:13px;margin-top:2px">Low-MOQ sourcing · Yiwu, China</div>' +
    '</div><div style="border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px;padding:24px">' +
    '<p style="margin:0 0 14px">' + greeting + '</p>' +
    '<p style="margin:0 0 14px">Thanks — we received your request for <strong>' + esc(f.product) + '</strong>' +
    (f.qty ? ' (<strong>' + esc(f.qty) + '</strong>)' : '') + '.</p>' +
    '<p style="margin:0 0 10px;font-weight:700;color:#0f2a4a">What happens next</p>' +
    '<ol style="margin:0 0 16px;padding-left:20px">' +
    '<li>We check 2–3 vetted factories that match your spec and MOQ.</li>' +
    '<li>You get a cost breakdown (part, packaging, labour, freight) within 24 hours — usually 6.</li>' +
    '<li>If the numbers work, we send samples before any bulk order.</li>' +
    '</ol>' +
    '<p style="margin:0 0 16px">Have a spec sheet, drawing or reference link? Just reply to this email and it goes straight to the person handling your request.</p>' +
    '<p style="margin:0 0 8px">Need it faster?</p>' +
    '<p style="margin:0 0 20px"><a href="' + WHATSAPP + '" style="display:inline-block;background:#25d366;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:11px 18px;border-radius:8px">Chat on WhatsApp</a></p>' +
    '<p style="margin:0 0 4px">— Monica Zhu</p>' +
    '<p style="margin:0;color:#6b7280;font-size:13px">Founder &amp; CEO, Milebond<br>' +
    'info@milebond.com · +86 150 5796 0102<br>Yiwu, Zhejiang, China</p>' +
    '</div>' +
    '<p style="color:#9ca3af;font-size:11px;text-align:center;margin-top:14px">You are receiving this because you submitted a quote request at milebond.com.</p>' +
    '</div>';
}

function autoReplyText(f) {
  return [
    (f.name ? 'Hi ' + f.name.split(' ')[0] + ',' : 'Hi there,'),
    '',
    'Thanks — we received your request for ' + f.product + (f.qty ? ' (' + f.qty + ')' : '') + '.',
    '',
    'What happens next:',
    '1. We check 2-3 vetted factories that match your spec and MOQ.',
    '2. You get a cost breakdown within 24 hours (usually 6).',
    '3. If the numbers work, we send samples before any bulk order.',
    '',
    'Have a spec sheet or drawing? Just reply to this email.',
    'Need it faster? WhatsApp: +86 150 5796 0102',
    '',
    '— Monica Zhu',
    'Founder & CEO, Milebond',
    'info@milebond.com'
  ].join('\n');
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}
