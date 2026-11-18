'use strict';
const el = id => document.getElementById(id);
const clean = (s,n=120) => String(s||'').trim().slice(0,n);
const price = 750; // quoted starting monthly fee; actual client scope may differ
let current=null;
const messages={
  New:"Would be eligible for one check-in after 48 hours only if the client enables it, consent stays valid, and nobody replies. This demo schedules nothing.",
  Contacted:"No follow-up: the roofer marked the inquiry Contacted.",
  Booked:"No follow-up: the inquiry was marked Booked.",
  Responded:"No follow-up: the homeowner has responded.",
  'Do not contact':"No follow-up: the homeowner must not receive more messages."
};
function announce(message){const node=el('demo-announcement');if(node)node.textContent=message}
function updateStatus(){
  if(!el('sim-status')||!el('follow-message'))return;
  const status=el('sim-status').value,consent=el('sim-consent').checked;
  const allowed=status==='New'&&consent;
  const text=(!consent&&status==='New')?'No follow-up: permission for an optional homeowner check-in was not given.':messages[status];
  el('follow-message').textContent=text;
  el('follow-status').textContent=allowed?'Possible, not scheduled':'Suppressed';
  el('follow-status').style.background=allowed?'#f4e6db':'#e5f1e8';
  el('follow-status').style.color=allowed?'#784529':'#315b3e';
  if(current){current.status=status;announce('Status '+status+'. '+text)}
}
if(el('simulate-form')){
  el('simulate-form').addEventListener('submit',event=>{
    event.preventDefault();
    const full=clean(el('sim-name').value,80);
    current={name:full,zip:clean(el('sim-zip').value,10),service:el('sim-service').value,notes:clean(el('sim-notes').value,350),consent:el('sim-consent').checked,status:'New'};
    el('demo-empty').hidden=true;el('demo-empty').style.display='none';el('demo-active').hidden=false;
    el('result-name').textContent=current.name+' · '+current.zip;
    el('ack-message').textContent='In a real installation, the homeowner would receive a receipt confirmation. No appointment or callback time is promised. Nothing is sent in this demo.';
    el('owner-message').textContent='In a real installation, the team would receive: '+current.service+' in ZIP '+current.zip+'. Request recorded in the lead tracker. Nothing is sent in this demo.';
    el('sim-status').value='New';updateStatus();
    el('copy-feedback').textContent='';
    announce('Fictional request processed in the demo. An example acknowledgement, owner alert, and follow-up decision are displayed.');
  });
  el('sim-status').addEventListener('change',updateStatus);
  el('sim-consent').addEventListener('change',updateStatus);
  el('sim-copy').addEventListener('click',async()=>{
    if(!current)return;
    const summary=['RoofQuote Relay / FICTIONAL LEAD','Name: '+current.name,'ZIP: '+current.zip,'Service: '+current.service,'Notes: '+current.notes,'Owner status: '+current.status,'Optional follow-up consent: '+(current.consent?'Yes':'No'),el('follow-message').textContent,'Demo only. Nothing transmitted.'].join('\n');
    try{await navigator.clipboard.writeText(summary);el('copy-feedback').textContent='Copied the fictional lead summary.'}
    catch(_){el('copy-feedback').textContent='Clipboard was blocked. Please copy from the visible summary.'}
  });
}
function calculate(){
  if(!el('calc-inquiries')||!el('calc-margin')||!el('jobs-val'))return;
  const volume=Number(el('calc-inquiries').value), margin=Number(el('calc-margin').value);
  const jobs=Math.max(1,Math.ceil(price/margin));
  el('inquiries-val').textContent=String(volume);
  el('margin-val').textContent=margin.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
  el('jobs-val').textContent=String(jobs);
  const percent=(jobs/Math.max(1,volume)*100).toFixed(1);
  const txt=`At an estimated ${margin.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0})} contribution per additional completed job, ${jobs} such ${jobs===1?'job':'jobs'} would cover a $750 monthly fee. At ${volume} inquiries per month, that is ${percent}% of incoming requests. This is an illustrative threshold, not a forecast of additional jobs.`;
  if(el('jobs-note'))el('jobs-note').textContent=txt;
}
if(el('calc-inquiries')&&el('calc-margin')){
  el('calc-inquiries').addEventListener('input',calculate);
  el('calc-margin').addEventListener('input',calculate);
  calculate();
}
// Contact form submits natively to Netlify Forms; don't intercept submission.
if(el('year'))el('year').textContent=String(new Date().getFullYear());
const toggle=el('menu-toggle');
if(toggle){
  const nav=el('site-nav'),links=el('primary-nav');
  function closeMenu(){nav.classList.remove('nav-open');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Open navigation')}
  toggle.addEventListener('click',()=>{
    const next=!nav.classList.contains('nav-open');
    nav.classList.toggle('nav-open',next);
    toggle.setAttribute('aria-expanded',String(next));
    toggle.setAttribute('aria-label',next?'Close navigation':'Open navigation');
  });
  if(links)links.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});
  document.addEventListener('pointerdown',e=>{if(!nav.contains(e.target))closeMenu()});
  window.addEventListener('resize',()=>{if(window.innerWidth>760)closeMenu()});
}
