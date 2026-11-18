'use strict';
(function () {
  const form=document.getElementById('pilot-intake-form');
  if(!form)return;
  const submit=document.getElementById('pilot-intake-submit');
  const feedback=document.getElementById('pilot-intake-feedback');
  let busy=false;
  function report(message,error){
    feedback.textContent=message;
    feedback.hidden=false;
    feedback.setAttribute('role',error?'alert':'status');
  }
  form.addEventListener('submit',async function(event){
    event.preventDefault();
    if(busy||!form.reportValidity())return;
    busy=true;
    submit.disabled=true;
    report('Sending the approved business setup details…',false);
    try{
      const response=await fetch(form.action,{
        method:'POST',body:new FormData(form),headers:{Accept:'application/json'}
      });
      if(response.ok){
        window.location.assign('/thank-you');
        return;
      }
      report(response.status===429
        ?'Too many requests were received recently. Please try again later or email us directly.'
        :'Your submission could not be confirmed. Please email roofquoterelay@outlook.com instead.',true);
    }catch(_){
      report('We could not confirm delivery. Please try again or contact roofquoterelay@outlook.com.',true);
    }finally{busy=false;submit.disabled=false;}
  });
})();
