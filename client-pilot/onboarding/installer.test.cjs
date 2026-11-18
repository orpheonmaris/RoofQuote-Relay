'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'../..');
const installer=require(path.join(root,'public/onboarding/installer.js'));
const canonical=fs.readFileSync(path.join(root,'client-pilot/apps-script/Code.gs'),'utf8');
const served=fs.readFileSync(path.join(root,'public/onboarding/template.gs.txt'),'utf8');
const operatorPage=fs.readFileSync(path.join(root,'public/operator-installer.html'),'utf8');
const clientPage=fs.readFileSync(path.join(root,'public/pilot-start.html'),'utf8');
const worker=fs.readFileSync(path.join(root,'public/onboarding/pilot-intake.js'),'utf8');
const headers=fs.readFileSync(path.join(root,'public/_headers'),'utf8');
const privacy=fs.readFileSync(path.join(root,'public/privacy.html'),'utf8');

let total=0,passed=0;
function test(name,check){
  total++;
  try{check();passed++;console.log('PASS '+name);}
  catch(error){process.exitCode=1;console.error('FAIL '+name+'\n'+error.stack);}
}
const valid={
 businessName:'Desert Valley Roofing LLC',
 ownerEmail:'Desk@desertvalleyroofing.example',
 officePhone:'(480) 555-0134',
 privacyUrl:'https://desertvalleyroofing.example/privacy',
 timezone:'America/Phoenix'
};
function make(x={}){return installer.compile(served,{...valid,...x});}
test('Versioned installer source exactly matches the canonical engine',()=>assert.equal(served,canonical));
test('Valid owner input generates a syntactically valid complete Apps Script',()=>{
 const out=make();new vm.Script(out);assert.match(out,/function installClientPilot\(/);assert.match(out,/function activateClientPilot\(/);
});
test('Configured business and notification email are exactly represented',()=>{
 const src=make();assert.match(src,/businessName: "Desert Valley Roofing LLC"/);
 assert.match(src,/ownerEmail: "desk@desertvalleyroofing.example"/);
});
test('TEST-only safety gate remains false and live mode is not enabled',()=>{
 const cfg=make().split('const RQR_CONFIG = Object.freeze({')[1].split('\n});')[0];
 assert.match(cfg,/clientApprovedLive: false/);assert.doesNotMatch(cfg,/clientApprovedLive: true/);
});
test('Phone, privacy URL and Phoenix time zone are preconfigured',()=>{
 const out=make();assert.match(out,/officePhone: "\(480\) 555-0134"/);
 assert.match(out,/privacyUrl: "https:\/\/desertvalleyroofing.example\/privacy"/);
 assert.match(out,/timezone: "America\/Phoenix"/);
});
test('Apostrophes and unusual strings do not break generated script',()=>{
 const out=make({businessName:"Smith's Roof Co; Logger.log('not-executed');"});
 new vm.Script(out);
 assert.match(out,/businessName: "Smith's Roof Co; Logger.log\('not-executed'\);"/);
});
test('Company name cannot be a demo placeholder',()=>assert.throws(()=>make({businessName:'INTERNAL DEMO'})));
test('Missing business name is rejected',()=>assert.throws(()=>make({businessName:''})));
test('Invalid monitored owner email is rejected',()=>assert.throws(()=>make({ownerEmail:'bad address'})));
test('Short office phone number is rejected',()=>assert.throws(()=>make({officePhone:'555-0134'})));
test('Non-HTTPS privacy notice is rejected',()=>assert.throws(()=>make({privacyUrl:'http://example.com/privacy'})));
test('Unsupported timezone is rejected',()=>assert.throws(()=>make({timezone:'Etc/GMT'})));
test('Unexpected installer source is rejected, not silently used',()=>assert.throws(()=>installer.compile('not an engine',valid)));
test('Prepared script never retains placeholder config values',()=>{
 const cfg=make().split('const RQR_CONFIG = Object.freeze({')[1].split('\n});')[0];
 assert.doesNotMatch(cfg,/REPLACE WITH|owner@example.com|https:\/\/example.com\/privacy/);
});
test('Operator page is not a password-collection tool',()=>{
 assert.match(operatorPage,/name="ownerEmail"/);
 assert.match(operatorPage,/name="privacyUrl"/);
 assert.doesNotMatch(operatorPage,/type="password"|name="password"/i);
 assert.match(operatorPage,/name="businessName"/);
 assert.match(operatorPage,/noindex,nofollow/);
});
test('Client intake uses the known browser-to-Formspree integration',()=>{
 assert.match(clientPage,/action="https:\/\/formspree.io\/f\/mvkaalrp"/);
 assert.match(clientPage,/name="request_type" value="client_pilot_onboarding"/);
 assert.match(clientPage,/name="authorized_representative"/);
 assert.doesNotMatch(clientPage,/name="_gotcha"/);
 assert.match(clientPage,/noindex,nofollow/);
});
test('Intake submission handles upstream failure instead of false success',()=>{
 assert.match(worker,/if\(response.ok\)/);assert.match(worker,/could not be confirmed/);
});
test('Existing Cloudflare CSP allows direct Formspree submission',()=>{
 assert.match(headers,/connect-src 'self' https:\/\/formspree.io/);
 assert.match(headers,/form-action 'self' https:\/\/formspree.io/);
});
test('Company onboarding data collection is described in privacy notice',()=>assert.match(privacy,/pilot-start/));
test('Installer navigation and template paths are present',()=>{
 assert.match(operatorPage,/\/onboarding\/installer.js/);
 assert.match(operatorPage,/\/onboarding\/onboarding.css/);
 assert.match(fs.readFileSync(path.join(root,'public/onboarding/installer.js'),'utf8'),/\/onboarding\/template.gs.txt/);
});
console.log('ONBOARDING TESTS: '+passed+'/'+total+' passed.');
if(total!==passed)process.exitCode=1;
