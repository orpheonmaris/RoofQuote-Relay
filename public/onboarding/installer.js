'use strict';
(function (root) {
  const TIMEZONES = ['America/Phoenix', 'America/Denver', 'America/Los_Angeles', 'America/Chicago', 'America/New_York'];
  function plain(value, maxLength) {
    return String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, maxLength);
  }
  function validate(raw) {
    const values = {
      businessName: plain(raw.businessName, 110),
      ownerEmail: plain(raw.ownerEmail, 254).toLowerCase(),
      officePhone: plain(raw.officePhone, 45),
      privacyUrl: plain(raw.privacyUrl, 700),
      timezone: plain(raw.timezone, 80)
    };
    const errors = [];
    if (values.businessName.length < 3 || /REPLACE WITH|INTERNAL DEMO/i.test(values.businessName))
      errors.push('Enter the roofing company’s actual business name (not a demo placeholder).');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.ownerEmail))
      errors.push('Enter a valid, monitored business email address.');
    const digits = values.officePhone.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 16)
      errors.push('Enter the roofing company’s real working phone number.');
    try {
      const address = new URL(values.privacyUrl);
      if (address.protocol !== 'https:' || !address.hostname.includes('.')) throw Error('https');
    } catch (e) {
      errors.push('Provide the company’s current HTTPS privacy notice URL; this is required before activation.');
    }
    if (!TIMEZONES.includes(values.timezone))
      errors.push('Choose one of the supported business time zones.');
    return { values, errors };
  }
  function compile(template, raw) {
    const { values, errors } = validate(raw);
    if (errors.length) throw Error(errors.join('\n'));
    const anchor = 'const RQR_CONFIG = Object.freeze({';
    const beginning = template.indexOf(anchor);
    const ending = template.indexOf('\n});', beginning);
    if (beginning < 0 || ending < 0 || beginning !== template.lastIndexOf(anchor))
      throw Error('The installer source has an unexpected configuration format. Stop and verify the template.');
    let config = template.slice(beginning, ending + 4);
    const changes = [
      ["businessName: 'REPLACE WITH ROOFING COMPANY NAME'", 'businessName: ' + JSON.stringify(values.businessName)],
      ["ownerEmail: 'owner@example.com'", 'ownerEmail: ' + JSON.stringify(values.ownerEmail)],
      ["officePhone: 'REPLACE WITH COMPANY PHONE'", 'officePhone: ' + JSON.stringify(values.officePhone)],
      ["privacyUrl: 'https://example.com/privacy'", 'privacyUrl: ' + JSON.stringify(values.privacyUrl)],
      ["timezone: 'America/Phoenix'", 'timezone: ' + JSON.stringify(values.timezone)]
    ];
    for (const [previous, replacement] of changes) {
      if (config.split(previous).length !== 2) throw Error('Unexpected template; missing or repeated field: ' + previous.split(':')[0]);
      config = config.replace(previous, replacement);
    }
    if (!config.includes('clientApprovedLive: false') || config.includes('clientApprovedLive: true'))
      throw Error('TEST safety gate missing. Installation has been blocked.');
    const compiled = template.slice(0, beginning) + config + template.slice(ending + 4);
    if (!compiled.includes('function installClientPilot()') ||
        !compiled.includes('function activateClientPilot()'))
      throw Error('Incomplete installer script; do not use this file.');
    return compiled;
  }
  const API = { validate, compile, templateVersion: 'onboarding-1.0' };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.RQRInstaller = API;
  if (typeof document === 'undefined') return;
  const form = document.getElementById('installer-form');
  if (!form) return;
  const message = document.getElementById('installer-message');
  const result = document.getElementById('installer-result');
  const preview = document.getElementById('installer-preview');
  const copy = document.getElementById('copy-installer');
  const download = document.getElementById('download-installer');
  let generated = '';
  let company = '';
  function showStatus(text, error) {
    message.textContent = text;
    message.hidden = false;
    message.setAttribute('role', error ? 'alert' : 'status');
  }
  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    generated = '';
    result.hidden = true;
    if (!form.reportValidity()) return;
    const raw = Object.fromEntries(new FormData(form).entries());
    const check = validate(raw);
    if (check.errors.length) {
      showStatus(check.errors.join(' '), true);
      return;
    }
    showStatus('Preparing the client-owned, TEST-mode installation file...', false);
    try {
      const response = await fetch('/onboarding/template.gs.txt', {cache:'no-store'});
      if (!response.ok) throw Error('Could not retrieve the verified installer template.');
      const source = await response.text();
      generated = compile(source, raw);
      company = check.values.businessName;
      preview.textContent = 'Company: ' + company +
        '\nOwner email: ' + check.values.ownerEmail +
        '\nOffice phone: ' + check.values.officePhone +
        '\nPrivacy notice: ' + check.values.privacyUrl +
        '\nTime zone: ' + check.values.timezone +
        '\nOperating mode: TEST only (real homeowner email disabled)';
      result.hidden = false;
      showStatus('Prepared. No company details have been uploaded or saved by this tool.', false);
    } catch (err) {
      showStatus('Could not prepare installer: ' + String(err.message || err), true);
    }
  });
  copy.addEventListener('click', async function () {
    if (!generated) return;
    try {
      await navigator.clipboard.writeText(generated);
      showStatus('Installer copied. The Google account owner can paste it during the supervised setup.', false);
    } catch (error) {
      showStatus('Clipboard access was blocked. Use Download prepared Code.gs instead.', true);
    }
  });
  download.addEventListener('click', function () {
    if (!generated) return;
    const slug = company.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0,50) || 'client';
    const blob = new Blob([generated], {type:'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'RoofQuote-Relay-' + slug + '-Code.gs';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showStatus('Prepared installer downloaded locally. Handle the file as client-specific business information.', false);
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
