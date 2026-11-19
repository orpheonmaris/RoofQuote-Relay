import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {handleFetch} from '../src/index.mjs';
import {runCron,orgStats,receiveLead,csvCell,buildAck} from '../src/core.mjs';

class FakeD1 {
  constructor(){this.sqlite=new DatabaseSync(':memory:');this.sqlite.exec(readFileSync(new URL('../migrations/0001_schema.sql',import.meta.url),'utf8'));}
  prepare(sql){const db=this.sqlite;let args=[];return {bind(...params){args=params;return this;},first(){return db.prepare(sql).get(...args)||null;},all(){return {results:db.prepare(sql).all(...args)};},run(){const out=db.prepare(sql).run(...args);return {meta:{changes:out.changes,last_row_id:Number(out.lastInsertRowid)}};}};}
  batch(stmts){this.sqlite.exec('BEGIN');try{const out=stmts.map(q=>q.run());this.sqlite.exec('COMMIT');return out;}catch(e){this.sqlite.exec('ROLLBACK');throw e;}}
}
const url='https://app.example.com';
const makeEnv=()=>({DB:new FakeD1(),OPERATOR_EMAIL:'owner@relay.test',SESSION_SECRET:'32-CHARACTER-VERY-SECRET-NOT-PRODUCTION-TEST-ONLY',APP_ORIGIN:url,RESEND_API_KEY:'re_fake_in_tests',MAIL_FROM:'RoofQuote Relay <notifications@verified.test>',TURNSTILE_SITE_KEY:'test-key',TURNSTILE_SECRET:'test-secret',ASSETS:{fetch:async()=>new Response('<main>Application</main>',{headers:{'Content-Type':'text/html'}})}});
const mails=[];const oldFetch=globalThis.fetch;let providerOk=true,verifyOk=true;
globalThis.fetch=async (input,opt)=>{const u=String(input);if(u.includes('challenges.cloudflare.com/turnstile'))return Response.json({success:verifyOk,hostname:'app.example.com'});if(u.includes('api.resend.com/emails')){if(!providerOk)return Response.json({message:'provider rejected'},{status:422});const body=JSON.parse(opt.body);mails.push({body,headers:opt.headers});return Response.json({id:'sent-'+mails.length});}throw Error('Unexpected fetch '+u);};
afterEach(()=>{mails.length=0;providerOk=true;verifyOk=true;Date.now=originalNow;});
const originalNow=Date.now;
function request(path,method='GET',data,cookie){const headers={};if(data!==undefined)headers['Content-Type']='application/json';if(method!=='GET' && method!=='HEAD')headers.Origin=url;if(cookie)headers.Cookie=cookie;return new Request(url+path,{method,headers,body:data===undefined?undefined:JSON.stringify(data)});}
async function call(env,path,method='GET',data,cookie,ctx={}){const res=await handleFetch(request(path,method,data,cookie),env,ctx);let body=null;try{body=await res.clone().json();}catch{}return {res,body};}
async function operatorLogin(env){
  let x=await call(env,'/api/auth/start','POST',{email:'owner@relay.test'});assert.equal(x.res.status,200);const last=mails.at(-1).body.text;
  const token=last.match(/token=([a-f0-9]{64})/)?.[1];assert.ok(token);
  const consume=await call(env,'/api/auth/consume?token='+token);assert.equal(consume.res.status,303);
  const cookie=consume.res.headers.get('set-cookie').split(';')[0];return cookie;
}
async function makeOrg(env,cookie,slug='desert-roofing',ownerEmail='owner@relay.test'){
  let x=await call(env,'/api/orgs','POST',{name:'Desert Roofing',slug,ownerEmail},cookie);assert.equal(x.res.status,201,JSON.stringify(x.body));return x.body.id;
}
async function configOrg(env,cookie,id){let x=await call(env,`/api/orgs/${id}/settings`,'PATCH',{phone:'(480) 555-0199',privacyUrl:'https://example.com/privacy',serviceArea:'Greater Phoenix, Arizona',firstReminder:45,repeatReminder:120},cookie);assert.equal(x.res.status,200);}
async function activate(env,cookie,id,slug='desert-roofing'){const x=await call(env,`/api/orgs/${id}/activation`,'POST',{intent:'activate',authorized:true,confirmation:'ACTIVATE '+slug},cookie);assert.equal(x.res.status,200,JSON.stringify(x.body));}
const sample=()=>({name:'Internal QA',email:'internal@example.test',phone:'',zip:'85260',service:'Roof inspection',notes:'Synthetic internal test',requestKey:crypto.randomUUID().replaceAll('-',''),turnstile:'testing-token'});

test('Unconfigured installation can verify D1 health without exposing tenant data',async()=>{
 const env=makeEnv();delete env.SESSION_SECRET;delete env.RESEND_API_KEY;delete env.MAIL_FROM;delete env.TURNSTILE_SITE_KEY;delete env.TURNSTILE_SECRET;
 const health=await call(env,'/healthz');assert.equal(health.res.status,200);assert.equal(health.body.database,'connected');
 assert.equal(health.body.authenticationConfigured,false);assert.equal(health.body.mailConfigured,false);assert.equal(health.body.spamConfigured,false);
 assert.equal(await (await call(env,'/api/me')).res.status,503);
 assert.equal(JSON.stringify(health.body).includes('owner@relay.test'),false);
});

test('SQL initializes with tenant keys, no public users, and draft default',async()=>{
 const env=makeEnv();const cookie=await operatorLogin(env);const id=await makeOrg(env,cookie);
 const org=await env.DB.prepare('SELECT * FROM organizations WHERE id=?').bind(id).first();assert.equal(org.state,'draft');assert.equal(org.owner_email,'owner@relay.test');
});

test('passwordless links are single-use; sessions use Secure HttpOnly Strict cookie',async()=>{
 const env=makeEnv();const {res}=await call(env,'/api/auth/start','POST',{email:'owner@relay.test'});
 assert.equal(res.status,200);const token=mails.at(-1).body.text.match(/token=([a-f0-9]{64})/)[1];
 const first=await call(env,'/api/auth/consume?token='+token);assert.equal(first.res.status,303);
 assert.match(first.res.headers.get('set-cookie'),/HttpOnly/);assert.match(first.res.headers.get('set-cookie'),/SameSite=Strict/);assert.match(first.res.headers.get('set-cookie'),/Secure/);
 const second=await call(env,'/api/auth/consume?token='+token);assert.equal(second.res.status,401);
});

test('unknown email never receives a magic link',async()=>{const env=makeEnv();await call(env,'/api/auth/start','POST',{email:'stranger@example.test'});assert.equal(mails.length,0);});

test('cross-site JSON writes are denied',async()=>{const env=makeEnv();const cookie=await operatorLogin(env);const req=new Request(url+'/api/orgs',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://attacker.example'},body:JSON.stringify({name:'Fake Roof',slug:'fake-roof',ownerEmail:'owner@relay.test',role:'owner'})});const res=await handleFetch(req,env);assert.equal(res.status,403);});

test('operator can create tenant, edit configuration and add member',async()=>{
 const env=makeEnv();const cookie=await operatorLogin(env);const id=await makeOrg(env,cookie);await configOrg(env,cookie,id);
 let x=await call(env,`/api/orgs/${id}/staff`,'POST',{email:'employee@example.test'},cookie);assert.equal(x.res.status,200);
 assert.ok(await env.DB.prepare('SELECT 1 FROM memberships WHERE org_id=? AND email=?').bind(id,'employee@example.test').first());
});

test('public submissions fail closed until verified, activated and Turnstile checked',async()=>{
 const env=makeEnv();const cookie=await operatorLogin(env);const id=await makeOrg(env,cookie);
 let x=await call(env,'/api/public/desert-roofing','POST',sample());assert.equal(x.res.status,404);
 await configOrg(env,cookie,id);await activate(env,cookie,id);
 verifyOk=false;x=await call(env,'/api/public/desert-roofing','POST',sample());assert.equal(x.res.status,400);assert.equal((await env.DB.prepare('SELECT COUNT(*) n FROM leads').first()).n,0);
});

test('verified public request creates an inquiry and two queued messages, draining them once',async()=>{
 const env=makeEnv();const cookie=await operatorLogin(env);const id=await makeOrg(env,cookie);await configOrg(env,cookie,id);await activate(env,cookie,id);mails.length=0;
 const pending=[];const fields=sample();const ctx={waitUntil(p){pending.push(p);}};
 const x=await call(env,'/api/public/desert-roofing','POST',fields,undefined,ctx);assert.equal(x.res.status,201,JSON.stringify(x.body));await Promise.all(pending);
 assert.equal((await env.DB.prepare('SELECT COUNT(*) n FROM leads WHERE org_id=?').bind(id).first()).n,1);
 const out=(await env.DB.prepare('SELECT * FROM outbox WHERE org_id=?').bind(id).all()).results;
 assert.equal(out.length,2);assert.ok(out.every(z=>z.state==='SENT'));assert.equal(mails.length,2);
 assert.ok(mails.some(m=>m.body.subject.includes('New roofing inquiry')));assert.ok(mails.some(m=>m.body.text.includes('get in touch to discuss the next step')));
 const dupe=await call(env,'/api/public/desert-roofing','POST',fields);assert.equal(dupe.res.status,200);assert.equal(dupe.body.duplicate,true);assert.equal(mails.length,2);
});

test('public contact form rejects invalid zip, service, and missing Turnstile',async()=>{
 const env=makeEnv();const cookie=await operatorLogin(env);const id=await makeOrg(env,cookie);await configOrg(env,cookie,id);await activate(env,cookie,id);
 let d=sample();d.zip='202020';assert.equal((await call(env,'/api/public/desert-roofing','POST',d)).res.status,400);
 d=sample();d.service='Whatever';assert.equal((await call(env,'/api/public/desert-roofing','POST',d)).res.status,400);
 d=sample();delete d.turnstile;assert.equal((await call(env,'/api/public/desert-roofing','POST',d)).res.status,400);
});

test('status changes suppress reminders; Do not contact suppresses future acknowledgment',async()=>{
 const env=makeEnv();const cookie=await operatorLogin(env);const id=await makeOrg(env,cookie);await configOrg(env,cookie,id);await activate(env,cookie,id);mails.length=0;
 const d=sample();const ctx={waitUntil(p){return p}};
 let x=await call(env,'/api/public/desert-roofing','POST',d,undefined,ctx);assert.equal(x.res.status,201);
 // Drain manually without sending duplicate messages; first accept lead while queued.
 await runCron(env,'*/15 * * * *');mails.length=0;
 const lead=x.body.reference;
 await call(env,`/api/orgs/${id}/leads/${lead}`,'PATCH',{status:'Contacted'},cookie);
 const original=Date.now();Date.now=()=>original+90*60000;
 await runCron(env,'*/15 * * * *');assert.equal((await env.DB.prepare('SELECT COUNT(*) n FROM outbox WHERE kind LIKE \'reminder%\'').first()).n,0);
 await call(env,`/api/orgs/${id}/leads/${lead}`,'PATCH',{status:'Do not contact'},cookie);
 let d2=sample();d2.email=d.email;const newer=await call(env,'/api/public/desert-roofing','POST',d2);assert.equal(newer.res.status,201);
 const kinds=(await env.DB.prepare('SELECT kind FROM outbox WHERE lead_id=?').bind(newer.body.reference).all()).results.map(x=>x.kind);
 assert.deepEqual(kinds,['alert']);
});

test('45m and 120m staff reminders, capped at two, with accepted sends',async()=>{
 const env=makeEnv();const cookie=await operatorLogin(env);const id=await makeOrg(env,cookie);await configOrg(env,cookie,id);await activate(env,cookie,id);
 const d=sample();const lead=(await call(env,'/api/public/desert-roofing','POST',d)).body.reference;
 await runCron(env,'*/15 * * * *');mails.length=0;
 const baseline=Date.now();Date.now=()=>baseline+46*60000;
 await runCron(env,'*/15 * * * *');let r=await env.DB.prepare('SELECT reminder_count FROM leads WHERE id=?').bind(lead).first();assert.equal(r.reminder_count,1);assert.equal(mails.length,1);
 Date.now=()=>baseline+(46+121)*60000;await runCron(env,'*/15 * * * *');r=await env.DB.prepare('SELECT reminder_count FROM leads WHERE id=?').bind(lead).first();assert.equal(r.reminder_count,2);assert.equal(mails.length,2);
 Date.now=()=>baseline+(46+121+220)*60000;await runCron(env,'*/15 * * * *');assert.equal(mails.length,2);
});

test('unknown upstream email outcome remains for manual review, without retry',async()=>{
 const env=makeEnv();const cookie=await operatorLogin(env);const id=await makeOrg(env,cookie);await configOrg(env,cookie,id);await activate(env,cookie,id);
 const x=await call(env,'/api/public/desert-roofing','POST',sample());providerOk=false;
 await runCron(env,'*/15 * * * *');const issues=(await env.DB.prepare("SELECT * FROM outbox WHERE state='FAILED_REVIEW'").all()).results;assert.equal(issues.length,2);
 const before=mails.length;providerOk=true;await runCron(env,'*/15 * * * *');assert.equal(mails.length,before);
});

test('draft internal demo stores synthetic lead but does not send homeowner mail',async()=>{
 const env=makeEnv();const cookie=await operatorLogin(env);const id=await makeOrg(env,cookie);mails.length=0;
 const x=await call(env,`/api/orgs/${id}/lead-demo`,'POST',{},cookie);assert.equal(x.res.status,201);assert.equal(mails.length,0);
 const l=await env.DB.prepare('SELECT * FROM leads WHERE id=?').bind(x.body.id).first();assert.equal(l.ack_state,'DEMO');
});

test('operator cannot activate a company owned by someone else',async()=>{
 const env=makeEnv();const cookie=await operatorLogin(env);const id=await makeOrg(env,cookie,'other-roofing','boss@example.test');await configOrg(env,cookie,id);
 const x=await call(env,`/api/orgs/${id}/activation`,'POST',{intent:'activate',authorized:true,confirmation:'ACTIVATE other-roofing'},cookie);assert.equal(x.res.status,403);
});

test('a guest without a session cannot read protected dashboard data',async()=>{
 const env=makeEnv();const r=await call(env,'/api/orgs');assert.equal(r.res.status,401);
 const s=await call(env,'/app');assert.equal(s.res.status,303);assert.equal(s.res.headers.get('location'),'/login');
});

test('CSV formula injection is escaped, and exported data requires access',async()=>{
 assert.equal(csvCell('=SUM(A1:A9)'),"\"'=SUM(A1:A9)\"");
 const env=makeEnv();const cookie=await operatorLogin(env);const id=await makeOrg(env,cookie);
 const unauth=await call(env,`/api/orgs/${id}/export.csv`);assert.equal(unauth.res.status,401);
 const auth=await call(env,`/api/orgs/${id}/export.csv`,'GET',undefined,cookie);assert.equal(auth.res.status,200);assert.match(auth.res.headers.get('content-type'),/text\/csv/);
});

test('pause turns public intake off, while retaining the lead database',async()=>{
 const env=makeEnv();const cookie=await operatorLogin(env);const id=await makeOrg(env,cookie);await configOrg(env,cookie,id);await activate(env,cookie,id);
 const d=sample();const x=await call(env,'/api/public/desert-roofing','POST',d);assert.equal(x.res.status,201);
 const pause=await call(env,`/api/orgs/${id}/activation`,'POST',{intent:'pause'},cookie);assert.equal(pause.res.status,200);
 const blocked=await call(env,'/api/public/desert-roofing','POST',sample());assert.equal(blocked.res.status,404);
 assert.equal((await env.DB.prepare('SELECT COUNT(*) n FROM leads WHERE org_id=?').bind(id).first()).n,1);
});

async function loginAs(env,email){
  const r=await call(env,'/api/auth/start','POST',{email});assert.equal(r.res.status,200);
  const token=mails.at(-1)?.body?.text?.match(/token=([a-f0-9]{64})/)?.[1];assert.ok(token,'authorized member login link');
  const res=await call(env,'/api/auth/consume?token='+token);assert.equal(res.res.status,303);
  return res.res.headers.get('set-cookie').split(';')[0];
}

test('organization member cannot read another company, or create companies',async()=>{
  const env=makeEnv();const operator=await operatorLogin(env);
  const a=await makeOrg(env,operator,'alpha-roofing','alpha@example.test');
  const b=await makeOrg(env,operator,'bravo-roofing','bravo@example.test');
  const alpha=await loginAs(env,'alpha@example.test');
  assert.equal((await call(env,`/api/orgs/${a}`,'GET',undefined,alpha)).res.status,200);
  assert.equal((await call(env,`/api/orgs/${b}`,'GET',undefined,alpha)).res.status,404);
  assert.equal((await call(env,'/api/orgs','POST',{name:'Hidden Roof',slug:'hidden-roof',ownerEmail:'alpha@example.test'},alpha)).res.status,403);
});

test('staff can update a lead but cannot change company settings or activate',async()=>{
  const env=makeEnv();const operator=await operatorLogin(env);const id=await makeOrg(env,operator);
  await configOrg(env,operator,id);await call(env,`/api/orgs/${id}/staff`,'POST',{email:'staff@example.test'},operator);
  const staff=await loginAs(env,'staff@example.test');
  assert.equal((await call(env,`/api/orgs/${id}/settings`,'PATCH',{phone:'(480) 555-0199',privacyUrl:'https://example.com/privacy'},staff)).res.status,403);
  assert.equal((await call(env,`/api/orgs/${id}/activation`,'POST',{intent:'activate',authorized:true,confirmation:'ACTIVATE desert-roofing'},staff)).res.status,403);
  const lead=(await call(env,`/api/orgs/${id}/lead-demo`,'POST',{},operator)).body.id;
  assert.equal((await call(env,`/api/orgs/${id}/leads/${lead}`,'PATCH',{status:'Contacted'},staff)).res.status,200);
});

test('login links expire after ten minutes',async()=>{
  const env=makeEnv();await call(env,'/api/auth/start','POST',{email:'owner@relay.test'});
  const token=mails.at(-1).body.text.match(/token=([a-f0-9]{64})/)[1];
  const t=Date.now();Date.now=()=>t+11*60000;
  assert.equal((await call(env,'/api/auth/consume?token='+token)).res.status,401);
});

test('missing verified mail or spam protection blocks live activation',async()=>{
  const env=makeEnv();const operator=await operatorLogin(env);const id=await makeOrg(env,operator);await configOrg(env,operator,id);
  delete env.RESEND_API_KEY;
  assert.equal((await call(env,`/api/orgs/${id}/activation`,'POST',{intent:'activate',authorized:true,confirmation:'ACTIVATE desert-roofing'},operator)).res.status,503);
  assert.equal((await env.DB.prepare('SELECT state FROM organizations WHERE id=?').bind(id).first()).state,'draft');
});

test('stale queued homeowner acknowledgment is held for manual review',async()=>{
  const env=makeEnv();const operator=await operatorLogin(env);const id=await makeOrg(env,operator);await configOrg(env,operator,id);await activate(env,operator,id);
  const lead=(await call(env,'/api/public/desert-roofing','POST',sample())).body.reference;
  const t=Date.now();Date.now=()=>t+13*3600000;
  await runCron(env,'*/15 * * * *');
  const ack=await env.DB.prepare("SELECT state,failure_code FROM outbox WHERE lead_id=? AND kind='ack'").bind(lead).first();
  assert.equal(ack.state,'FAILED_REVIEW');assert.equal(ack.failure_code,'STALE_OR_MISSING_LEAD');
  assert.ok(mails.every(m=>!m.body.subject.includes('We received your roofing request')));
});

test('weekly reporting creates one report for an active tenant',async()=>{
  const env=makeEnv();const operator=await operatorLogin(env);const id=await makeOrg(env,operator);await configOrg(env,operator,id);await activate(env,operator,id);
  mails.length=0;
  await runCron(env,'0 16 * * MON');await runCron(env,'0 16 * * MON');
  const weekly=(await env.DB.prepare("SELECT * FROM outbox WHERE kind='weekly'").all()).results;
  assert.equal(weekly.length,1);assert.equal(weekly[0].state,'SENT');assert.equal(mails.length,1);
  assert.match(mails[0].body.text,/Recorded inquiries in the last 7 days/);
});

test('owner deleting an app lead removes outbox but retains minimal PII-free audit',async()=>{
  const env=makeEnv();const operator=await operatorLogin(env);const id=await makeOrg(env,operator);
  const lead=(await call(env,`/api/orgs/${id}/lead-demo`,'POST',{},operator)).body.id;
  const del=await call(env,`/api/orgs/${id}/leads/${lead}`,'DELETE',undefined,operator);
  assert.equal(del.res.status,200);
  assert.equal((await env.DB.prepare('SELECT COUNT(*) n FROM leads WHERE id=?').bind(lead).first()).n,0);
  assert.equal((await env.DB.prepare('SELECT COUNT(*) n FROM events WHERE lead_id=?').bind(lead).first()).n,0);
});

test('draft public form displays disabled notice and escaped owner text',async()=>{
  const env=makeEnv();const operator=await operatorLogin(env);const id=await makeOrg(env,operator);
  const res=await call(env,'/q/desert-roofing');assert.equal(res.res.status,200);
  const body=await res.res.text();assert.match(body,/Online requests are not currently available/);assert.doesNotMatch(body,/id="homeowner-form"/);
  assert.match(res.res.headers.get('content-security-policy'),/frame-src https:\/\/challenges.cloudflare.com/);
});

test('frontend asset and API contracts are present',async()=>{
  const from=new URL('../public/',import.meta.url);
  const page=readFileSync(new URL('app.html',from),'utf8');const code=readFileSync(new URL('app.js',from),'utf8');
  for(const name of ['metric-total','metric-new','leads-table','settings-form','approval-phrase','create-org-form','status-filter'])assert.ok(page.includes(`id="${name}"`),name);
  for(const path of ['/api/me','/api/orgs','/activation','/lead-demo','/leads'])assert.ok(code.includes(path),path);
  assert.doesNotMatch(page,/google\.com\/forms|google\.com\/spreadsheets/);
});
