// RoofQuote Relay Platform v1 — backend primitives. No external runtime packages.
export const SERVICES = Object.freeze(['Roof inspection','Leak assessment','Repair','Replacement','Storm damage','Other']);
export const STATUSES = Object.freeze(['New','Contacted','Booked','Closed - Won','Closed - Lost','Do not contact']);
export const EPOCH_DAY = 86400000;
const encoder = new TextEncoder();
export const now = () => Date.now();
export const uid = () => crypto.randomUUID();
export const normEmail = v => String(v || '').trim().toLowerCase().slice(0,254);
export const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v)) && String(v).length <= 254;
export const trim = (v, n=200) => String(v ?? '').trim().slice(0,n);
export const validSlug = s => /^[a-z0-9](?:[a-z0-9-]{1,42}[a-z0-9])$/.test(s) && !s.includes('--');
export const escapeHtml = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function csvCell(value) {
  let s = String(value ?? '');
  if (/^[\s]*[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g,'""') + '"';
}
export function json(data, status=200, extra={}) {
  return new Response(JSON.stringify(data), { status, headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...extra} });
}
export function fail(code, status=400) { return json({ok:false,error:code},status); }
export function safeHeaders(response, html=false) {
  const h = new Headers(response.headers);
  h.set('X-Content-Type-Options','nosniff');
  h.set('X-Frame-Options','DENY');
  h.set('Referrer-Policy','no-referrer');
  h.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  h.set('Cross-Origin-Resource-Policy','same-origin');
  if (html) h.set('Content-Security-Policy',
    "default-src 'self'; script-src 'self' https://challenges.cloudflare.com; " +
    "style-src 'self' 'unsafe-inline'; connect-src 'self' https://challenges.cloudflare.com; " +
    "frame-src https://challenges.cloudflare.com; img-src 'self' data:; " +
    "object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers:h});
}
export function requireConfig(env, names) {for(const name of names){if(!env?.[name] || String(env[name]).startsWith('REPLACE_')) throw Error('Missing configuration: '+name);}}
export async function hmac(secret, text) {
  const k=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const raw=await crypto.subtle.sign('HMAC',k,encoder.encode(String(text)));
  return Array.from(new Uint8Array(raw),v=>v.toString(16).padStart(2,'0')).join('');
}
export function randomToken(){const b=crypto.getRandomValues(new Uint8Array(32));return Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');}
export function sessionCookie(token) {return `__Host-rqr_session=${token}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=604800`;}
export const clearCookie = '__Host-rqr_session=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0';
export function cookieValue(req){const s=req.headers.get('cookie')||'';const m=s.match(/(?:^|;\s*)__Host-rqr_session=([a-f0-9]{64})(?=;|$)/);return m?.[1]||null;}
export function checkOrigin(req){
  const origin=req.headers.get('origin');
  if(origin) {try{return new URL(origin).origin===new URL(req.url).origin;}catch{return false;}}
  return ['same-origin','none'].includes(req.headers.get('sec-fetch-site'));
}
export async function readJson(req,max=16000){
  if(!req.headers.get('content-type')?.toLowerCase().includes('application/json'))throw Error('Expected JSON');
  if(Number(req.headers.get('content-length')||0)>max)throw Error('Request too large');
  const txt=await req.text();if(txt.length>max)throw Error('Request too large');
  const x=JSON.parse(txt);if(!x || typeof x!=='object' || Array.isArray(x))throw Error('Invalid JSON');return x;
}
export async function getUser(req,env){
  const token=cookieValue(req);if(!token)return null;
  const hash=await hmac(env.SESSION_SECRET,'session|'+token);
  const row=await env.DB.prepare('SELECT email,expires_at FROM sessions WHERE hash = ? AND expires_at > ?').bind(hash,now()).first();
  if(!row)return null;
  const email=normEmail(row.email);
  return {email,operator:email===normEmail(env.OPERATOR_EMAIL)};
}
export async function roleFor(env,user,orgId){
  if(!user)return null;
  if(user.operator)return 'operator';
  const r=await env.DB.prepare('SELECT role FROM memberships WHERE org_id=? AND email=?').bind(orgId,user.email).first();
  return r?.role||null;
}
export function canManage(role){return role==='owner'||role==='operator';}
export async function rateLimit(env,key,max,windowMs){
  const t=now(), bucket=Math.floor(t/windowMs)*windowMs;
  const hash=await hmac(env.SESSION_SECRET,`ratelimit|${key}|${bucket}`);
  await env.DB.prepare('INSERT INTO rate_windows(key,window_start,count) VALUES(?,?,1) ON CONFLICT(key) DO UPDATE SET count=count+1').bind(hash,bucket).run();
  const row=await env.DB.prepare('SELECT count FROM rate_windows WHERE key=?').bind(hash).first();
  return Number(row?.count||999)>max;
}
export async function audit(env,orgId,leadId,actor,action,detail='') {
  await env.DB.prepare('INSERT INTO events(id,org_id,lead_id,actor,action,detail,created_at) VALUES(?,?,?,?,?,?,?)').bind(uid(),orgId,leadId||null,trim(actor,254),trim(action,60),trim(detail,120),now()).run();
}
export function validUrl(v){try{const u=new URL(String(v));return u.protocol==='https:'&&u.hostname.includes('.');}catch{return false;}}
export function displayTitle(kind){return {ack:'Customer acknowledgment',alert:'Owner alert',reminder1:'Reminder one',reminder2:'Reminder two',weekly:'Weekly report'}[kind]||kind;}
export function buildAck(org,lead){
  const first=(lead.name||'there').split(/\s+/)[0].slice(0,60);
  return {subject:'We received your roofing request | '+org.name,body:[
    `Hi ${first},`,
    `Thanks for reaching out to ${org.name}! We've received your roofing request.`,
    'Our team will review the details and get in touch to discuss the next step.',
    `If you have an urgent leak or safety concern, please call ${org.phone} directly.`,
    'Need to add information or withdraw your request? Reply to this email.',
    org.name,
    `Reference: ${lead.id}`
  ].join('\n\n')};
}
export function buildAlert(org,lead,appOrigin){return {
  subject:`New roofing inquiry | ${lead.service}`,
  body:[`New roofing inquiry for ${org.name}`,`Service: ${lead.service}`,`Name: ${lead.name}`,`Email: ${lead.email}`,`Phone: ${lead.phone||'Not provided'}`,`ZIP: ${lead.zip}`,`Details: ${lead.notes||'Not provided'}`,`Open the private dashboard: ${appOrigin}/app`,`Staff should make contact and update the lead status. This email does not book an appointment.`].join('\n')
};}
export function buildReminder(org,lead,n,appOrigin){return {subject:`Follow-up needed (${n}/2) | ${lead.service}`,body:[
  `A request at ${org.name} is still marked New.`,
  `Customer: ${lead.name}`,`Email: ${lead.email}`,`Phone: ${lead.phone||'Not provided'}`,`Service: ${lead.service}`,`ZIP: ${lead.zip}`,`Lead ID: ${lead.id}`,`Tracker: ${appOrigin}/app`,
  'Please contact the customer and update Staff status. This reminder goes to your team only.'
].join('\n')};}
export async function queueMail(env, org, lead, kind, recipient, subject,body, replyTo=''){
  const id=kind==='weekly'?`${org.id}-${kind}-${lead.id}`: `${lead.id}-${kind}`;
  await env.DB.prepare("INSERT OR IGNORE INTO outbox(id,org_id,lead_id,kind,recipient,subject,body,reply_to,state,created_at) VALUES(?,?,?,?,?,?,?,?, 'QUEUED',?)").bind(id,org.id,kind==='weekly'?null:lead.id,kind,recipient,subject,body,replyTo,now()).run();
  return id;
}
export async function sendEmail(env,{id,to,subject,body,replyTo=''}){
  requireConfig(env,['RESEND_API_KEY','MAIL_FROM']);
  const payload={from:env.MAIL_FROM,to:[to],subject,text:body};if(replyTo&&isEmail(replyTo))payload.reply_to=replyTo;
  let response;
  try {response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':id.slice(0,256)},body:JSON.stringify(payload)});}
  catch(err){return {state:'UNKNOWN_REVIEW',error:'NETWORK_UNKNOWN'};}
  if(!response.ok)return {state:'FAILED_REVIEW',error:'HTTP_'+response.status};
  try {const v=await response.json();return {state:'SENT',providerId:String(v.id||'')};}
  catch {return {state:'UNKNOWN_REVIEW',error:'RESPONSE_UNKNOWN'};}
}
export async function drainOutbox(env,limit=20){
  const entries=(await env.DB.prepare("SELECT * FROM outbox WHERE state='QUEUED' ORDER BY created_at LIMIT ?").bind(limit).all()).results||[];
  let sent=0,failures=0;
  for(const entry of entries){
    const org=await env.DB.prepare('SELECT state FROM organizations WHERE id=?').bind(entry.org_id).first();
    if(org?.state!=='active' && !['login'].includes(entry.kind))continue;
    if(entry.kind==='ack' && entry.lead_id){
      const lead=await env.DB.prepare('SELECT created_at,status,email_hash FROM leads WHERE org_id=? AND id=?').bind(entry.org_id,entry.lead_id).first();
      const suppressed=lead && await env.DB.prepare('SELECT 1 FROM suppressions WHERE org_id=? AND email_hash=?').bind(entry.org_id,lead.email_hash).first();
      // Never send a stale acknowledgment, or send after a recipient opts out.
      if(!lead || now()-lead.created_at > 12*3600000 || suppressed){
        await env.DB.prepare("UPDATE outbox SET state='FAILED_REVIEW',failure_code=? WHERE id=? AND state='QUEUED'").bind(suppressed?'SUPPRESSED':'STALE_OR_MISSING_LEAD',entry.id).run();
        await env.DB.prepare("UPDATE leads SET ack_state='FAILED_REVIEW' WHERE org_id=? AND id=?").bind(entry.org_id,entry.lead_id).run();
        continue;
      }
    }
    const claimed=await env.DB.prepare("UPDATE outbox SET state='CLAIMED',claimed_at=? WHERE id=? AND state='QUEUED'").bind(now(),entry.id).run();
    if((claimed.meta?.changes??0)!==1)continue;
    const result=await sendEmail(env,{id:entry.id,to:entry.recipient,subject:entry.subject,body:entry.body,replyTo:entry.reply_to});
    await env.DB.prepare('UPDATE outbox SET state=?,sent_at=?,provider_id=?,failure_code=? WHERE id=?').bind(result.state,result.state==='SENT'?now():null,result.providerId||null,result.error||null,entry.id).run();
    if(result.state==='SENT')sent++;else failures++;
    if(entry.lead_id && (entry.kind==='ack'||entry.kind==='alert')){
      await env.DB.prepare(`UPDATE leads SET ${entry.kind==='ack'?'ack_state':'alert_state'}=? WHERE id=? AND org_id=?`).bind(result.state,entry.lead_id,entry.org_id).run();
    }
    await audit(env,entry.org_id,entry.lead_id||null,'system',result.state==='SENT'?'EMAIL_ACCEPTED':'EMAIL_REVIEW',entry.kind);
  }
  return {sent,failures};
}
export async function receiveLead(env,org,fields,{demo=false,turnstile=null,requestIp=''}={}){
  const name=trim(fields.name,90), email=normEmail(fields.email), phone=trim(fields.phone,40);
  const zip=trim(fields.zip,12),service=trim(fields.service,50),notes=trim(fields.notes,600);
  const requestKey=trim(fields.requestKey,100);
  if(!name||!isEmail(email)||!/^\d{5}$/.test(zip)||!SERVICES.includes(service)||!/^[-_a-zA-Z0-9]{12,100}$/.test(requestKey))return {error:'invalid_fields',status:400};
  if(demo){if(email!==normEmail(org.owner_email))return {error:'demo_email_must_match_owner',status:400};}
  else{
    if(org.state!=='active')return {error:'intake_not_active',status:403};
    if(!env.TURNSTILE_SECRET || !env.TURNSTILE_SITE_KEY)return {error:'spam_protection_not_configured',status:503};
    if(!turnstile||turnstile.length>2048)return {error:'verify_required',status:400};
    let result;
    try {
      const body=new URLSearchParams({secret:env.TURNSTILE_SECRET,response:turnstile});
      const res=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body});
      result=await res.json();
    } catch{return {error:'verification_unavailable',status:503};}
    if(!result?.success || (result.hostname && result.hostname!==new URL(env.APP_ORIGIN).hostname))return {error:'verification_failed',status:400};
  }
  const eh=await hmac(env.SESSION_SECRET,'email|'+org.id+'|'+email), t=now();
  const suppressed=await env.DB.prepare('SELECT 1 FROM suppressions WHERE org_id=? AND email_hash=?').bind(org.id,eh).first();
  const lead={id:uid(),org_id:org.id,request_key:requestKey,created_at:t,name,email,email_hash:eh,phone,zip,service,notes,status:'New'};
  const existing=await env.DB.prepare('SELECT id FROM leads WHERE org_id=? AND request_key=?').bind(org.id,requestKey).first();
  if(existing)return {ok:true,id:existing.id,duplicate:true};
  const statements=[env.DB.prepare('INSERT INTO leads(id,org_id,request_key,created_at,name,email,email_hash,phone,zip,service,notes,status,updated_at,ack_state,alert_state) VALUES(?,?,?,?,?,?,?,?,?,?,?,\'New\',?,?,?)').bind(lead.id,org.id,requestKey,t,name,email,eh,phone,zip,service,notes,t,demo?'DEMO':(suppressed?'SUPPRESSED':'QUEUED'),demo?'DEMO':'QUEUED'),env.DB.prepare('INSERT INTO events(id,org_id,lead_id,actor,action,detail,created_at) VALUES(?,?,?,?,?,?,?)').bind(uid(),org.id,lead.id,'system',demo?'DEMO_CREATED':'LEAD_RECEIVED',demo?'Synthetic demonstration':'Public intake',t)];
  if(!demo){
    const alert=buildAlert(org,lead,env.APP_ORIGIN);const ack=buildAck(org,lead);
    const mailRows=[['alert',org.owner_email,alert.subject,alert.body,''],...(suppressed?[]:[['ack',email,ack.subject,ack.body,org.owner_email]])];
    for(const [kind,recipient,subject,body,replyTo] of mailRows)statements.push(env.DB.prepare('INSERT INTO outbox(id,org_id,lead_id,kind,recipient,subject,body,reply_to,state,created_at) VALUES(?,?,?,?,?,?,?,?,\'QUEUED\',?)').bind(`${lead.id}-${kind}`,org.id,lead.id,kind,recipient,subject,body,replyTo,t));
  }
  try{await env.DB.batch(statements);}catch(e){
    const duplicate=await env.DB.prepare('SELECT id FROM leads WHERE org_id=? AND request_key=?').bind(org.id,requestKey).first();
    if(duplicate)return {ok:true,id:duplicate.id,duplicate:true};
    throw e;
  }
  return {ok:true,id:lead.id,duplicate:false,suppressed:!!suppressed};
}
export async function orgStats(env,orgId){
  const rows=(await env.DB.prepare('SELECT status,COUNT(*) n FROM leads WHERE org_id=? GROUP BY status').bind(orgId).all()).results||[];
  const counts=Object.fromEntries(STATUSES.map(s=>[s,0]));for(const r of rows)counts[r.status]=Number(r.n);
  const last7=await env.DB.prepare('SELECT COUNT(*) n FROM leads WHERE org_id=? AND created_at>=?').bind(orgId,now()-7*EPOCH_DAY).first();
  const errors=await env.DB.prepare("SELECT COUNT(*) n FROM outbox WHERE org_id=? AND state IN('FAILED_REVIEW','UNKNOWN_REVIEW','CLAIMED')").bind(orgId).first();
  const overdue=await env.DB.prepare("SELECT COUNT(*) n FROM leads WHERE org_id=? AND status='New' AND created_at<=?").bind(orgId,now()-45*60000).first();
  return {total:Object.values(counts).reduce((a,b)=>a+b,0),last7:Number(last7?.n||0),counts,needsReview:Number(errors?.n||0),overdue:Number(overdue?.n||0)};
}
export async function scheduleReminders(env){
  const cutoff=now()-7*EPOCH_DAY;
  const leads=(await env.DB.prepare("SELECT l.*,o.name org_name,o.owner_email,o.phone,o.state,o.reminder_first_min,o.reminder_repeat_min FROM leads l JOIN organizations o ON l.org_id=o.id WHERE o.state='active' AND l.status='New' AND l.created_at>=? AND l.reminder_count<2 ORDER BY l.created_at LIMIT 100").bind(cutoff).all()).results||[];
  let queued=0;
  for(const l of leads){
    const threshold=l.reminder_count===0?l.created_at+l.reminder_first_min*60000:(l.reminder_last_at||0)+l.reminder_repeat_min*60000;
    if(now()<threshold)continue;
    const num=l.reminder_count+1,kind='reminder'+num;
    // Conditional update protects against racing status changes or scheduler runs.
    const res=await env.DB.prepare("UPDATE leads SET reminder_count=?,reminder_last_at=? WHERE id=? AND org_id=? AND status='New' AND reminder_count=?").bind(num,now(),l.id,l.org_id,l.reminder_count).run();
    if((res.meta?.changes||0)!==1)continue;
    const body=buildReminder({name:l.org_name},l,num,env.APP_ORIGIN);
    try{await env.DB.prepare("INSERT OR IGNORE INTO outbox(id,org_id,lead_id,kind,recipient,subject,body,reply_to,state,created_at) VALUES(?,?,?,?,?,?,?,?, 'QUEUED',?)").bind(`${l.id}-${kind}`,l.org_id,l.id,kind,l.owner_email,body.subject,body.body,'',now()).run();queued++;}
    catch{await audit(env,l.org_id,l.id,'system','REMINDER_QUEUE_ERROR',kind);}
  }
  return queued;
}
export async function scheduleWeekly(env){
  const orgs=(await env.DB.prepare("SELECT * FROM organizations WHERE state='active' LIMIT 200").all()).results||[];
  const dt=new Date(),week=dt.toISOString().slice(0,10);let queued=0;
  for(const org of orgs){
    const weeklyId=`weekly-${week}`;
    const exist=await env.DB.prepare('SELECT id FROM outbox WHERE id=?').bind(`${org.id}-weekly-${weeklyId}`).first();if(exist)continue;
    const stats=await orgStats(env,org.id);
    const body=['RoofQuote Relay — weekly operations summary',`Company: ${org.name}`,
      `Recorded inquiries in the last 7 days: ${stats.last7}`,
      ...STATUSES.map(x=>`${x}: ${stats.counts[x]}`),
      `Leads overdue now: ${stats.overdue}`,
      `Email actions needing review: ${stats.needsReview}`,
      `Open your private lead desk: ${env.APP_ORIGIN}/app`,
      'Statuses are staff-recorded. No sales outcome or revenue is implied.'].join('\n');
    await queueMail(env,org,{id:weeklyId},'weekly',org.owner_email,'RoofQuote Relay | Weekly inquiry report',body);
    queued++;
  }
  return queued;
}
export async function runCron(env,cron){
  requireConfig(env,['DB','SESSION_SECRET','APP_ORIGIN']);
  if(cron==='*/15 * * * *'){await scheduleReminders(env);return drainOutbox(env,35);}
  if(cron==='0 16 * * MON'){await scheduleWeekly(env);return drainOutbox(env,80);}
  if(cron==='0 17 * * *'){
    await env.DB.prepare('DELETE FROM rate_windows WHERE window_start<?').bind(now()-2*EPOCH_DAY).run();
    await env.DB.prepare('DELETE FROM login_tokens WHERE expires_at<?').bind(now()-EPOCH_DAY).run();
    await env.DB.prepare('DELETE FROM sessions WHERE expires_at<?').bind(now()).run();
    return drainOutbox(env,40);
  }
  return {skipped:cron};
}
