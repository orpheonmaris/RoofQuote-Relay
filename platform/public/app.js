'use strict';
const q=s=>document.querySelector(s),qa=s=>Array.from(document.querySelectorAll(s));
const state={me:null,org:null,role:null,screen:'overview',leads:[]};
const STATUSES=['New','Contacted','Booked','Closed - Won','Closed - Lost','Do not contact'];
const formatDate=t=>t?new Date(t).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'—';
const asText=(node,value)=>{node.textContent=String(value??'');return node;};
function node(tag,cls,text){const el=document.createElement(tag);if(cls)el.className=cls;if(text!=null)el.textContent=String(text);return el;}
function show(message,bad=false){const bar=q('#global-notice');bar.hidden=false;bar.className='notice'+(bad?' bad':'');bar.textContent=message;clearTimeout(show.timeout);show.timeout=setTimeout(()=>{bar.hidden=true;},7000);}
async function api(path,{method='GET',data}={}){
  const res=await fetch(path,{method,credentials:'same-origin',headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify(data):undefined});
  if(res.status===401){window.location.assign('/login');throw Error('Session expired');}
  const json=await res.json().catch(()=>({error:'unexpected_response'}));
  if(!res.ok)throw Error(json.error||'Request failed');return json;
}
async function startup(){
  state.me=await api('/api/me');q('#account-email').textContent=state.me.email;
  if(!state.me.operator)q('#empty .no-org')?.remove();
  q('#org-select').replaceChildren();for(const o of state.me.organizations){const opt=node('option',null,o.name);opt.value=o.id;q('#org-select').appendChild(opt);}
  if(!state.me.organizations.length){q('#empty').hidden=false;q('#screens').hidden=true;q('#page-title').textContent='Your lead desk';q('#org-mode').textContent='NO CLIENTS';
    if(!state.me.operator){q('#create-org-form').replaceWith(node('p','hint','You have not been invited to a company workspace yet. Ask its owner to authorize your email.'));}return;}
  q('#empty').hidden=true;q('#screens').hidden=false;
  const fromUrl=new URL(location.href).searchParams.get('org');const found=state.me.organizations.find(o=>o.id===fromUrl) || state.me.organizations[0];
  q('#org-select').value=found.id;await selectOrg(found.id);
}
async function selectOrg(id){
  const result=await api('/api/orgs/'+id);state.org=result.org;state.role=result.role;
  q('#page-title').textContent=result.org.name;q('#org-mode').textContent=result.org.state.toUpperCase();q('#org-mode').className='status-pill state-'+result.org.state;
  q('#public-form-link').href='/q/'+result.org.slug;q('#public-form-link').textContent='/q/'+result.org.slug;
  const sf=q('#settings-form');sf.phone.value=result.org.phone||'';sf.privacyUrl.value=result.org.privacyUrl||'';sf.serviceArea.value=result.org.serviceArea||'';
  sf.firstReminder.value=result.org.firstReminder||45;sf.repeatReminder.value=result.org.repeatReminder||120;
  q('#first-duration').textContent=result.org.firstReminder||45;q('#repeat-duration').textContent=result.org.repeatReminder||120;
  q('#approval-phrase').placeholder='ACTIVATE '+result.org.slug;
  const canEdit=['operator','owner'].includes(state.role);sf.querySelectorAll('input,button').forEach(x=>x.disabled=!canEdit);
  q('#staff-form').querySelectorAll('input,button').forEach(x=>x.disabled=!canEdit);
  q('#activate-btn').disabled=!(state.me.email===result.org.ownerEmail && result.org.state!=='active');
  q('#pause-btn').disabled=!(canEdit&&result.org.state!=='draft');
  state.leads=[];await refresh();setScreen(state.screen);
}
function setScreen(name){state.screen=name;q('#crumb').textContent=name.toUpperCase();qa('[data-view]').forEach(b=>b.classList.toggle('navactive',b.dataset.view===name));qa('.screen').forEach(x=>x.hidden=x.id!=='view-'+name);}
async function refresh(){if(!state.org)return;
  const id=state.org.id;const [stats,leads,issues]=await Promise.all([api('/api/orgs/'+id+'/metrics'),api('/api/orgs/'+id+'/leads'),api('/api/orgs/'+id+'/issues')]);
  state.leads=leads.leads;renderStats(stats.stats);renderRecent(leads.leads);renderLeads(leads.leads);renderIssues(issues.issues);
}
function renderStats(s){q('#metric-total').textContent=s.total;q('#metric-new').textContent=s.counts.New;
  q('#metric-week').textContent=s.last7;q('#metric-issues').textContent=s.needsReview;
  q('#pulse-copy').textContent=state.org.state==='active'?'Public intake is active. Staff must review new requests and update statuses.':
    'This company is in '+state.org.state.toUpperCase()+' mode. Public homeowner intake and automated customer email are off until the owner approves activation.';
  const wrap=q('#status-bars');wrap.replaceChildren();const max=Math.max(...Object.values(s.counts),1);
  for(const status of STATUSES){const row=node('div','bar-row'),top=node('div','bar-top');top.append(node('span',null,status),node('strong',null,s.counts[status]));
    const track=node('div','bar-track'),fill=node('div','bar-fill');fill.style.width=(100*s.counts[status]/max)+'%';track.append(fill);row.append(top,track);wrap.append(row);}
}
function statusTag(s){return node('span','state-chip status-'+s.replace(/\W+/g,'-').toLowerCase(),s);}
function renderRecent(leads){const tbody=q('#recent-table');tbody.replaceChildren();if(!leads.length){const tr=node('tr'),td=node('td','emptyrow','No inquiries yet. Generate a safe demo request to see one here.');td.colSpan=4;tr.append(td);tbody.append(tr);return;}
  for(const l of leads.slice(0,6)){const tr=node('tr');tr.append(node('td','date-cell',formatDate(l.receivedAt)),node('td',null,l.name),node('td',null,l.service),node('td'));tr.lastChild.append(statusTag(l.status));tbody.append(tr);}}
function leadStatusSelect(lead){const sel=node('select','compact-select');sel.setAttribute('aria-label','Set status for '+lead.name);for(const status of STATUSES){const opt=node('option',null,status);opt.value=status;sel.append(opt);}sel.value=lead.status;sel.addEventListener('change',async()=>{
    const prev=lead.status;sel.disabled=true;try{await api('/api/orgs/'+state.org.id+'/leads/'+lead.id,{method:'PATCH',data:{status:sel.value}});show('Status updated: '+lead.name+' → '+sel.value);await refresh();}catch(err){sel.value=prev;show('Could not update status: '+err.message,true);}finally{sel.disabled=false;}
  });return sel;}
function renderLeads(leads){const tbody=q('#leads-table');tbody.replaceChildren();if(!leads.length){const tr=node('tr'),td=node('td','emptyrow','No leads match this view.');td.colSpan=5;tr.append(td);tbody.append(tr);return;}
  for(const l of leads){const tr=node('tr');const ident=node('td'),name=node('div','leadname',l.name),email=node('div','smallmuted',l.email),phone=node('div','smallmuted',l.phone||'No phone');ident.append(name,email,phone);
    const svc=node('td');svc.append(node('div',null,l.service),node('div','smallmuted',l.zip));
    const signals=node('td','smallmuted',`Acknowledgment: ${l.ack}\nOwner alert: ${l.alert}\nReminders: ${l.reminders}/2`);signals.style.whiteSpace='pre-line';tr.append(node('td','date-cell',formatDate(l.receivedAt)),ident,svc,node('td'),signals);tr.children[3].append(leadStatusSelect(l));tbody.append(tr);}
}
function renderIssues(items){const parent=q('#issue-list');parent.replaceChildren();if(!items.length){parent.append(node('div','no-issues','No delivery exceptions are currently recorded.'));return;}
 for(const e of items){const item=node('div','issue');item.append(node('strong',null,e.kind+' — '+e.state),node('p',null,(e.failure_code||'Needs manual verification')+' · '+formatDate(e.created_at)));parent.append(item);}}
function handlers(){
  q('#logout').addEventListener('click',async()=>{await fetch('/api/auth/logout',{method:'POST',credentials:'same-origin'});location.assign('/login');});
  q('#org-select').addEventListener('change',()=>selectOrg(q('#org-select').value).catch(e=>show(e.message,true)));
  qa('[data-view]').forEach(x=>x.addEventListener('click',()=>setScreen(x.dataset.view)));
  q('#create-org-form').addEventListener('submit',async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.target));try{await api('/api/orgs',{method:'POST',data});show('Company workspace created in DRAFT mode.');await startup();}catch(err){show(err.message,true);}});
  q('#status-filter').addEventListener('change',async()=>{try{const d=await api('/api/orgs/'+state.org.id+'/leads?status='+encodeURIComponent(q('#status-filter').value));renderLeads(d.leads);}catch(e){show(e.message,true);}});
  q('#export-btn').addEventListener('click',()=>{location.href='/api/orgs/'+state.org.id+'/export.csv';});
  q('#demo-quick').addEventListener('click',async()=>{try{const r=await api('/api/orgs/'+state.org.id+'/lead-demo',{method:'POST',data:{}});show('Fictional inquiry created. No email was sent to a homeowner.');await refresh();}catch(e){show(e.message,true);}});
  q('#settings-form').addEventListener('submit',async e=>{e.preventDefault();try{const data=Object.fromEntries(new FormData(e.target));await api('/api/orgs/'+state.org.id+'/settings',{method:'PATCH',data});show('Company settings saved.');await selectOrg(state.org.id);}catch(e){show('Could not save: '+e.message,true);}});
  q('#staff-form').addEventListener('submit',async e=>{e.preventDefault();try{await api('/api/orgs/'+state.org.id+'/staff',{method:'POST',data:Object.fromEntries(new FormData(e.target))});show('Email authorized. That staff member can request a sign-in link from the login page.');e.target.reset();}catch(err){show(err.message,true);}});
  q('#activate-btn').addEventListener('click',async()=>{try{const d={intent:'activate',authorized:q('#approval-check').checked,confirmation:q('#approval-phrase').value};await api('/api/orgs/'+state.org.id+'/activation',{method:'POST',data:d});show('Public intake activated by the authorized owner.');await selectOrg(state.org.id);}catch(e){show('Activation blocked: '+e.message,true);}});
  q('#pause-btn').addEventListener('click',async()=>{try{await api('/api/orgs/'+state.org.id+'/activation',{method:'POST',data:{intent:'pause'}});show('Public intake paused.');await selectOrg(state.org.id);}catch(e){show(e.message,true);}});
}
handlers();startup().catch(e=>show('Unable to load workspace: '+e.message,true));
