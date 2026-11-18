/**
 * POST /api/contact -- Cloudflare Pages Function.
 * Bridges RoofQuote Relay's business inquiry form to a configured Formspree
 * inbox. Before FORM_ENDPOINT is configured, returns 503 with an email link;
 * never claims delivery when no backend is connected.
 *
 * Cloudflare Pages settings: FORM_ENDPOINT = https://formspree.io/f/<FORM_ID>
 * Create and verify the Formspree form with roofquoterelay@outlook.com.
 */

const ALLOWED_SOURCES = new Set([
  'Website forms', 'Phone and website forms', 'Google and local listings',
  'Multiple inboxes or sources', 'Not sure'
]);
const ALLOWED_TIMES = new Set(['', 'Morning (Arizona time)', 'Midday (Arizona time)', 'Afternoon (Arizona time)', 'Email first']);
const EMAIL = 'roofquoterelay@outlook.com';

function pageResponse(message, status) {
  const safe = message === 'busy' ?
    'We could not accept your request right now. Please try again, or email us directly.' :
    'Our online request form is temporarily unavailable. Please email us directly.';
  return new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Contact RoofQuote Relay</title><style>body{background:#f5f4ee;color:#172c25;font:17px system-ui;max-width:630px;margin:12vh auto;padding:24px;line-height:1.6}a{color:#205e4c}</style><h1>Contact RoofQuote Relay</h1><p>${safe}</p><p><a href="mailto:${EMAIL}">${EMAIL}</a></p><p><a href="/#contact">Return to contact form</a></p></html>`, {
    status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control':'no-store', 'x-content-type-options': 'nosniff' }
  });
}
const field=(data,key,n)=>String(data.get(key)||'').trim().slice(0,n);
const validEmail=email=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length<=254;

export async function onRequestPost({ request, env }) {
  const site = new URL(request.url);
  const origin = request.headers.get('Origin');
  if (origin) {
    try { if (new URL(origin).origin !== site.origin) return new Response('Forbidden', {status:403}); }
    catch { return new Response('Forbidden', {status:403}); }
  }
  const contentType = request.headers.get('content-type') || '';
  if (!(contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data'))) {
    return new Response('Unsupported form submission', {status:415});
  }
  const length = Number(request.headers.get('content-length')||0);
  if (length>12_000) return new Response('Request too large', {status:413});
  let data;
  try { data = await request.formData(); } catch { return new Response('Invalid form', {status:400}); }
  if (field(data, 'bot-field', 100)) {
    // Quietly discard obvious bot submissions while preserving the normal browser redirect.
    // This log contains no submitted form values.
    console.info('RoofQuote Relay contact: honeypot submission ignored');
    return Response.redirect(new URL('/thank-you', request.url), 303);
  }
  const name=field(data,'name',90), business=field(data,'business',120);
  const email=field(data,'email',254), source=field(data,'lead_source',60);
  const phone=field(data,'phone',35), callback=field(data,'callback_time',40);
  const problem=field(data,'problem',500);
  if (!name || !business || !validEmail(email) || !ALLOWED_SOURCES.has(source) || !ALLOWED_TIMES.has(callback)) {
    return new Response('Please return to the form and complete the required fields.', {status:400});
  }
  const endpoint=String(env.FORM_ENDPOINT||'').trim();
  if (!/^https:\/\/formspree\.io\/f\/[a-zA-Z0-9]+$/.test(endpoint)) {
    return pageResponse('unavailable',503);
  }
  const outbound=new FormData();
  for (const [key,value] of Object.entries({name,business,email,phone,callback_time:callback,lead_source:source,problem,
    _subject:'New RoofQuote Relay demo request'})) outbound.append(key,value);
  try {
    // Formspree's domain restriction uses Referer. This is a server-to-server
    // request, so preserve the verified originating website's origin rather
    // than sending an upstream request with no source-site context.
    const upstreamHeaders = new Headers({
      Accept: 'application/json',
      Referer: site.origin + '/',
      Origin: site.origin
    });
    const browserAgent = request.headers.get('user-agent');
    if (browserAgent) upstreamHeaders.set('User-Agent', browserAgent.slice(0, 500));
    const response=await fetch(endpoint,{method:'POST',headers:upstreamHeaders,body:outbound,redirect:'manual'});
    if (!response.ok) { console.warn('RoofQuote Relay form upstream HTTP status:', response.status); return pageResponse('busy',502); }
    // Report successful upstream acceptance without logging any personal data.
    console.info('RoofQuote Relay contact: Formspree accepted submission, HTTP status:', response.status);
    return Response.redirect(new URL('/thank-you', request.url),303);
  } catch (error) { console.warn('RoofQuote Relay form transport error:', error?.name || 'unknown'); return pageResponse('busy',502);}
}

export async function onRequestGet() {
  return new Response('Method not allowed', {status:405,headers:{Allow:'POST'}});
}
