import {SERVICES,STATUSES,now,uid,normEmail,isEmail,trim,validSlug,escapeHtml,csvCell,json,fail,safeHeaders,requireConfig,hmac,randomToken,sessionCookie,clearCookie,checkOrigin,readJson,getUser,roleFor,canManage,rateLimit,audit,validUrl,buildAck,sendEmail,drainOutbox,receiveLead,orgStats,runCron} from './core.mjs';

const htmlHeaders={'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'};
const page=(body,status=200)=>safeHeaders(new Response(body,{status,headers:htmlHeaders}),true);
const redirect=(url,cookie)=>{const r=new Response(null,{status:303,headers:{Location:url,'Cache-Control':'no-store'}});if(cookie)r.headers.set('Set-Cookie',cookie);return r;};
const allowedRole=(role)=>!!role;
function originOf(req){return new URL(req.url).origin;}
function appOrigin(env,req){return String(env.APP_ORIGIN||originOf(req)).replace(/\/$/,'');}
function escapeJSON(s){return JSON.stringify(s).replace(/</g,'\\u003c');}
function isOperator(env,email){return normEmail(email)===normEmail(env.OPERATOR_EMAIL);}
function getIp(req){return req.headers.get('CF-Connecting-IP')||'unknown';}
function tooLarge(req){return Number(req.headers.get('content-length')||0)>16000;}
function loginPage(){return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sign in | RoofQuote Relay</title><link rel="stylesheet" href="/style.css"></head><body class="auth-body"><main class="auth-shell"><div class="brand-mark">R<span>↗</span></div><p class="eyebrow">PRIVATE WORKSPACE</p><h1>Your roofing inquiries, in one place.</h1><p>Sign in securely with a one-time link sent to your authorized work email.</p><form id="login-form"><label for="email">Work email</label><input required id="email" type="email" autocomplete="email" placeholder="you@yourroofingcompany.com"><button type="submit">Email me a sign-in link <span aria-hidden="true">→</span></button><p class="hint" id="result" role="status" aria-live="polite"></p></form><p class="legal">No password to remember. Accounts are invitation-only. <a href="https://roofquote-relay.pages.dev/">About RoofQuote Relay</a></p></main><script src="/login.js" defer></script></body></html>`;}
function publicForm(org,env){
  const serviceOpts=SERVICES.map(s=>`<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
  const sitekey=escapeHtml(env.TURNSTILE_SITE_KEY||'');
  const enabled=org.state==='active' && !!env.TURNSTILE_SECRET && !!sitekey && !!env.MAIL_FROM && !!env.RESEND_API_KEY;
  const formMarkup=enabled?`<form id="homeowner-form" data-slug="${escapeHtml(org.slug)}"><label for="name">Your name <span>*</span></label><input id="name" name="name" maxlength="90" required autocomplete="name" placeholder="Full name"><label for="email">Email <span>*</span></label><input id="email" name="email" type="email" required maxlength="254" autocomplete="email" placeholder="you@example.com"><label for="phone">Phone (optional)</label><input id="phone" name="phone" type="tel" maxlength="40" autocomplete="tel"><div class="two"><div><label for="zip">Property ZIP <span>*</span></label><input id="zip" name="zip" required pattern="[0-9]{5}" maxlength="5" inputmode="numeric" placeholder="85260"></div><div><label for="service">What do you need? <span>*</span></label><select id="service" name="service" required><option value="">Select one</option>${serviceOpts}</select></div></div><label for="notes">Brief description (optional)</label><textarea name="notes" id="notes" maxlength="600" rows="4" placeholder="Tell us what's happening with your roof"></textarea><div class="cf-turnstile" data-sitekey="${sitekey}" data-action="roof-inquiry"></div><button type="submit">Send roofing request <span aria-hidden="true">→</span></button><p class="hint" id="submission-result" role="status" aria-live="polite"></p></form>`:`<div class="closed"><strong>Online requests are not currently available.</strong><p>Contact the roofing company directly using its verified contact channels.</p></div>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,follow"><title>Request a roof estimate | ${escapeHtml(org.name)}</title><link rel="stylesheet" href="/style.css"></head><body class="public-body"><main class="public-shell"><div class="brand-mark">R<span>↗</span></div><p class="eyebrow">ROOFING REQUEST FORM</p><h1>${escapeHtml(org.name)}</h1><p class="lead">Tell the team about your roofing request. They'll review it and contact you about the next step.</p>${formMarkup}<p class="legal">Submitting does not schedule an appointment. For urgent leaks or safety issues, call ${escapeHtml(org.phone)} directly. <a href="${escapeHtml(org.privacy_url||'#')}" rel="noopener noreferrer" target="_blank">Privacy notice</a>.</p><p class="powered">Inquiry tracking by RoofQuote Relay</p></main>${enabled?'<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script><script src="/public.js" defer></script>':''}</body></html>`;
}
async function authStart(req,env){
  requireConfig(env,['SESSION_SECRET','OPERATOR_EMAIL','RESEND_API_KEY','MAIL_FROM','APP_ORIGIN']);
  const data=await readJson(req);const email=normEmail(data.email);
  if(!isEmail(email))return fail('valid_email_required',400);
  const ip=getIp(req);
  const limited=(await rateLimit(env,'magic-ip|'+ip,8,15*60000))||(await rateLimit(env,'magic-email|'+email,3,15*60000));
  if(limited)return json({ok:true,message:'If this email is authorized, a sign-in link will be sent.'});
  const member=await env.DB.prepare('SELECT 1 FROM memberships WHERE email=? LIMIT 1').bind(email).first();
  if(!isOperator(env,email)&&!member)return json({ok:true,message:'If this email is authorized, a sign-in link will be sent.'});
  const token=randomToken();const hash=await hmac(env.SESSION_SECRET,'login|'+token);
  await env.DB.prepare('INSERT INTO login_tokens(hash,email,expires_at,created_at) VALUES(?,?,?,?)').bind(hash,email,now()+10*60000,now()).run();
  const link=new URL('/api/auth/consume',env.APP_ORIGIN);link.searchParams.set('token',token);
  const body=`Sign in to RoofQuote Relay\n\nOpen this one-time link within 10 minutes:\n${link.toString()}\n\nIf you didn't request this, ignore this email. Never forward the link.`;
  const sent=await sendEmail(env,{id:'login-'+hash,to:email,subject:'Your RoofQuote Relay sign-in link',body});
  if(sent.state!=='SENT')console.warn('Login mail delivery needs attention:',sent.error);
  return json({ok:true,message:'If this email is authorized, a sign-in link will be sent.'});
}
async function authConsume(req,env){
  const token=new URL(req.url).searchParams.get('token')||'';
  if(!/^[a-f0-9]{64}$/.test(token))return page('<h1>Sign-in link invalid</h1><p><a href="/login">Request another link</a></p>',401);
  const hash=await hmac(env.SESSION_SECRET,'login|'+token);const t=now();
  const row=await env.DB.prepare('SELECT email FROM login_tokens WHERE hash=? AND used_at IS NULL AND expires_at>?').bind(hash,t).first();
  if(!row)return page('<h1>Sign-in link expired or used</h1><p><a href="/login">Request another link</a></p>',401);
  const claimed=await env.DB.prepare('UPDATE login_tokens SET used_at=? WHERE hash=? AND used_at IS NULL AND expires_at>?').bind(t,hash,t).run();
  if((claimed.meta?.changes||0)!==1)return fail('link_already_used',401);
  const session=randomToken(),digest=await hmac(env.SESSION_SECRET,'session|'+session);
  await env.DB.prepare('INSERT INTO sessions(hash,email,created_at,expires_at) VALUES(?,?,?,?)').bind(digest,row.email,t,t+7*EPOCH_DAY).run();
  return redirect('/app',sessionCookie(session));
}
const EPOCH_DAY=86400000;
async function listOrgs(env,user){
  const results=user.operator?
    (await env.DB.prepare('SELECT * FROM organizations ORDER BY created_at DESC LIMIT 100').all()).results:
    (await env.DB.prepare('SELECT o.* FROM organizations o JOIN memberships m ON m.org_id=o.id WHERE m.email=? ORDER BY o.created_at DESC LIMIT 100').bind(user.email).all()).results;
  return (results||[]).map(o=>({id:o.id,slug:o.slug,name:o.name,state:o.state,ownerEmail:o.owner_email,phone:o.phone,privacyUrl:o.privacy_url,timezone:o.timezone,firstReminder:o.reminder_first_min,repeatReminder:o.reminder_repeat_min}));
}
async function createOrg(env,user,req){
  if(!user.operator)return fail('forbidden',403);
  const data=await readJson(req);
  const name=trim(data.name,110),slug=trim(data.slug,50).toLowerCase(),owner=normEmail(data.ownerEmail);
  if(name.length<3||!validSlug(slug)||!isEmail(owner))return fail('invalid_company_details');
  const id=uid(),t=now();
  try {await env.DB.batch([
    env.DB.prepare("INSERT INTO organizations(id,slug,name,owner_email,created_at,updated_at,state) VALUES(?,?,?,?,?,?,'draft')").bind(id,slug,name,owner,t,t),
    env.DB.prepare("INSERT INTO memberships(org_id,email,role,created_at) VALUES(?,?,'owner',?)").bind(id,owner,t)
  ]);}catch{return fail('slug_already_exists',409);}
  await audit(env,id,null,user.email,'ORG_CREATED');
  return json({ok:true,id,slug,state:'draft'},201);
}
async function currentOrg(env,user,id){const org=await env.DB.prepare('SELECT * FROM organizations WHERE id=?').bind(id).first();if(!org)return null;const role=await roleFor(env,user,id);if(!role)return null;return {org,role};}
function publicOrg(o){return {id:o.id,slug:o.slug,name:o.name,ownerEmail:o.owner_email,phone:o.phone,privacyUrl:o.privacy_url,serviceArea:o.service_area,timezone:o.timezone,state:o.state,firstReminder:o.reminder_first_min,repeatReminder:o.reminder_repeat_min,approvedAt:o.live_approved_at};}
async function updateOrg(env,user,org,role,req){
  if(!canManage(role))return fail('insufficient_role',403);
  const data=await readJson(req);const phone=trim(data.phone,60),privacy=trim(data.privacyUrl,500),area=trim(data.serviceArea,160);
  const first=Number(data.firstReminder??org.reminder_first_min),repeat=Number(data.repeatReminder??org.reminder_repeat_min);
  if(!/^\+?[0-9 ()\-.]{7,60}$/.test(phone)||!validUrl(privacy)||!Number.isInteger(first)||first<15||first>480||!Number.isInteger(repeat)||repeat<30||repeat>1440)return fail('invalid_settings',400);
  await env.DB.prepare('UPDATE organizations SET phone=?,privacy_url=?,service_area=?,reminder_first_min=?,reminder_repeat_min=?,updated_at=? WHERE id=?').bind(phone,privacy,area,first,repeat,now(),org.id).run();
  await audit(env,org.id,null,user.email,'ORG_SETTINGS');return json({ok:true});
}
async function changeActivation(env,user,org,role,req){
  if(!canManage(role))return fail('insufficient_role',403);
  const data=await readJson(req);const intent=String(data.intent||'');
  if(intent==='pause'){
    if(org.state==='draft')return fail('not_active',409);
    await env.DB.prepare("UPDATE organizations SET state='paused',updated_at=? WHERE id=?").bind(now(),org.id).run();
    await audit(env,org.id,null,user.email,'INTAKE_PAUSED');return json({ok:true,state:'paused'});
  }
  if(intent!=='activate')return fail('invalid_intent',400);
  // A contracting business owner must explicitly approve homeowner messaging.
  if(user.email!==org.owner_email)return fail('owner_approval_required',403);
  if(data.confirmation!==`ACTIVATE ${org.slug}`||data.authorized!==true)return fail('explicit_approval_required',400);
  if(!org.phone||!validUrl(org.privacy_url))return fail('company_details_incomplete',409);
  try{requireConfig(env,['RESEND_API_KEY','MAIL_FROM','TURNSTILE_SECRET','TURNSTILE_SITE_KEY','APP_ORIGIN']);}catch{return fail('mail_or_turnstile_not_configured',503);}
  await env.DB.prepare("UPDATE organizations SET state='active',live_approved_by=?,live_approved_at=?,updated_at=? WHERE id=?").bind(user.email,now(),now(),org.id).run();
  await audit(env,org.id,null,user.email,'INTAKE_ACTIVATED','Owner confirmed authorized launch');
  return json({ok:true,state:'active'});
}
async function addStaff(env,user,org,role,req){
  if(!canManage(role))return fail('insufficient_role',403);
  const data=await readJson(req),email=normEmail(data.email);
  if(!isEmail(email)||email===org.owner_email)return fail('invalid_staff_email');
  await env.DB.prepare("INSERT OR IGNORE INTO memberships(org_id,email,role,created_at) VALUES(?,?,'staff',?)").bind(org.id,email,now()).run();
  await audit(env,org.id,null,user.email,'STAFF_INVITED');return json({ok:true});
}
async function getLeads(env,orgId,url){
  const status=url.searchParams.get('status')||'';const limit=50;
  const rows=(status&&STATUSES.includes(status))?
    (await env.DB.prepare('SELECT * FROM leads WHERE org_id=? AND status=? ORDER BY created_at DESC LIMIT ?').bind(orgId,status,limit).all()).results:
    (await env.DB.prepare('SELECT * FROM leads WHERE org_id=? ORDER BY created_at DESC LIMIT ?').bind(orgId,limit).all()).results;
  return (rows||[]).map(l=>({id:l.id,name:l.name,email:l.email,phone:l.phone,zip:l.zip,service:l.service,notes:l.notes,status:l.status,receivedAt:l.created_at,contactedAt:l.contacted_at,reminders:l.reminder_count,ack:l.ack_state,alert:l.alert_state}));
}
async function setLeadStatus(env,user,orgId,leadId,req){
  const data=await readJson(req),status=String(data.status||'');if(!STATUSES.includes(status))return fail('invalid_status');
  const old=await env.DB.prepare('SELECT * FROM leads WHERE org_id=? AND id=?').bind(orgId,leadId).first();if(!old)return fail('not_found',404);
  const t=now();const contacted=status!=='New'?(old.contacted_at||t):old.contacted_at;
  await env.DB.prepare('UPDATE leads SET status=?,contacted_at=?,updated_at=? WHERE org_id=? AND id=?').bind(status,contacted,t,orgId,leadId).run();
  if(status==='Do not contact')await env.DB.prepare('INSERT OR IGNORE INTO suppressions(org_id,email_hash,created_at) VALUES(?,?,?)').bind(orgId,old.email_hash,t).run();
  await audit(env,orgId,leadId,user.email,'LEAD_STATUS',status);
  return json({ok:true,status,contactedAt:contacted});
}
async function deleteLead(env,user,orgId,leadId){
  const row=await env.DB.prepare('SELECT * FROM leads WHERE org_id=? AND id=?').bind(orgId,leadId).first();if(!row)return fail('not_found',404);
  // Deletion covers this app's copies only. Email provider and external mail history may persist.
  await env.DB.prepare('DELETE FROM leads WHERE org_id=? AND id=?').bind(orgId,leadId).run();
  await audit(env,orgId,null,user.email,'LEAD_DELETED','Related app outbox entries deleted');
  return json({ok:true,scope:'app_database_only'});
}
async function orgExport(env,orgId){
  const rows=(await env.DB.prepare('SELECT id,created_at,name,email,phone,zip,service,notes,status,contacted_at,reminder_count FROM leads WHERE org_id=? ORDER BY created_at DESC LIMIT 10000').bind(orgId).all()).results||[];
  const cols=['id','created_at','name','email','phone','zip','service','notes','status','contacted_at','reminder_count'];
  const text=[cols.map(csvCell).join(','),...rows.map(row=>cols.map(x=>csvCell(row[x])).join(','))].join('\r\n');
  return new Response(text,{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="roofquote-leads.csv"','Cache-Control':'no-store'}});
}
async function publicSubmit(env,req,slug,ctx){
  if(tooLarge(req))return fail('request_too_large',413);
  const org=await env.DB.prepare('SELECT * FROM organizations WHERE slug=?').bind(slug).first();if(!org||org.state!=='active')return fail('intake_not_active',404);
  const body=await readJson(req);
  if(body.website_url || body.secondary_email)return fail('invalid_request',400); // optional bot bait
  if(await rateLimit(env,`intake-ip|${slug}|${getIp(req)}`,6,15*60000))return fail('too_many_requests',429);
  if(await rateLimit(env,`intake-email|${slug}|${normEmail(body.email)}`,4,15*60000))return fail('too_many_requests',429);
  const result=await receiveLead(env,org,body,{demo:false,turnstile:trim(body.turnstile,2100),requestIp:getIp(req)});
  if(result.error)return fail(result.error,result.status);
  if(!result.duplicate && !result.suppressed)ctx?.waitUntil?.(drainOutbox(env,8));
  else if(!result.duplicate)ctx?.waitUntil?.(drainOutbox(env,8));
  return json({ok:true,reference:result.id,duplicate:result.duplicate},result.duplicate?200:201);
}
async function demoLead(env,user,org,role,req){
  if(!canManage(role))return fail('insufficient_role',403);
  if(org.state==='active')return fail('demo_disabled_during_live',409);
  const data=await readJson(req);
  const test={name:'Demo Homeowner',email:org.owner_email,phone:'',zip:'85260',service:'Roof inspection',notes:'Synthetic internal test — no real customer',requestKey:uid().replace(/-/g,'')};
  const result=await receiveLead(env,org,test,{demo:true});
  if(result.error)return fail(result.error,result.status);
  await audit(env,org.id,result.id,user.email,'DEMO_CREATED');
  return json({ok:true,id:result.id,status:'New',note:'No homeowner mail was sent'},201);
}
export async function handleFetch(req,env,ctx={}){
  try{
    const url=new URL(req.url),path=url.pathname,method=req.method.toUpperCase();
    if(!env.DB)return fail('database_not_configured',503);
    // Public health route deliberately checks database setup without requiring
    // an authentication secret. It does not expose company or homeowner data.
    if(path==='/healthz'){
      try{
        await env.DB.prepare('SELECT 1 as ok').first();
        const authReady=!!(env.SESSION_SECRET && String(env.SESSION_SECRET).length>=32 && !String(env.SESSION_SECRET).startsWith('REPLACE_'));
        return json({database:'connected',authenticationConfigured:authReady,mailConfigured:!!(env.RESEND_API_KEY&&env.MAIL_FROM),spamConfigured:!!(env.TURNSTILE_SECRET&&env.TURNSTILE_SITE_KEY)});
      }catch{return fail('database_unavailable',503);}
    }
    if(!env.SESSION_SECRET || String(env.SESSION_SECRET).length<32 || String(env.SESSION_SECRET).startsWith('REPLACE_'))return fail('session_secret_not_configured',503);
    if(path==='/' && method==='GET')return redirect('/app');
    if(path==='/login'&&method==='GET')return page(loginPage());
    const publicMatch=path.match(/^\/q\/([a-z0-9-]{3,44})$/);
    if(publicMatch&&method==='GET'){
      const o=await env.DB.prepare('SELECT * FROM organizations WHERE slug=?').bind(publicMatch[1]).first();if(!o)return page('<h1>Form not found</h1>',404);
      return page(publicForm(o,env));
    }
    if(path==='/api/auth/consume'&&method==='GET')return authConsume(req,env);
    if(method!=='GET'&&method!=='HEAD'&&!checkOrigin(req))return fail('origin_not_allowed',403);
    if(path==='/api/auth/start'&&method==='POST')return authStart(req,env);
    if(path==='/api/auth/logout'&&method==='POST'){
      const token=String(req.headers.get('cookie')||'').match(/(?:^|;\s*)__Host-rqr_session=([a-f0-9]{64})(?=;|$)/)?.[1];
      if(token)await env.DB.prepare('DELETE FROM sessions WHERE hash=?').bind(await hmac(env.SESSION_SECRET,'session|'+token)).run();
      return redirect('/login',clearCookie);
    }
    const publicPost=path.match(/^\/api\/public\/([a-z0-9-]{3,44})$/);
    if(publicPost&&method==='POST')return publicSubmit(env,req,publicPost[1],ctx);
    if(path==='/app'&&method==='GET'){
      const user=await getUser(req,env);if(!user)return redirect('/login');
      return safeHeaders(await env.ASSETS.fetch(new Request(new URL('/app.html',req.url))),true);
    }
    if(!path.startsWith('/api/'))return env.ASSETS?env.ASSETS.fetch(req):fail('not_found',404);
    const user=await getUser(req,env);if(!user)return fail('unauthorized',401);
    if(path==='/api/me'&&method==='GET')return json({email:user.email,operator:user.operator,organizations:await listOrgs(env,user)});
    if(path==='/api/orgs'&&method==='GET')return json({organizations:await listOrgs(env,user)});
    if(path==='/api/orgs'&&method==='POST')return createOrg(env,user,req);
    const m=path.match(/^\/api\/orgs\/([a-f0-9-]{36})(?:\/(.*))?$/);
    if(!m)return fail('not_found',404);
    const orgId=m[1],tail=m[2]||'',scope=await currentOrg(env,user,orgId);
    if(!scope)return fail('not_found',404);
    const {org,role}=scope;
    if(tail===''&&method==='GET')return json({org:publicOrg(org),role});
    if(tail==='settings'&&method==='PATCH')return updateOrg(env,user,org,role,req);
    if(tail==='activation'&&method==='POST')return changeActivation(env,user,org,role,req);
    if(tail==='staff'&&method==='POST')return addStaff(env,user,org,role,req);
    if(tail==='metrics'&&method==='GET')return json({stats:await orgStats(env,orgId)});
    if(tail==='leads'&&method==='GET')return json({leads:await getLeads(env,orgId,url)});
    if(tail==='lead-demo'&&method==='POST')return demoLead(env,user,org,role,req);
    if(tail==='export.csv'&&method==='GET'){
      if(!canManage(role))return fail('insufficient_role',403);
      return orgExport(env,orgId);
    }
    if(tail==='issues'&&method==='GET'){
      const results=(await env.DB.prepare("SELECT id,lead_id,kind,state,failure_code,created_at FROM outbox WHERE org_id=? AND state IN('FAILED_REVIEW','UNKNOWN_REVIEW','CLAIMED') ORDER BY created_at DESC LIMIT 50").bind(orgId).all()).results||[];
      return json({issues:results});
    }
    const leadRoute=tail.match(/^leads\/([a-f0-9-]{36})$/);
    if(leadRoute&&method==='PATCH')return setLeadStatus(env,user,orgId,leadRoute[1],req);
    if(leadRoute&&method==='DELETE'){
      if(!canManage(role))return fail('insufficient_role',403);
      return deleteLead(env,user,orgId,leadRoute[1]);
    }
    return fail('not_found',404);
  }catch(error){
    if(/Missing configuration/.test(String(error.message)))return fail('service_not_configured',503);
    if(/JSON|Expected JSON|Request too large/.test(String(error.message)))return fail('invalid_request',400);
    console.error('RoofQuote Relay worker error:',String(error?.name||'Error'));
    return fail('internal_error',500);
  }
}
export default {
  fetch(request,env,ctx){return handleFetch(request,env,ctx);},
  async scheduled(controller,env,ctx){
    try{await runCron(env,controller.cron);}catch(error){console.error('RoofQuote scheduled error:',String(error?.name||'Error'));throw error;}
  }
};
