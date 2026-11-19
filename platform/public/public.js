const form=document.querySelector('#homeowner-form');
const output=document.querySelector('#submission-result');
const key=crypto.randomUUID().replace(/-/g,'');
form?.addEventListener('submit',async event=>{
  event.preventDefault();if(!form.reportValidity())return;
  const button=form.querySelector('button[type=submit]');
  const fd=new FormData(form);const values=Object.fromEntries(fd.entries());
  const token=values['cf-turnstile-response'];
  if(!token){output.textContent='Please complete the security check before submitting.';return;}
  const payload={name:values.name,email:values.email,phone:values.phone,zip:values.zip,service:values.service,notes:values.notes,turnstile:token,requestKey:key};
  button.disabled=true;output.textContent='Sending your request…';
  try{
    const resp=await fetch('/api/public/'+encodeURIComponent(form.dataset.slug),{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(payload)});
    const result=await resp.json();
    if(!resp.ok||!result.ok){output.textContent='We could not accept your request right now. Please call the roofing company directly or try again.';window.turnstile?.reset();return;}
    form.replaceWith(Object.assign(document.createElement('div'),{className:'sent',textContent:'Thank you! Your request was recorded. The roofing team will review it and contact you about the next step. No appointment is booked yet.'}));
  }catch{output.textContent='Connection error. We cannot confirm receipt. Please contact the roofing company directly.';window.turnstile?.reset();}
  finally{button.disabled=false;}
});
