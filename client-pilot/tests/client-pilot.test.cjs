'use strict';
const assert = require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const crypto=require('node:crypto');
let script=fs.readFileSync(path.join(__dirname,'../apps-script/Code.gs'),'utf8');
let tests=0,passed=0;
function test(name,fn){tests++;try{fn();passed++;console.log('PASS '+name)}catch(e){console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}}
class Sheet{
  constructor(name){this.name=name;this.rows=[];this.dataValidation=null;this.width={};}
  getName(){return this.name;}setName(n){this.name=n;return this;}
  ensure(row){while(this.rows.length<row)this.rows.push([]);}
  getRange(a,b=1,c=1,d=1){
    if(typeof a==='string'){
      const parts=a.match(/^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/);
      if(!parts)throw Error('Bad mock A1: '+a);
      const col=letters=>[...letters].reduce((n,v)=>n*26+v.charCodeAt(0)-64,0);
      const r=Number(parts[2]),cc=col(parts[1]),rr=Number(parts[4]||parts[2]),last=col(parts[3]||parts[1]);
      return new Range(this,r,cc,rr-r+1,last-cc+1);
    }
    return new Range(this,a,b,c,d);
  }
  appendRow(values){this.rows.push(values.slice());return this;}
  getDataRange(){return new Range(this,1,1,Math.max(1,this.rows.length),Math.max(1,...this.rows.map(r=>r.length)));}
  getLastRow(){return this.rows.length;}getMaxRows(){return 1000;}
  setFrozenRows(){return this;}setColumnWidth(n,v){this.width[n]=v;return this;}
  setRowHeight(){return this;}
}
class Range{
  constructor(sheet,row,col,nrows=1,ncols=1){Object.assign(this,{sheet,row,col,nrows,ncols});}
  getValues(){return Array.from({length:this.nrows},(_,r)=>Array.from({length:this.ncols},(_,c)=>this.sheet.rows[this.row-1+r]?.[this.col-1+c]??''));}
  getValue(){return this.getValues()[0][0];}
  setValues(matrix){for(let i=0;i<matrix.length;i++)for(let j=0;j<matrix[i].length;j++){this.sheet.ensure(this.row+i);this.sheet.rows[this.row+i-1][this.col+j-1]=matrix[i][j];}return this;}
  setValue(value){this.sheet.ensure(this.row);this.sheet.rows[this.row-1][this.col-1]=value;return this;}
  setBackground(){return this;}setFontWeight(){return this;}setFontColor(){return this;}
  setDataValidation(){return this;}setNumberFormat(){return this;}createFilter(){return this;}
  merge(){return this;}getSheet(){return this.sheet;}
  getRow(){return this.row;}getColumn(){return this.col;}
  getLastRow(){return this.row+this.nrows-1;}
  getLastColumn(){return this.col+this.ncols-1;}
}
class Spread{
  constructor(n,idx){this.name=n;this.id='S-'+idx;this.sheets=[new Sheet('Sheet1')];this.timezone='';}
  getSheets(){return this.sheets;}getSheetByName(n){return this.sheets.find(s=>s.name===n);}
  getId(){return this.id;}getUrl(){return 'https://docs.google.com/spreadsheets/d/'+this.id+'/edit';}
  setSpreadsheetTimeZone(tz){this.timezone=tz;return this;}
  insertSheet(n){const s=new Sheet(n);this.sheets.push(s);return s;}
}
class Item{
  constructor(id){this.id=id;this.title='';}
  getId(){return this.id;}getTitle(){return this.title;}
  setTitle(t){this.title=t;return this;}
  setRequired(){return this;}setValidation(){return this;}setChoiceValues(){return this;}
}
class Form{
  constructor(id,name,published){this.id=id;this.name=name;this.published=published;this.items=[];this.responses=[];}
  getId(){return this.id;}getPublishedUrl(){return 'https://docs.google.com/forms/d/e/'+this.id+'/viewform';}
  setDescription(x){this.description=x;return this;}setConfirmationMessage(x){this.confirmation=x;return this;}
  addTextItem(){return this.item();}addParagraphTextItem(){return this.item();}addMultipleChoiceItem(){return this.item();}
  item(){const it=new Item(101+this.items.length);this.items.push(it);return it;}
  getResponses(){return this.responses;}
  fakeResponse(values,id='R1',at=new Date()){
    const lookup={};for(const [label,val] of Object.entries(values)){const item=this.items.find(x=>x.title===label);if(!item)throw Error('Unknown mock form item: '+label);lookup[String(item.id)]=val;}
    const response={getId:()=>id,getTimestamp:()=>at,getItemResponses:()=>Object.entries(lookup).map(([k,v])=>({getItem:()=>this.items.find(i=>String(i.id)===k),getResponse:()=>v}))};
    this.responses.push(response);return response;
  }
}
function setup(opts={}){
  const configScript=script.replace("businessName: 'REPLACE WITH ROOFING COMPANY NAME'","businessName: 'Desert Example Roofing'")
  .replace("ownerEmail: 'owner@example.com'","ownerEmail: 'owner@desert-example.test'")
  .replace("officePhone: 'REPLACE WITH COMPANY PHONE'","officePhone: '(480) 555-0198'")
  .replace("privacyUrl: 'https://example.com/privacy'","privacyUrl: 'https://desert-example.test/privacy'")
  .replace('clientApprovedLive: false', 'clientApprovedLive: '+Boolean(opts.approval))
  .replace('maxAutoLeadVolumePerDay: 20','maxAutoLeadVolumePerDay: '+(opts.maxDaily||20));
  const d={sheets:{},forms:{},mails:[],logger:[],quota:opts.quota??100,mailErrors:0,
    properties:{},triggers:[],uuid:0,scenarios:opts};
  const props={getProperty:k=>Object.hasOwn(d.properties,k)?d.properties[k]:null,
    setProperty:(k,v)=>{d.properties[k]=String(v);return props;},
    setProperties:o=>{Object.assign(d.properties,o);return props;}};
  const spreadsheet={
    create:n=>{const s=new Spread(n,Object.keys(d.sheets).length+1);d.sheets[s.id]=s;d.ss=s;return s;},
    openById:id=>{if(!d.sheets[id])throw Error('Unknown spread id');return d.sheets[id];},
    flush:()=>{},
    newDataValidation:()=>({requireValueInList(){return this},setAllowInvalid(){return this},build(){return {}}})
  };
  const forms={create:(n,published)=>{const f=new Form('F-'+(Object.keys(d.forms).length+1),n,Boolean(published));d.form=f;d.forms[f.id]=f;return f;},
    openById:id=>d.forms[id],createTextValidation:()=>({requireTextIsEmail(){return this},build(){return {}}})};
  const trigger={newTrigger:name=>{
    const t={forForm(){return this},onFormSubmit(){return this},forSpreadsheet(){return this},onEdit(){return this},
      timeBased(){return this},everyMinutes(){return this},everyWeeks(){return this},everyDays(){return this},
      onWeekDay(){return this},atHour(){return this},inTimezone(){return this},create(){d.triggers.push(name);return this}};
    return t;},
    getProjectTriggers:()=>d.triggers.map(t=>({getHandlerFunction:()=>t})),WeekDay:{MONDAY:'MONDAY'}};
  const c={console,Date,Math,JSON,Number,String,Boolean,Object,Array,RegExp,Set,Error,Logger:{log:m=>d.logger.push(m)},
    PropertiesService:{getScriptProperties:()=>props},SpreadsheetApp:spreadsheet,FormApp:forms,
    ScriptApp:trigger,
    LockService:{getScriptLock:()=>({waitLock(){},tryLock(){return true},releaseLock(){}})},
    MailApp:{getRemainingDailyQuota:()=>d.quota,sendEmail:o=>{if(d.mailErrors-->0)throw Error('Simulated uncertain provider outcome');if(d.quota<1)throw Error('Quota 0');d.mails.push(o);d.quota--;return undefined;}},
    Utilities:{getUuid:()=>`fixture-uuid-${++d.uuid}`,DigestAlgorithm:{SHA_256:'SHA_256'},
      computeDigest:(alg,v)=>[...crypto.createHash('sha256').update(v).digest()],
      formatDate:()=>new Date().toISOString().slice(0,10)}
  };
  vm.createContext(c);vm.runInContext(configScript,c);
  vm.runInContext(`this.api={installClientPilot,repairClientTriggers,onFormLead,onStaffStatusEdit,runOperations,sendWeeklyReport,dailyHealthCheck,
    activateClientPilot,pauseClientPilot,resumeClientPilot,rqrSystemStatus,anonymizeExpiredLeads,
    rqrIngest_,rqrSendReceipt_,rqrSendOwnerAlert_,rqrScanOwnerReminders_,rqrReminderEligible_,rqrEmailHash_,rqrIsSuppressed_,rqrNormalize_,rqrSheetText_,rqrValidateConfig_};`,c);
  if(!opts.noInstall)c.api.installClientPilot();
  const L=()=>d.ss.getSheetByName('Leads');
  const E=()=>d.ss.getSheetByName('Events');
  const S=()=>d.ss.getSheetByName('Suppressions');
  return {d,c,a:c.api,L,E,S};
}
function lead(id='FORM:R1',overrides={}){return {id,received:new Date(),name:'Test Customer',
  email:'customer@safe-example.test',phone:'(480) 555-0123',zip:'85260',
  service:'Roof inspection',notes:'Example note',source:'test',...overrides};}
function makeResponse(x,id='RESP-1',agoMs=0){return x.d.form.fakeResponse({
  Name:'Test Customer',Email:'customer@safe-example.test','Phone (optional)':'(480) 555-0123',
  'Property ZIP code':'85260','Roofing service':'Roof inspection',
  'Brief project description (optional)':'Example note'
},id,new Date(Date.now()-agoMs));}
function age(x,row=2,mins=60){
  x.L().rows[row-1][1]=new Date(Date.now()-mins*60000);
  if(x.L().rows[row-1][12] instanceof Date)
    x.L().rows[row-1][12]=new Date(Date.now()-mins*60000);
}
function mailTo(x){return x.d.mails.map(m=>m.to)}

test('Default configuration refuses installation with placeholders',()=>{const raw=setup({noInstall:true});const c=vm.createContext({...raw.c});vm.runInContext(script+'\nthis.rawInstall=installClientPilot;',c);assert.throws(()=>c.rawInstall(),/Configure company name/);});
test('Installs 4 sheets, headers, Google Form and 5 triggers',()=>{const x=setup();assert.deepEqual(x.d.ss.sheets.map(s=>s.name),['Leads','Events','Suppressions','Dashboard']);assert.equal(x.d.form.items.length,6);assert.equal(x.d.form.published,true);assert.equal(x.d.triggers.length,5);assert.equal(x.d.properties.RQR_MODE,'TEST');});
test('Dashboard references correct tracker status columns',()=>{const x=setup();assert.equal(x.d.ss.getSheetByName('Dashboard').rows[4][1],'=COUNTIF(Leads!I2:I,"New")');});
test('Trigger repairs do not duplicate existing handlers',()=>{const x=setup();x.a.repairClientTriggers();x.a.repairClientTriggers();assert.equal(x.d.triggers.length,5);});
test('Repair restores missing scheduled trigger',()=>{const x=setup();x.d.triggers=x.d.triggers.filter(x=>x!=='runOperations');x.a.repairClientTriggers();assert.equal(x.d.triggers.length,5);});
test('Install twice is rejected without duplicate spreadsheet',()=>{const x=setup();assert.throws(()=>x.a.installClientPilot(),/already exists/);assert.equal(Object.keys(x.d.sheets).length,1);});
test('TEST captures lead and sends alert plus owner-addressed sample receipt',()=>{const x=setup();const r=x.a.rqrIngest_(lead());assert.equal(r.ok,true);assert.equal(x.L().rows.length,2);assert.deepEqual(mailTo(x),['owner@desert-example.test','owner@desert-example.test']);assert.equal(x.L().rows[1][9],'SENT');assert.equal(x.L().rows[1][11],'SENT');});
test('Receipt is warm, actionable, and does not claim an appointment or timeline',()=>{const x=setup();x.a.rqrIngest_(lead());const body=x.d.mails[1].body;assert.match(body,/received your roofing request/i);assert.match(body,/get in touch to discuss the next step/i);assert.match(body,/urgent leak or safety concern/i);assert.doesNotMatch(body,/appointment.*scheduled|callback time.*scheduled|no inspection, appointment/i);});
test('Owner alert includes human action and sheet link',()=>{const x=setup();x.a.rqrIngest_(lead());assert.match(x.d.mails[0].body,/ACTION: Call or email/);assert.match(x.d.mails[0].body,/Private tracker:/);});
test('Duplicate lead ID never adds row or sends another email',()=>{const x=setup();x.a.rqrIngest_(lead());const r=x.a.rqrIngest_(lead());assert.equal(r.duplicate,true);assert.equal(x.L().rows.length,2);assert.equal(x.d.mails.length,2);});
test('Google form response event parses fields using immutable item IDs',()=>{const x=setup();const response=makeResponse(x,'Rform');x.a.onFormLead({response});assert.equal(x.L().rows[1][0],'FORM:Rform');assert.equal(x.L().rows[1][3],'customer@safe-example.test');});
test('Form recovery captures response missed by trigger',()=>{const x=setup();makeResponse(x,'RECOVERY');const out=x.a.runOperations();assert.equal(out.recovered,1);assert.equal(x.d.mails.length,2);});
test('Recovery of already captured response does not duplicate messages',()=>{const x=setup();const response=makeResponse(x,'ALREADY');x.a.onFormLead({response});x.a.runOperations();assert.equal(x.d.mails.length,2);});
test('Paused service keeps raw form responses for later reconciliation',()=>{const x=setup();x.a.pauseClientPilot();makeResponse(x,'PAUSED');assert.equal(x.a.runOperations().paused,true);assert.equal(x.L().rows.length,1);x.a.resumeClientPilot();assert.equal(x.a.runOperations().recovered,1);});
test('Stale recovered homeowner request not acknowledged after 12h',()=>{const x=setup();makeResponse(x,'STALE',30*3600000);const out=x.a.runOperations();assert.equal(out.recovered,1);assert.equal(x.L().rows[1][9],'STALE_REVIEW');assert.equal(x.d.mails.length,1);});
test('No go-live without client approval flag',()=>{const x=setup();assert.throws(()=>x.a.activateClientPilot(),/written client approval/);assert.equal(x.d.properties.RQR_MODE,'TEST');});
test('Approved go-live sends customer receipt to homeowner',()=>{const x=setup({approval:true});x.a.activateClientPilot();x.a.rqrIngest_(lead());assert.deepEqual(mailTo(x),['owner@desert-example.test','customer@safe-example.test']);});
test('Go-live cannot be repeated',()=>{const x=setup({approval:true});x.a.activateClientPilot();assert.throws(()=>x.a.activateClientPilot(),/only changes TEST to LIVE/);});
test('Invalid email rejects record before sending',()=>{const x=setup();assert.throws(()=>x.a.rqrIngest_(lead('FORM:INV',{email:'not-email'})),/missing a required field/);assert.equal(x.L().rows.length,1);});
test('Spreadsheet formula payload neutralized',()=>{const x=setup();x.a.rqrIngest_(lead('FORM:ESC',{name:'=IMPORTXML("x")',notes:'  =HYPERLINK("x")'}));assert.equal(x.L().rows[1][2],'\'=IMPORTXML("x")');assert.equal(x.L().rows[1][7],'\'=HYPERLINK("x")');});
test('Unknown MailApp outcome is not automatically retried',()=>{const x=setup();x.d.mailErrors=1;x.a.rqrIngest_(lead());assert.equal(x.L().rows[1][11],'UNKNOWN_REVIEW');const count=x.d.mails.length;x.a.rqrSendOwnerAlert_(2);assert.equal(x.d.mails.length,count);});
test('Quota exhaustion records unknown delivery and keeps lead',()=>{const x=setup({quota:0});x.a.rqrIngest_(lead());assert.equal(x.L().rows.length,2);assert.equal(x.L().rows[1][11],'UNKNOWN_REVIEW');assert.equal(x.L().rows[1][9],'UNKNOWN_REVIEW');assert.equal(x.d.mails.length,0);});
test('Daily automated lead cap retains incoming record for manual review',()=>{const x=setup({maxDaily:1});x.a.rqrIngest_(lead('FORM:1'));x.a.rqrIngest_(lead('FORM:2'));assert.equal(x.L().rows.length,3);assert.equal(x.L().rows[2][9],'NEEDS_REVIEW_CAP');});
test('Owner reminder not sent to homeowner, after 45min',()=>{const x=setup();x.a.rqrIngest_(lead());age(x);x.a.runOperations();assert.equal(x.d.mails.length,3);assert.equal(x.d.mails[2].to,'owner@desert-example.test');assert.match(x.d.mails[2].body,/homeowner receives no follow-up/);});
test('Early lead does not trigger reminder',()=>{const x=setup();x.a.rqrIngest_(lead());age(x,2,20);x.a.runOperations();assert.equal(x.d.mails.length,2);});
test('Contacted staff status blocks reminder',()=>{const x=setup();x.a.rqrIngest_(lead());age(x);x.L().getRange(2,9).setValue('Contacted');x.a.runOperations();assert.equal(x.d.mails.length,2);});
test('Booked status blocks reminders',()=>{const x=setup();x.a.rqrIngest_(lead());age(x);x.L().getRange(2,9).setValue('Booked');x.a.runOperations();assert.equal(x.d.mails.length,2);});
test('Owner can receive at most two reminders per lead',()=>{const x=setup();x.a.rqrIngest_(lead());age(x);x.a.runOperations();x.L().rows[1][15]=new Date(Date.now()-180*60000);x.a.runOperations();assert.equal(x.d.mails.length,4);x.a.runOperations();assert.equal(x.d.mails.length,4);});
test('Cannot repeat owner reminder before interval',()=>{const x=setup();x.a.rqrIngest_(lead());age(x);x.a.runOperations();x.a.runOperations();assert.equal(x.d.mails.length,3);});
test('Unknown reminder send never retries',()=>{const x=setup();x.a.rqrIngest_(lead());age(x);x.d.mailErrors=1;x.a.runOperations();assert.equal(x.L().rows[1][16],'UNKNOWN_REVIEW');x.a.runOperations();assert.equal(x.d.mails.length,2);});
test('Status edit stores a recorded-first-contact timestamp',()=>{const x=setup();x.a.rqrIngest_(lead());x.L().getRange(2,9).setValue('Contacted');x.a.onStaffStatusEdit({range:x.L().getRange(2,9)});assert.ok(x.L().rows[1][13] instanceof Date);});
test('Do not contact creates salted suppression entry',()=>{const x=setup();x.a.rqrIngest_(lead());x.L().getRange(2,9).setValue('Do not contact');x.a.onStaffStatusEdit({range:x.L().getRange(2,9)});assert.equal(x.S().rows.length,2);assert.doesNotMatch(x.S().rows[1][1],/@/);});
test('Future inquiry from suppressed email alerts owner but not customer',()=>{const x=setup({approval:true});x.a.activateClientPilot();x.a.rqrIngest_(lead('FORM:OLD'));x.L().getRange(2,9).setValue('Do not contact');x.a.onStaffStatusEdit({range:x.L().getRange(2,9)});const before=x.d.mails.length;x.a.rqrIngest_(lead('FORM:NEW'));assert.equal(x.d.mails.length,before+1);assert.equal(x.L().rows[2][9],'SUPPRESSED');});
test('Weekly report uses observed statuses not revenue estimate',()=>{const x=setup();x.a.rqrIngest_(lead());x.a.sendWeeklyReport();assert.match(x.d.mails.at(-1).body,/not proof of sales/);});
test('Health check warns about missing trigger',()=>{const x=setup();x.d.triggers=x.d.triggers.filter(x=>x!=='runOperations');x.a.dailyHealthCheck();assert.match(x.d.mails.at(-1).body,/Missing trigger: runOperations/);});
test('Health warning suppressed when same signature repeats same day',()=>{const x=setup();x.d.triggers=[];x.a.dailyHealthCheck();const n=x.d.mails.length;x.a.dailyHealthCheck();assert.equal(x.d.mails.length,n);});
test('Anonymization is manual, retains counts/IDs and clears PII',()=>{const x=setup();x.a.rqrIngest_(lead());age(x,2,100*1440);assert.equal(x.a.anonymizeExpiredLeads(),1);assert.equal(x.L().rows[1][2],'[anonymized]');assert.equal(x.L().rows[1][3],'');assert.equal(x.L().rows[1][7],'');assert.equal(x.L().rows[1][0],'FORM:R1');});
test('Fresh lead is not anonymized early',()=>{const x=setup();x.a.rqrIngest_(lead());assert.equal(x.a.anonymizeExpiredLeads(),0);});
test('Run status provides live mode and missing trigger info',()=>{const x=setup();const s=x.a.rqrSystemStatus();assert.equal(s.mode,'TEST');assert.equal(s.missingTriggers.length,0);assert.match(s.formUrl,/forms/);});
test('No homeowner reminder method or webhook endpoint exists in pilot',()=>{assert.doesNotMatch(script,/function\s+(runFollowUps|doPost|doGet)\s*\(/);});
test('Form item names are not used for response extraction after setup',()=>{assert.match(script,/getItem\(\)\.getId\(\)/);});
test('Raw email not written to suppression tab',()=>{const x=setup();x.a.rqrIngest_(lead());x.L().getRange(2,9).setValue('Do not contact');x.a.onStaffStatusEdit({range:x.L().getRange(2,9)});assert.doesNotMatch(JSON.stringify(x.S().rows),/customer@safe-example/);});


test('Repeated emergency pause leaves original mode recoverable',()=>{const x=setup({approval:true});x.a.activateClientPilot();x.a.pauseClientPilot();x.a.pauseClientPilot();x.a.resumeClientPilot();assert.equal(x.a.rqrSystemStatus().mode,'LIVE');});
test('Email-like spreadsheet formulas are rejected before ingestion',()=>{const x=setup();assert.throws(()=>x.a.rqrIngest_(lead('FORM:BADFORMULA',{email:'=evil@example.test'})),/missing a required field/);});
test('Recovery incident does not block subsequent valid responses',()=>{const x=setup();x.d.form.fakeResponse({Name:'Incomplete'},'CORRUPT');makeResponse(x,'VALID');const r=x.a.runOperations();assert.equal(r.recovered,1);assert.equal(x.L().rows.length,2);});
test('Recovered stale inquiry does not simultaneously create duplicate owner reminders',()=>{const x=setup();makeResponse(x,'STALE2',30*3600000);x.a.runOperations();assert.equal(x.d.mails.length,1);});
console.log(`\n${passed}/${tests} tests passed`);if(tests!==passed)process.exitCode=1;
