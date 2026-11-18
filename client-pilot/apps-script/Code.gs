/**
 * ROOFQUOTE RELAY — Client Pilot Engine 1.0
 * Google Forms + Sheets + Apps Script + MailApp, single roofing company per install.
 *
 * Installation account belongs to the roofing company. No central lead database.
 * TEST is the default; real homeowner emails are sent only after explicit go-live.
 * No SMS, auto-booking, or unsolicited homeowner follow-up.
 *
 * Repository contains no customer data, secrets, or client configuration.
 */

const RQR_CONFIG = Object.freeze({
  businessName: 'REPLACE WITH ROOFING COMPANY NAME',
  ownerEmail: 'owner@example.com',
  officePhone: 'REPLACE WITH COMPANY PHONE',
  privacyUrl: 'https://example.com/privacy',
  timezone: 'America/Phoenix',
  clientApprovedLive: false,            // only change after written approval & testing
  ownerReminderAfterMinutes: 45,
  repeatReminderAfterMinutes: 120,
  maxOwnerReminders: 2,
  scanEveryMinutes: 15,
  maxActiveLeadAgeDays: 7,
  maxAutoLeadVolumePerDay: 20,           // conservative consumer-account baseline; review quotas per client
  staleAcknowledgmentHours: 12,
  reconcileScanLimit: 500,
  maxRemindersPerRun: 15,
  retentionDays: 90                    // anonymization is a separate MANUAL function
});

const RQR_TAB = Object.freeze({
  LEADS: 'Leads', DASH: 'Dashboard', EVENTS: 'Events', SUPPRESS: 'Suppressions'
});
const RQR_C = Object.freeze({
  ID:1, RECEIVED:2, NAME:3, EMAIL:4, PHONE:5, ZIP:6, SERVICE:7, NOTES:8,
  STATUS:9, ACK:10, ACK_AT:11, ALERT:12, ALERT_AT:13, CONTACT_AT:14,
  REMINDER_COUNT:15, REMINDER_AT:16, REMINDER_STATE:17, ERROR:18, UPDATED:19,
  SOURCE:20
});
const RQR_HEADERS = Object.freeze([
  'Lead ID','Received at','Name','Email','Phone','ZIP','Service','Project notes',
  'Staff status','Customer acknowledgment','Acknowledgment at','Owner alert',
  'Owner alert at','First staff status change at','Reminder attempts',
  'Last reminder attempted at','Reminder delivery state','Error requiring review',
  'Updated at','Source'
]);
const RQR_STATUSES = Object.freeze([
  'New','Contacted','Booked','Closed - Won','Closed - Lost','Do not contact'
]);
const RQR_SERVICE_TYPES = Object.freeze([
  'Roof inspection','Leak assessment','Repair','Replacement','Storm damage','Other'
]);
const RQR_LABELS = Object.freeze({
  name:'Name', email:'Email', phone:'Phone (optional)', zip:'Property ZIP code',
  service:'Roofing service', notes:'Brief project description (optional)'
});
const RQR_REQUIRED_HANDLERS = Object.freeze([
  'onFormLead','onStaffStatusEdit','runOperations','sendWeeklyReport','dailyHealthCheck'
]);

/** Run ONCE inside the roofing company's authorized Google Apps Script account. */
function installClientPilot() {
  rqrValidateConfig_(false);
  const p = rqrProps_();
  if (p.getProperty('RQR_SHEET_ID')) {
    throw new Error('An installation already exists. Use repairClientTriggers, not a second installation.');
  }
  const ss = SpreadsheetApp.create(RQR_CONFIG.businessName + ' | RoofQuote Relay pilot');
  ss.setSpreadsheetTimeZone(RQR_CONFIG.timezone);
  const leads = ss.getSheets()[0]; leads.setName(RQR_TAB.LEADS);
  leads.getRange(1,1,1,RQR_HEADERS.length).setValues([RQR_HEADERS]);
  rqrStyleHeaders_(leads,RQR_HEADERS.length);
  const editableRows=Math.max(1,leads.getMaxRows()-1);
  leads.getRange(2,RQR_C.STATUS,editableRows,1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(RQR_STATUSES,true)
      .setAllowInvalid(false).build());
  leads.getRange(2,RQR_C.RECEIVED,editableRows,1).setNumberFormat('yyyy-mm-dd hh:mm');
  leads.setColumnWidth(RQR_C.NAME,160);
  leads.setColumnWidth(RQR_C.EMAIL,240);
  leads.setColumnWidth(RQR_C.NOTES,320);
  leads.setColumnWidth(RQR_C.STATUS,150);
  leads.getRange(1,1,leads.getMaxRows(),RQR_HEADERS.length).createFilter();

  const events=ss.insertSheet(RQR_TAB.EVENTS);
  events.appendRow(['When','Event','Lead ID','Operational detail — no customer PII']);
  rqrStyleHeaders_(events,4);
  const suppress=ss.insertSheet(RQR_TAB.SUPPRESS);
  suppress.appendRow(['When','Salted email hash','Reason']);
  rqrStyleHeaders_(suppress,3);
  const dash=ss.insertSheet(RQR_TAB.DASH);
  rqrBuildDashboard_(dash);

  const form=FormApp.create(RQR_CONFIG.businessName + ' | Request a roof estimate');
  form.setDescription(
    'Non-emergency request only. Submitting this form does not book an appointment. ' +
    'If you need urgent assistance, call ' + RQR_CONFIG.officePhone + '. ' +
    'Your details are reviewed by ' + RQR_CONFIG.businessName + '. Privacy: ' +
    RQR_CONFIG.privacyUrl);
  form.setConfirmationMessage(
    'We received your request. Our team will review it. No inspection or callback time is booked yet. ' +
    'For emergencies, call ' + RQR_CONFIG.officePhone + '.');
  const itemIds={};
  itemIds.name=form.addTextItem().setTitle(RQR_LABELS.name).setRequired(true).getId();
  itemIds.email=form.addTextItem().setTitle(RQR_LABELS.email).setRequired(true)
    .setValidation(FormApp.createTextValidation().requireTextIsEmail().build()).getId();
  itemIds.phone=form.addTextItem().setTitle(RQR_LABELS.phone).setRequired(false).getId();
  itemIds.zip=form.addTextItem().setTitle(RQR_LABELS.zip).setRequired(true).getId();
  itemIds.service=form.addMultipleChoiceItem().setTitle(RQR_LABELS.service)
    .setChoiceValues(RQR_SERVICE_TYPES).setRequired(true).getId();
  itemIds.notes=form.addParagraphTextItem().setTitle(RQR_LABELS.notes).setRequired(false).getId();

  p.setProperties({
    RQR_SHEET_ID:ss.getId(), RQR_FORM_ID:form.getId(),
    RQR_FORM_ITEMS:JSON.stringify(itemIds), RQR_MODE:'TEST',
    RQR_INSTALL_VERSION:'1.0', RQR_SUPPRESSION_SALT:Utilities.getUuid(),
    RQR_CREATED_AT:new Date().toISOString()
  });
  repairClientTriggers();
  rqrEvent_('INSTALLED','','TEST mode; form and tracker created');
  Logger.log('ROOFQUOTE RELAY / TEST MODE ONLY');
  Logger.log('PRIVATE TRACKER: '+ss.getUrl());
  Logger.log('CUSTOMER FORM: '+form.getPublishedUrl());
  Logger.log('No homeowner mail will be sent until activateClientPilot passes approval checks.');
  return {mode:'TEST',trackerUrl:ss.getUrl(),formUrl:form.getPublishedUrl()};
}

function rqrStyleHeaders_(sheet,cols){
  sheet.setFrozenRows(1);
  sheet.getRange(1,1,1,cols).setBackground('#17382f').setFontColor('#ffffff')
    .setFontWeight('bold');
  sheet.setRowHeight(1,36);
}
function rqrBuildDashboard_(sheet){
  sheet.getRange('A1:B1').merge().setValue('ROOFQUOTE RELAY | LIVE INQUIRY DESK')
    .setBackground('#17382f').setFontColor('#ffffff').setFontWeight('bold');
  sheet.getRange('A3:B10').setValues([
    ['Metric','Current count'],
    ['Total recorded inquiries','=COUNTA(Leads!A2:A)'],
    ['Waiting for contact','=COUNTIF(Leads!I2:I,"New")'],
    ['Contacted','=COUNTIF(Leads!I2:I,"Contacted")'],
    ['Booked','=COUNTIF(Leads!I2:I,"Booked")'],
    ['Closed won','=COUNTIF(Leads!I2:I,"Closed - Won")'],
    ['Closed lost','=COUNTIF(Leads!I2:I,"Closed - Lost")'],
    ['Do not contact','=COUNTIF(Leads!I2:I,"Do not contact")']
  ]);
  sheet.getRange('A3:B3').setBackground('#dceae2').setFontWeight('bold');
  sheet.getRange('A12').setValue('Staff update lead statuses on the Leads tab. Counts are not booked revenue.');
  sheet.setColumnWidth(1,410);sheet.setColumnWidth(2,180);
}

/** Safe and idempotent: recreates missing triggers but never duplicates a handler. */
function repairClientTriggers(){
  rqrRequireInstalled_();
  const current=ScriptApp.getProjectTriggers().map(t=>t.getHandlerFunction());
  const form=FormApp.openById(rqrProps_().getProperty('RQR_FORM_ID'));
  const sheet=SpreadsheetApp.openById(rqrProps_().getProperty('RQR_SHEET_ID'));
  if(current.indexOf('onFormLead')<0)
    ScriptApp.newTrigger('onFormLead').forForm(form).onFormSubmit().create();
  if(current.indexOf('onStaffStatusEdit')<0)
    ScriptApp.newTrigger('onStaffStatusEdit').forSpreadsheet(sheet).onEdit().create();
  if(current.indexOf('runOperations')<0)
    ScriptApp.newTrigger('runOperations').timeBased()
      .everyMinutes(RQR_CONFIG.scanEveryMinutes).create();
  if(current.indexOf('sendWeeklyReport')<0)
    ScriptApp.newTrigger('sendWeeklyReport').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY)
      .atHour(9).everyWeeks(1).inTimezone(RQR_CONFIG.timezone).create();
  if(current.indexOf('dailyHealthCheck')<0)
    ScriptApp.newTrigger('dailyHealthCheck').timeBased().everyDays(1)
      .atHour(8).inTimezone(RQR_CONFIG.timezone).create();
  return rqrSystemStatus();
}

/** Installable Google Forms trigger. Trigger owner authorizes all services. */
function onFormLead(event){
  if(!event || !event.response)throw new Error('Submit the Google Form; do not run this handler manually.');
  return rqrProcessResponse_(event.response,'Google Form trigger');
}
function rqrProcessResponse_(response,source){
  const itemIds=JSON.parse(rqrProps_().getProperty('RQR_FORM_ITEMS')||'{}');
  const values={};
  response.getItemResponses().forEach(ir=>{values[String(ir.getItem().getId())]=ir.getResponse();});
  const input={
    id:'FORM:'+String(response.getId()),
    received:response.getTimestamp()||new Date(),
    name:values[String(itemIds.name)], email:values[String(itemIds.email)],
    phone:values[String(itemIds.phone)], zip:values[String(itemIds.zip)],
    service:values[String(itemIds.service)], notes:values[String(itemIds.notes)], source
  };
  return rqrIngest_(input);
}

function rqrIngest_(raw){
  rqrRequireInstalled_();
  const mode=rqrMode_();
  if(mode==='PAUSED')return {ok:false,reason:'Processing paused; Google Forms still retains the source response'};
  const lead=rqrNormalize_(raw);
  if(!lead.id || !lead.email || !lead.name || !lead.zip || !lead.service)
    throw new Error('Source response missing a required field. Review the Form responses safely.');
  let rowNum,cap=false;
  const lock=LockService.getScriptLock();lock.waitLock(25000);
  try{
    const sheet=rqrLeads_();
    const existing=rqrFindRow_(sheet,lead.id);
    if(existing>0)return {ok:true,duplicate:true,row:existing};
    cap=rqrTodayCount_(sheet)>=RQR_CONFIG.maxAutoLeadVolumePerDay;
    const suppressed=rqrIsSuppressed_(lead.email);
    const received=lead.received;
    const tooOld=Date.now()-received.getTime()>RQR_CONFIG.staleAcknowledgmentHours*3600000;
    const acknowledgment=suppressed?'SUPPRESSED':cap?'NEEDS_REVIEW_CAP':tooOld?'STALE_REVIEW':'PENDING';
    const alert=cap?'NEEDS_REVIEW_CAP':'PENDING';
    const status=suppressed?'Do not contact':'New';
    sheet.appendRow([lead.id,received,rqrSheetText_(lead.name),rqrSheetText_(lead.email),
      rqrSheetText_(lead.phone),rqrSheetText_(lead.zip),rqrSheetText_(lead.service),
      rqrSheetText_(lead.notes),status,acknowledgment,'',alert,'','',0,'','NONE','',new Date(),
      rqrSheetText_(lead.source)]);
    rowNum=sheet.getLastRow();
    rqrEvent_('LEAD_CAPTURED',lead.id,cap?'Daily mail cap reached; manual attention required':lead.source);
  }finally{lock.releaseLock();}
  // Prioritize alerting a human before spending quota on homeowner acknowledgment.
  if(!cap){rqrSendOwnerAlert_(rowNum);rqrSendReceipt_(rowNum);}
  else rqrNotifyCapacityOnce_();
  return {ok:true,row:rowNum,cap};
}

function rqrSendOwnerAlert_(row){
  const record=rqrRow_(row);
  if(record[RQR_C.ALERT-1]!=='PENDING')return false;
  if(!rqrClaimCell_(row,RQR_C.ALERT,'PENDING','ATTEMPTED_UNKNOWN'))return false;
  const r=rqrRow_(row),mode=rqrMode_();
  const subject=(mode==='TEST'?'[TEST] ':'')+'New roofing estimate inquiry | '+r[RQR_C.SERVICE-1];
  const body=[mode==='TEST'?'TEST MODE — not a live customer installation.':'NEW INQUIRY — a person must handle this.',
    'Lead ID: '+r[RQR_C.ID-1],
    'Name: '+r[RQR_C.NAME-1],
    'Email: '+r[RQR_C.EMAIL-1],
    'Phone: '+(r[RQR_C.PHONE-1]||'Not supplied'),
    'ZIP: '+r[RQR_C.ZIP-1],
    'Service: '+r[RQR_C.SERVICE-1],
    'Notes: '+(r[RQR_C.NOTES-1]||'None'),
    'Record status: '+r[RQR_C.STATUS-1],
    'Private tracker: '+rqrSpreadsheet_().getUrl(),
    'ACTION: Call or email the homeowner; update Staff status in Leads. No appointment has been booked.'
  ].join('\n');
  return rqrAttemptMail_(row,RQR_C.ALERT,RQR_C.ALERT_AT,
    {to:RQR_CONFIG.ownerEmail,subject,body},'OWNER_ALERT');
}

function rqrSendReceipt_(row){
  const rec=rqrRow_(row);
  if(rec[RQR_C.ACK-1]!=='PENDING')return false;
  if(!rqrClaimCell_(row,RQR_C.ACK,'PENDING','ATTEMPTED_UNKNOWN'))return false;
  const r=rqrRow_(row),mode=rqrMode_();
  const actualEmail=String(r[RQR_C.EMAIL-1]);
  const subject=(mode==='TEST'?'[TEST: NOT SENT TO HOMEOWNER] ':'')+
    'We received your roofing request | '+RQR_CONFIG.businessName;
  const greeting=rqrFirstName_(r[RQR_C.NAME-1]);
  const body=[mode==='TEST'?'TEST MESSAGE: In LIVE mode this receipt would go to '+actualEmail+'.':'',
    'Hello '+greeting+',',
    'Thanks for contacting '+RQR_CONFIG.businessName+'. We received your roofing request and our team will review it.',
    'This message confirms receipt only; no inspection, appointment, or callback time has been scheduled.',
    'If you have an urgent leak or safety problem, please call '+RQR_CONFIG.officePhone+' directly.',
    'To stop further automated email, reply to this message and tell our team. Staff can mark your request Do not contact.',
    RQR_CONFIG.businessName,
    'Reference: '+r[RQR_C.ID-1]
  ].filter(Boolean).join('\n\n');
  return rqrAttemptMail_(row,RQR_C.ACK,RQR_C.ACK_AT,{
    to:mode==='TEST'?RQR_CONFIG.ownerEmail:actualEmail,
    subject,body,name:RQR_CONFIG.businessName,replyTo:RQR_CONFIG.ownerEmail
  },'ACKNOWLEDGMENT');
}

function rqrClaimCell_(row,col,expected,replacement){
  const lock=LockService.getScriptLock();lock.waitLock(25000);
  try{
    const cell=rqrLeads_().getRange(row,col);
    if(String(cell.getValue())!==expected)return false;
    cell.setValue(replacement);
    SpreadsheetApp.flush();
    return true;
  }finally{lock.releaseLock();}
}
function rqrAttemptMail_(row,col,atCol,options,eventType){
  const s=rqrLeads_();
  try{
    if(MailApp.getRemainingDailyQuota()<1)throw new Error('Daily mail-recipient quota exhausted');
    MailApp.sendEmail(options);
    s.getRange(row,col).setValue('SENT');
    s.getRange(row,atCol).setValue(new Date());
    s.getRange(row,RQR_C.UPDATED).setValue(new Date());
    rqrEvent_(eventType+'_SENT',String(s.getRange(row,RQR_C.ID).getValue()),'MailApp accepted send; delivery not guaranteed');
    return true;
  }catch(error){
    s.getRange(row,col).setValue('UNKNOWN_REVIEW');
    rqrCaptureError_(row,eventType+'_UNKNOWN',error);
    // Never auto-retry ambiguous sends; prevent duplicate customer messages.
    return false;
  }
}

/** An edit trigger time-stamps staff updates and records privacy suppression. */
function onStaffStatusEdit(event){
  if(!event || !event.range)return;
  const range=event.range,sheet=range.getSheet();
  if(sheet.getName()!==RQR_TAB.LEADS||range.getColumn()>RQR_C.STATUS||
     range.getLastColumn()<RQR_C.STATUS||range.getLastRow()<2)return;
  for(let row=Math.max(2,range.getRow());row<=Math.min(range.getLastRow(),sheet.getLastRow());row++){
    const status=String(sheet.getRange(row,RQR_C.STATUS).getValue());
    if(RQR_STATUSES.indexOf(status)<0)continue;
    if(status!=='New'&&!sheet.getRange(row,RQR_C.CONTACT_AT).getValue())
      sheet.getRange(row,RQR_C.CONTACT_AT).setValue(new Date());
    if(status==='Do not contact'){
      const email=String(sheet.getRange(row,RQR_C.EMAIL).getValue());
      if(email)rqrSuppress_(email,'Staff status edit');
    }
    sheet.getRange(row,RQR_C.UPDATED).setValue(new Date());
    rqrEvent_('STATUS_RECORDED',String(sheet.getRange(row,RQR_C.ID).getValue()),status);
  }
}

/** Every 15min: recover missed form events, then remind owner about unanswered leads. */
function runOperations(){
  rqrRequireInstalled_();
  if(rqrMode_()==='PAUSED')return {paused:true};
  const recovered=rqrReconcileFormResponses_();
  const reminders=rqrScanOwnerReminders_();
  return {recovered,reminders};
}

function rqrReconcileFormResponses_(){
  const form=FormApp.openById(rqrProps_().getProperty('RQR_FORM_ID'));
  const responses=form.getResponses();
  if(responses.length>RQR_CONFIG.reconcileScanLimit)
    rqrEvent_('RECONCILE_LIMIT','','Only most recent '+RQR_CONFIG.reconcileScanLimit+' responses checked');
  const items=responses.slice(-RQR_CONFIG.reconcileScanLimit);
  const existing=new Set(rqrLeads_().getDataRange().getValues().slice(1).map(r=>String(r[0])));
  let recovered=0;
  for(let i=0;i<items.length&&recovered<20;i++){
    const id='FORM:'+String(items[i].getId());
    if(existing.has(id))continue;
    try {
      const outcome=rqrProcessResponse_(items[i],'Google Form recovery');
      if(outcome.ok&&!outcome.duplicate){recovered++;existing.add(id);}
    } catch(error) {
      // A malformed response must not prevent recovery of other requests.
      // Avoid repeatedly logging customer data or the same incident on every scan.
      const today=Utilities.formatDate(new Date(),RQR_CONFIG.timezone,'yyyy-MM-dd');
      const key=today+'|'+id;
      if(rqrProps_().getProperty('RQR_LAST_RECOVERY_ERROR')!==key){
        rqrEvent_('RECOVERY_ERROR',id,'Review source response and script execution');
        rqrProps_().setProperty('RQR_LAST_RECOVERY_ERROR',key);
      }
    }
  }
  return recovered;
}

function rqrScanOwnerReminders_(){
  const s=rqrLeads_(),count=s.getLastRow(),now=Date.now();
  if(count<2)return 0;
  let sent=0;
  const start=Math.max(2,count-RQR_CONFIG.reconcileScanLimit+1);
  for(let row=start;row<=count && sent<RQR_CONFIG.maxRemindersPerRun;row++){
    const r=rqrRow_(row);
    if(!rqrReminderEligible_(r,now))continue;
    const lock=LockService.getScriptLock();
    if(!lock.tryLock(1000))continue;
    let claimed=false,n=0;
    try{
      const check=rqrRow_(row);
      if(!rqrReminderEligible_(check,Date.now()))continue;
      n=Number(check[RQR_C.REMINDER_COUNT-1]||0)+1;
      s.getRange(row,RQR_C.REMINDER_COUNT).setValue(n);
      s.getRange(row,RQR_C.REMINDER_AT).setValue(new Date());
      s.getRange(row,RQR_C.REMINDER_STATE).setValue('ATTEMPTED_UNKNOWN');
      SpreadsheetApp.flush();
      claimed=true;
    }finally{lock.releaseLock();}
    if(!claimed)continue;
    try{
      if(MailApp.getRemainingDailyQuota()<1)throw new Error('Daily mail-recipient quota exhausted');
      const current=rqrRow_(row);
      MailApp.sendEmail({to:RQR_CONFIG.ownerEmail,
        subject:(rqrMode_()==='TEST'?'[TEST] ':'')+'FOLLOW UP NEEDED | '+current[RQR_C.SERVICE-1],
        body:'This inquiry is still marked New. A human should contact the customer and update the tracker.\n\n'+
          'Lead ID: '+current[RQR_C.ID-1]+'\nReceived: '+current[RQR_C.RECEIVED-1]+
          '\nName: '+current[RQR_C.NAME-1]+'\nEmail: '+current[RQR_C.EMAIL-1]+
          '\nPhone: '+(current[RQR_C.PHONE-1]||'Not provided')+
          '\nTracker: '+rqrSpreadsheet_().getUrl()+'\n\nReminder attempt '+n+' of '+RQR_CONFIG.maxOwnerReminders+'.\n'+
          'This is a staff reminder. The homeowner receives no follow-up from this system.'});
      s.getRange(row,RQR_C.REMINDER_STATE).setValue('SENT');
      rqrEvent_('OWNER_REMINDER_SENT',String(current[RQR_C.ID-1]),'Attempt '+n);
      sent++;
    }catch(error){
      s.getRange(row,RQR_C.REMINDER_STATE).setValue('UNKNOWN_REVIEW');
      rqrCaptureError_(row,'REMINDER_UNKNOWN',error);
    }
  }
  return sent;
}
function rqrReminderEligible_(r,now){
  if(String(r[RQR_C.STATUS-1])!=='New')return false;
  const received=r[RQR_C.RECEIVED-1] instanceof Date?r[RQR_C.RECEIVED-1].getTime():0;
  if(!received||now-received>RQR_CONFIG.maxActiveLeadAgeDays*86400000)return false;
  const n=Number(r[RQR_C.REMINDER_COUNT-1]||0);
  if(n>=RQR_CONFIG.maxOwnerReminders)return false;
  const priorState=String(r[RQR_C.REMINDER_STATE-1]);
  if(priorState!=='NONE'&&priorState!=='SENT')return false;
  if(n===0){
    const alerted=r[RQR_C.ALERT_AT-1] instanceof Date?r[RQR_C.ALERT_AT-1].getTime():0;
    // A response recovered after an outage should not generate an owner alert
    // and overdue reminder back-to-back in the same execution.
    return now-received>=RQR_CONFIG.ownerReminderAfterMinutes*60000 &&
      (!alerted||now-alerted>=RQR_CONFIG.ownerReminderAfterMinutes*60000);
  }
  const prior=r[RQR_C.REMINDER_AT-1] instanceof Date?r[RQR_C.REMINDER_AT-1].getTime():0;
  return prior>0&&now-prior>=RQR_CONFIG.repeatReminderAfterMinutes*60000;
}

function sendWeeklyReport(){
  if(!rqrProps_().getProperty('RQR_SHEET_ID')||rqrMode_()==='PAUSED')return;
  const data=rqrLeads_().getDataRange().getValues().slice(1),cutoff=Date.now()-7*86400000;
  const subset=data.filter(r=>r[RQR_C.RECEIVED-1] instanceof Date&&r[RQR_C.RECEIVED-1].getTime()>=cutoff);
  const counts={};RQR_STATUSES.forEach(x=>{counts[x]=0;});
  subset.forEach(r=>{if(counts.hasOwnProperty(r[RQR_C.STATUS-1]))counts[r[RQR_C.STATUS-1]]++;});
  const uncertain=data.filter(r=>String(r[RQR_C.ACK-1]).includes('UNKNOWN')||
    String(r[RQR_C.ALERT-1]).includes('UNKNOWN')||
    String(r[RQR_C.REMINDER_STATE-1]).includes('UNKNOWN')||String(r[RQR_C.ERROR-1])).length;
  const report=['Past seven days — recorded intake and latest staff statuses',
    'Inquiries: '+subset.length,
    ...RQR_STATUSES.map(s=>s+': '+counts[s]),
    'Rows with delivery/check concerns (all time): '+uncertain,
    'Private tracker: '+rqrSpreadsheet_().getUrl(),
    'These are logged statuses, not proof of sales, callbacks completed, or revenue.'];
  if(MailApp.getRemainingDailyQuota()>0)
    MailApp.sendEmail({to:RQR_CONFIG.ownerEmail,
      subject:(rqrMode_()==='TEST'?'[TEST] ':'')+RQR_CONFIG.businessName+' | Weekly RoofQuote Relay report',
      body:report.join('\n')});
}

function dailyHealthCheck(){
  if(!rqrProps_().getProperty('RQR_SHEET_ID'))return;
  const triggers=ScriptApp.getProjectTriggers().map(t=>t.getHandlerFunction());
  const issues=[];
  RQR_REQUIRED_HANDLERS.forEach(h=>{if(triggers.indexOf(h)<0)issues.push('Missing trigger: '+h);});
  const quota=MailApp.getRemainingDailyQuota();
  if(quota<5)issues.push('Google MailApp recipient quota low: '+quota);
  const data=rqrLeads_().getDataRange().getValues().slice(1);
  const errors=data.filter(r=>String(r[RQR_C.ERROR-1])||
    String(r[RQR_C.ACK-1]).includes('UNKNOWN')||String(r[RQR_C.ALERT-1]).includes('UNKNOWN')||
    String(r[RQR_C.REMINDER_STATE-1]).includes('UNKNOWN')).length;
  if(errors)issues.push('Rows needing attention: '+errors);
  const limited=data.filter(r=>r[RQR_C.ACK-1]==='NEEDS_REVIEW_CAP').length;
  if(limited)issues.push('Rows held by intake cap: '+limited);
  if(issues.length){
    const p=rqrProps_(),today=Utilities.formatDate(new Date(),RQR_CONFIG.timezone,'yyyy-MM-dd');
    const stamp=today+'|'+issues.join('|');
    if(p.getProperty('RQR_LAST_HEALTH_ALERT')!==stamp){
      rqrEvent_('HEALTH_WARNING','',issues.join(' | '));
      if(MailApp.getRemainingDailyQuota()>0){
        try{MailApp.sendEmail({to:RQR_CONFIG.ownerEmail,
          subject:'RoofQuote Relay | Action required',body:issues.join('\n')+'\nTracker: '+rqrSpreadsheet_().getUrl()});
          p.setProperty('RQR_LAST_HEALTH_ALERT',stamp);
        }catch(error){Logger.log('Health email failed: '+rqrError_(error));}
      }
    }
  }
}

/** Operator-only function; does not send any homeowner follow-ups. */
function activateClientPilot(){
  rqrRequireInstalled_();rqrValidateConfig_(true);
  if(rqrMode_()!=='TEST')throw new Error('This function only changes TEST to LIVE.');
  rqrProps_().setProperty('RQR_MODE','LIVE');
  rqrEvent_('LIVE_ENABLED','','Owner confirmed written live processing approval');
  return rqrSystemStatus();
}
function pauseClientPilot(){rqrRequireInstalled_();if(rqrMode_()==='PAUSED')return;
  rqrProps_().setProperty('RQR_PRE_PAUSE_MODE',rqrMode_());
  rqrProps_().setProperty('RQR_MODE','PAUSED');rqrEvent_('PAUSED','','Operations suspended; Google Form retains submissions');}
function resumeClientPilot(){rqrRequireInstalled_();
  if(rqrMode_()!=='PAUSED')throw new Error('Not paused.');
  const previous=rqrProps_().getProperty('RQR_PRE_PAUSE_MODE')||'TEST';
  if(previous==='LIVE')rqrValidateConfig_(true);
  rqrProps_().setProperty('RQR_MODE',previous);rqrEvent_('RESUMED','','Resumed '+previous+' mode');}
function rqrSystemStatus(){
  if(!rqrProps_().getProperty('RQR_SHEET_ID'))return {installed:false};
  const triggers=ScriptApp.getProjectTriggers().map(t=>t.getHandlerFunction());
  const state={installed:true,mode:rqrMode_(),businessName:RQR_CONFIG.businessName,
    formUrl:FormApp.openById(rqrProps_().getProperty('RQR_FORM_ID')).getPublishedUrl(),
    privateTrackerUrl:rqrSpreadsheet_().getUrl(),triggerHandlers:triggers,
    missingTriggers:RQR_REQUIRED_HANDLERS.filter(h=>triggers.indexOf(h)<0),
    remainingMailRecipientsToday:MailApp.getRemainingDailyQuota()};
  Logger.log(JSON.stringify(state));return state;
}

/** Manual/privacy-controlled; does not delete historical event counts. */
function anonymizeExpiredLeads(){
  rqrRequireInstalled_();
  // This is intentionally never scheduled automatically before a client approves retention.
  const cutoff=Date.now()-RQR_CONFIG.retentionDays*86400000,s=rqrLeads_();let cleared=0;
  for(let row=2;row<=s.getLastRow();row++){
    const r=rqrRow_(row),received=r[RQR_C.RECEIVED-1];
    if(!(received instanceof Date)||received.getTime()>cutoff||r[RQR_C.NAME-1]==='[anonymized]')continue;
    s.getRange(row,RQR_C.NAME,1,6).setValues([['[anonymized]','','','','','',''].slice(0,6)]);
    // Also blank project details (column 8), without changing status or metrics.
    s.getRange(row,RQR_C.NOTES).setValue('');
    s.getRange(row,RQR_C.UPDATED).setValue(new Date());cleared++;
  }
  rqrEvent_('RETENTION_RUN','',cleared+' old rows anonymized');return cleared;
}

function rqrValidateConfig_(live){
  const c=RQR_CONFIG;
  if(!c.businessName||c.businessName.indexOf('REPLACE WITH')>=0||
     !rqrEmailValid_(c.ownerEmail)||c.ownerEmail==='owner@example.com'||
     !c.officePhone||c.officePhone.indexOf('REPLACE WITH')>=0||
     !/^https:\/\//.test(c.privacyUrl)||c.privacyUrl==='https://example.com/privacy')
    throw new Error('Configure company name, monitored email, office phone and genuine privacy URL in RQR_CONFIG.');
  if(live && c.clientApprovedLive!==true)
    throw new Error('Live processing requires prior written client approval and clientApprovedLive: true.');
}
function rqrRequireInstalled_(){if(!rqrProps_().getProperty('RQR_SHEET_ID'))throw new Error('Run installClientPilot first.');}
function rqrProps_(){return PropertiesService.getScriptProperties();}
function rqrMode_(){return rqrProps_().getProperty('RQR_MODE')||'TEST';}
function rqrSpreadsheet_(){return SpreadsheetApp.openById(rqrProps_().getProperty('RQR_SHEET_ID'));}
function rqrLeads_(){return rqrSpreadsheet_().getSheetByName(RQR_TAB.LEADS);}
function rqrEvents_(){return rqrSpreadsheet_().getSheetByName(RQR_TAB.EVENTS);}
function rqrSuppressionSheet_(){return rqrSpreadsheet_().getSheetByName(RQR_TAB.SUPPRESS);}
function rqrRow_(row){return rqrLeads_().getRange(row,1,1,RQR_HEADERS.length).getValues()[0];}
function rqrFindRow_(sheet,id){
  const rows=sheet.getDataRange().getValues();
  for(let i=1;i<rows.length;i++)if(String(rows[i][0])===id)return i+1;
  return -1;
}
function rqrTodayCount_(sheet){
  const boundary=Date.now()-86400000;
  return sheet.getDataRange().getValues().slice(1)
    .filter(r=>r[1] instanceof Date&&r[1].getTime()>=boundary).length;
}
function rqrEmailValid_(email){return /^[a-z0-9][^\s@]*@[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(String(email||''))&&String(email).length<=254;}
function rqrNormalize_(x){
  const email=String(x.email||'').trim().toLowerCase();
  return {id:rqrClip_(x.id,130),received:x.received instanceof Date?x.received:new Date(),
    name:rqrClip_(x.name,100),email:rqrEmailValid_(email)?email:'',phone:rqrClip_(x.phone,32),
    zip:rqrClip_(x.zip,12),service:rqrClip_(x.service,80),notes:rqrClip_(x.notes,1000),
    source:rqrClip_(x.source,60)};
}
function rqrClip_(v,n){return String(v==null?'':v).trim().slice(0,n);}
function rqrSheetText_(v){const s=String(v==null?'':v);return /^[\s]*[=+\-@\t\r]/.test(s)?"'"+s:s;}
function rqrFirstName_(name){return rqrClip_(String(name||'').split(/\s+/)[0]||'there',50).replace(/[<>]/g,'');}
function rqrEvent_(type,id,detail){rqrEvents_().appendRow([new Date(),rqrSheetText_(type),rqrSheetText_(id),rqrSheetText_(rqrClip_(detail,180))]);}
function rqrError_(err){return String(err&&err.message||err).slice(0,140);}
function rqrCaptureError_(row,label,err){
  rqrLeads_().getRange(row,RQR_C.ERROR).setValue(label+': '+rqrError_(err));
  rqrLeads_().getRange(row,RQR_C.UPDATED).setValue(new Date());
  rqrEvent_(label,String(rqrLeads_().getRange(row,RQR_C.ID).getValue()),'Operator review required');
}
function rqrEmailHash_(email){
  const salt=rqrProps_().getProperty('RQR_SUPPRESSION_SALT')||'';
  const digest=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,salt+'|'+String(email).trim().toLowerCase());
  return digest.map(b=>('0'+((b+256)&255).toString(16)).slice(-2)).join('');
}
function rqrIsSuppressed_(email){
  const h=rqrEmailHash_(email);
  return rqrSuppressionSheet_().getDataRange().getValues().slice(1).some(r=>String(r[1])===h);
}
function rqrSuppress_(email,reason){
  if(!rqrEmailValid_(email))return;
  const h=rqrEmailHash_(email);
  if(!rqrIsSuppressed_(email))rqrSuppressionSheet_().appendRow([new Date(),h,rqrSheetText_(reason)]);
}
function rqrNotifyCapacityOnce_(){
  const p=rqrProps_(),day=Utilities.formatDate(new Date(),RQR_CONFIG.timezone,'yyyy-MM-dd');
  if(p.getProperty('RQR_CAP_ALERT_DAY')===day)return;
  if(MailApp.getRemainingDailyQuota()<1)return;
  try{
    MailApp.sendEmail({to:RQR_CONFIG.ownerEmail,
      subject:'RoofQuote Relay | Daily automated processing cap reached',
      body:'Form responses are retained by Google. Some tracker rows were flagged NEEDS_REVIEW_CAP and were not automatically acknowledged. Review the Leads tab and respond manually. '+rqrSpreadsheet_().getUrl()});
    p.setProperty('RQR_CAP_ALERT_DAY',day);
  }catch(error){Logger.log('Capacity warning send failed: '+rqrError_(error));}
}
