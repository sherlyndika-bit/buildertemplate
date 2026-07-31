/**
 * DocPro Internal – app.js v3 (Professional)
 * Multi-document: Invoice, Proposal, Penawaran, SPK
 * Features: multiple bank accounts w/ logos, terbilang, status stamp,
 *           NPWP, signatory, real-time preview
 */

/* ═══════════════════════════════════════════════
   BANK DATA – Indonesian Banks & E-wallets
═══════════════════════════════════════════════ */
const BANK_DATA = {
  BCA:     { name: 'Bank Central Asia (BCA)',      short: 'BCA',    color: '#006DAE', text: '#fff' },
  MANDIRI: { name: 'Bank Mandiri',                  short: 'MDR',    color: '#003F81', text: '#F7D200' },
  BNI:     { name: 'Bank Negara Indonesia (BNI)',   short: 'BNI',    color: '#F37021', text: '#fff' },
  BRI:     { name: 'Bank Rakyat Indonesia (BRI)',   short: 'BRI',    color: '#00458B', text: '#EFCC00' },
  CIMB:    { name: 'CIMB Niaga',                    short: 'CIMB',   color: '#C41230', text: '#fff' },
  DANAMON: { name: 'Bank Danamon',                  short: 'DNM',    color: '#0068B3', text: '#fff' },
  PERMATA: { name: 'Bank Permata',                  short: 'PRMT',   color: '#E31E26', text: '#fff' },
  BTN:     { name: 'Bank BTN',                      short: 'BTN',    color: '#00529B', text: '#fff' },
  BSI:     { name: 'Bank Syariah Indonesia (BSI)',  short: 'BSI',    color: '#00695C', text: '#fff' },
  MAYBANK: { name: 'Maybank',                       short: 'MBK',    color: '#FFDD00', text: '#000' },
  OCBC:    { name: 'OCBC NISP',                     short: 'OCBC',   color: '#ED1C24', text: '#fff' },
  PANIN:   { name: 'Bank Panin',                    short: 'PNN',    color: '#003087', text: '#fff' },
  COMMONWEALTH: { name: 'Commonwealth Bank',        short: 'CMW',    color: '#F7A81B', text: '#000' },
  JAGO:    { name: 'Bank Jago',                     short: 'JAGO',   color: '#5A68FF', text: '#fff' },
  JENIUS:  { name: 'Jenius (SMBC)',                 short: 'JNIUS',  color: '#14C8C8', text: '#fff' },
  SEABANK: { name: 'Seabank',                       short: 'SEA',    color: '#4E3072', text: '#fff' },
  NEO:     { name: 'Neo Commerce',                  short: 'NEO',    color: '#FF6B00', text: '#fff' },
  ALLO:    { name: 'Allo Bank',                     short: 'ALLO',   color: '#D63B3B', text: '#fff' },
  GOPAY:   { name: 'GoPay',                         short: 'GPAY',   color: '#00AA5B', text: '#fff' },
  OVO:     { name: 'OVO',                           short: 'OVO',    color: '#4C3494', text: '#fff' },
  DANA:    { name: 'Dana',                          short: 'DANA',   color: '#118EEA', text: '#fff' },
  SHOPEEPAY: { name: 'ShopeePay',                  short: 'SPAY',   color: '#EE4D2D', text: '#fff' },
  QRIS:    { name: 'QRIS',                          short: 'QRIS',   color: '#C00000', text: '#fff' },
  PAYPAL:  { name: 'PayPal',                        short: 'PYPL',   color: '#003087', text: '#fff' },
  CUSTOM:  { name: 'Lainnya / Custom',              short: '?',      color: '#6B7A99', text: '#fff' },
};

/* ═══════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════ */
let currentDocType  = 'invoice';
let logoDataUrl     = null;
let docStatus       = '';
let dpEnabled       = false;
let dpPercent       = 50;
let items           = [{ id: uid(), desc: '', qty: 1, price: 0 }];
let bankAccounts    = [{ id: uid(), bankCode: 'BCA', customName: '', logoUrl: null, accountNumber: '', accountName: '' }];
let scopeItems      = [{ id: uid(), text: '' }];
let spkScopeItems   = [{ id: uid(), text: '' }];
let timelineItems   = [{ id: uid(), tahap: '', deskripsi: '', durasi: '' }];

/* ═══════════════════════════════════════════════
   UTILS
═══════════════════════════════════════════════ */
function uid() { return '_' + Math.random().toString(36).slice(2, 9); }

const DOC_PREFIXES = { invoice:'INV', proposal:'PRP', penawaran:'QUO', spk:'SPK' };
const DOC_LABELS   = { invoice:'Invoice', proposal:'Proposal', penawaran:'Penawaran', spk:'Surat Perjanjian Kerjasama (SPK)' };

/* ── Terbilang (Indonesian amount in words) ── */
function terbilang(n) {
  n = Math.round(Number(n) || 0);
  if (!n || isNaN(n) || n <= 0) return 'nol';
  const ones = ['','satu','dua','tiga','empat','lima','enam','tujuh','delapan','sembilan',
    'sepuluh','sebelas','dua belas','tiga belas','empat belas','lima belas',
    'enam belas','tujuh belas','delapan belas','sembilan belas'];
  const tens = ['','','dua puluh','tiga puluh','empat puluh','lima puluh',
    'enam puluh','tujuh puluh','delapan puluh','sembilan puluh'];
  let r = '';
  if (n >= 1000000000) { r += terbilang(Math.floor(n/1e9)) + ' miliar '; n %= 1e9; }
  if (n >= 1000000)    { r += terbilang(Math.floor(n/1e6)) + ' juta ';   n %= 1e6; }
  if (n >= 1000)       { const k = Math.floor(n/1000); r += (k===1 ? 'seribu' : terbilang(k)+' ribu') + ' '; n %= 1000; }
  if (n >= 100)        { const h = Math.floor(n/100); r += (h===1 ? 'seratus' : terbilang(h)+' ratus') + ' '; n %= 100; }
  if (n >= 20)         { r += tens[Math.floor(n/10)] + ' '; n %= 10; }
  if (n > 0 && n < 20) r += ones[n] + ' ';
  return r.trim();
}

function generateDocNumber(type) {
  const n = new Date(), rand = String(Math.floor(Math.random()*900)+100);
  return `${DOC_PREFIXES[type]}-${n.getFullYear()}${String(n.getMonth()+1).padStart(2,'0')}${String(n.getDate()).padStart(2,'0')}-${rand}`;
}

function formatDate(s) {
  if (!s) return '–';
  const [y,m,d] = s.split('-');
  const M = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  return `${parseInt(d)} ${M[parseInt(m)-1]} ${y}`;
}

function parseMoney(v) { return parseFloat(v) || 0; }

const CUR_SYM = { IDR:'Rp', USD:'$', EUR:'€', SGD:'S$' };
const CUR_LOC = { IDR:'id-ID', USD:'en-US', EUR:'de-DE', SGD:'en-SG' };

function getCurrency() { return (document.getElementById('currency')||{}).value || 'IDR'; }

function fmtMoney(amount, cur) {
  cur = cur || getCurrency();
  const sym = CUR_SYM[cur] || 'Rp';
  if (cur === 'IDR') return sym + '\u00A0' + Math.round(amount).toLocaleString('id-ID');
  return sym + '\u00A0' + amount.toLocaleString(CUR_LOC[cur]||'en-US', {minimumFractionDigits:2,maximumFractionDigits:2});
}

function fmtMoneyShort(amount) {
  const c = getCurrency(), s = CUR_SYM[c]||'Rp';
  if (c==='IDR') {
    if (amount>=1e9)  return s+(amount/1e9).toFixed(1).replace('.0','')+'M';
    if (amount>=1e6)  return s+(amount/1e6).toFixed(1).replace('.0','')+'jt';
    if (amount>=1e3)  return s+Math.round(amount/1e3)+'rb';
    return s+Math.round(amount);
  }
  if (amount>=1e6) return s+(amount/1e6).toFixed(1)+'M';
  if (amount>=1e3) return s+(amount/1e3).toFixed(1)+'K';
  return s+amount.toFixed(2);
}

function esc(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function val(id) { return (document.getElementById(id)||{}).value || ''; }

function showToast(msg, type='info', ms=2800) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = `toast ${type} show`;
  setTimeout(() => { t.className = 'toast'; }, ms);
}

function calculate() {
  const subtotal    = items.reduce((s,i) => s + parseMoney(i.qty)*parseMoney(i.price), 0);
  const discountPct = parseMoney(val('discount'));
  const taxPct      = parseMoney(val('tax-rate'));
  const discountAmt = subtotal * discountPct / 100;
  const afterDisc   = subtotal - discountAmt;
  const taxAmt      = afterDisc * taxPct / 100;
  const total       = afterDisc + taxAmt;
  const dpPct       = dpEnabled ? Math.min(Math.max(parseMoney(val('dp-percent')), 1), 99) : 0;
  const dpAmt       = dpEnabled ? total * dpPct / 100 : 0;
  const pelAmt      = dpEnabled ? total - dpAmt : 0;
  const pelPct      = dpEnabled ? 100 - dpPct : 0;
  return { subtotal, discountPct, discountAmt, taxPct, taxAmt, total, dpPct, dpAmt, pelPct, pelAmt };
}

function updateDpDisplay() {
  const { total, dpPct, dpAmt, pelPct, pelAmt } = calculate();
  const pctLbl  = document.getElementById('dp-pct-label');
  const pelLbl  = document.getElementById('pel-pct-label');
  const dpDisp  = document.getElementById('dp-amount-display');
  const pelDisp = document.getElementById('pel-amount-display');
  const pelPctEl= document.getElementById('pel-percent-display');
  if (pctLbl)  pctLbl.textContent  = dpPct;
  if (pelLbl)  pelLbl.textContent  = pelPct;
  if (dpDisp)  dpDisp.textContent  = fmtMoney(dpAmt);
  if (pelDisp) pelDisp.textContent = fmtMoney(pelAmt);
  if (pelPctEl) pelPctEl.value = pelPct;
}

/* ── Terbilang (Indonesian amount in words) ── */
function terbilang(n) {
  n = Math.round(n);
  if (n===0) return 'nol';
  const ones = ['','satu','dua','tiga','empat','lima','enam','tujuh','delapan','sembilan',
    'sepuluh','sebelas','dua belas','tiga belas','empat belas','lima belas',
    'enam belas','tujuh belas','delapan belas','sembilan belas'];
  const tens = ['','','dua puluh','tiga puluh','empat puluh','lima puluh',
    'enam puluh','tujuh puluh','delapan puluh','sembilan puluh'];
  let r = '';
  if (n >= 1000000000) { r += terbilang(Math.floor(n/1e9)) + ' miliar '; n %= 1e9; }
  if (n >= 1000000)    { r += terbilang(Math.floor(n/1e6)) + ' juta ';   n %= 1e6; }
  if (n >= 1000)       { const k = Math.floor(n/1000); r += (k===1 ? 'seribu' : terbilang(k)+' ribu') + ' '; n %= 1000; }
  if (n >= 100)        { const h = Math.floor(n/100); r += (h===1 ? 'seratus' : terbilang(h)+' ratus') + ' '; n %= 100; }
  if (n >= 20)         { r += tens[Math.floor(n/10)] + ' '; n %= 10; }
  if (n > 0 && n < 20) r += ones[n] + ' ';
  return r.trim();
}

function terbilangRupiah(amount) {
  const t = terbilang(amount);
  return t.charAt(0).toUpperCase() + t.slice(1) + ' Rupiah';
}

/* ═══════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initDefaults();
  renderAllLists();
  switchDocType('invoice', false);
  bindEvents();
});

function initDefaults() {
  const today = new Date();
  const ts = today.toISOString().split('T')[0];
  const due = new Date(today); due.setDate(due.getDate()+30);
  const ds = due.toISOString().split('T')[0];
  document.getElementById('invoice-number').value = generateDocNumber('invoice');
  document.getElementById('invoice-date').value   = ts;
  document.getElementById('due-date').value       = ds;
  const spkEnd = new Date(today); spkEnd.setMonth(spkEnd.getMonth()+3);
  document.getElementById('spk-mulai').value   = ts;
  document.getElementById('spk-selesai').value = spkEnd.toISOString().split('T')[0];
}

/* ═══════════════════════════════════════════════
   EVENT BINDING
═══════════════════════════════════════════════ */
function bindEvents() {
  // Doc type tabs
  document.querySelectorAll('.doc-type-btn').forEach(btn =>
    btn.addEventListener('click', () => switchDocType(btn.dataset.type)));

  // Logo
  document.getElementById('logo-placeholder').addEventListener('click', () =>
    document.getElementById('logo-input').click());
  document.getElementById('logo-input').addEventListener('change', handleLogoUpload);
  document.getElementById('logo-remove-btn').addEventListener('click', removeLogo);

  // Generate number
  document.getElementById('btn-generate-inv').addEventListener('click', () => {
    document.getElementById('invoice-number').value = generateDocNumber(currentDocType);
    renderPreview();
    showToast('Nomor dokumen baru digenerate ✓', 'success');
  });

  // DP toggle
  document.getElementById('enable-dp').addEventListener('change', e => {
    dpEnabled = e.target.checked;
    document.getElementById('dp-section-fields').style.display = dpEnabled ? '' : 'none';
    updateDpDisplay();
    renderPreview();
  });
  document.getElementById('dp-percent').addEventListener('input', e => {
    dpPercent = Math.min(Math.max(parseInt(e.target.value)||50, 1), 99);
    updateDpDisplay();
    renderPreview();
  });

  // Status selector
  document.getElementById('status-selector').addEventListener('click', e => {
    const btn = e.target.closest('.status-btn');
    if (!btn) return;
    docStatus = btn.dataset.status;
    document.querySelectorAll('#status-selector .status-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderPreview();
  });

  // Add bank account
  document.getElementById('btn-add-bank').addEventListener('click', addBankAccount);

  // Items
  document.getElementById('btn-add-item').addEventListener('click', addItem);
  document.getElementById('btn-add-scope').addEventListener('click', addScopeItem);
  document.getElementById('btn-add-timeline').addEventListener('click', addTimelineItem);
  document.getElementById('btn-add-spk-scope').addEventListener('click', addSpkScopeItem);

  // Actions
  document.getElementById('btn-reset').addEventListener('click', resetForm);
  document.getElementById('btn-pdf').addEventListener('click', exportPDF);
  document.getElementById('btn-pdf-sm').addEventListener('click', exportPDF);
  document.getElementById('btn-print').addEventListener('click', () => window.print());
  document.getElementById('btn-print-sm').addEventListener('click', () => window.print());

  // Live update
  document.querySelector('.form-panel').addEventListener('input', renderPreview);
  document.querySelector('.form-panel').addEventListener('change', renderPreview);
}

/* ═══════════════════════════════════════════════
   DOC TYPE SWITCHING
═══════════════════════════════════════════════ */
function switchDocType(type, toast=true) {
  currentDocType = type;
  document.querySelectorAll('.doc-type-btn').forEach(b => b.classList.toggle('active', b.dataset.type===type));
  updateSectionVisibility();
  updateDynamicLabels();
  document.getElementById('invoice-number').value = generateDocNumber(type);
  docStatus = '';
  document.querySelectorAll('#status-selector .status-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('#status-selector .status-btn').classList.add('active');
  renderPreview();
  if (toast) showToast(`Mode: ${DOC_LABELS[type]}`, 'info', 1500);
}

function updateSectionVisibility() {
  document.querySelectorAll('[data-types]').forEach(el => {
    const t = el.dataset.types;
    el.style.display = (t==='all' || t.split(' ').includes(currentDocType)) ? '' : 'none';
  });
  document.querySelectorAll('[data-show-for]').forEach(el => {
    el.style.display = el.dataset.showFor.split(' ').includes(currentDocType) ? '' : 'none';
  });
}

function updateDynamicLabels() {
  const t = currentDocType, spk = t==='spk';
  const el = id => document.getElementById(id);
  const setText = (id, v) => { if(el(id)) el(id).textContent = v; };

  setText('sender-section-title', spk ? 'Pihak Pertama (Pemberi Kerja)' : 'Informasi Pengirim');
  setText('client-section-title', spk ? 'Pihak Kedua (Penerima Kerja)'  : 'Informasi Klien');
  setText('doc-detail-title', {invoice:'Detail Invoice',proposal:'Detail Proposal',penawaran:'Detail Penawaran',spk:'Detail SPK'}[t]);
  setText('lbl-doc-number', {invoice:'Nomor Invoice',proposal:'Nomor Proposal',penawaran:'Nomor Penawaran',spk:'Nomor SPK'}[t]);
  setText('items-section-title', {invoice:'Daftar Item',proposal:'Rincian Anggaran',penawaran:'Daftar Item / Jasa',spk:''}[t]);
  setText('lbl-sender-name', spk ? 'Nama Perusahaan (Pihak Pertama)' : 'Nama Perusahaan / Pengirim');
  setText('lbl-client-name', spk ? 'Nama Penerima Kerja (Pihak Kedua)' : 'Nama Klien / Penerima');
}

/* ═══════════════════════════════════════════════
   LOGO
═══════════════════════════════════════════════ */
function handleLogoUpload(e) {
  const file = e.target.files[0]; if (!file) return;
  if (file.size > 2*1024*1024) { showToast('File maks. 2MB', 'error'); return; }
  const reader = new FileReader();
  reader.onload = ev => {
    logoDataUrl = ev.target.result;
    document.getElementById('logo-preview').src = logoDataUrl;
    document.getElementById('logo-preview').hidden = false;
    document.getElementById('logo-placeholder').style.display = 'none';
    document.getElementById('logo-remove-btn').hidden = false;
    renderPreview();
  };
  reader.readAsDataURL(file);
}

function removeLogo() {
  logoDataUrl = null;
  document.getElementById('logo-input').value = '';
  document.getElementById('logo-preview').hidden = true;
  document.getElementById('logo-placeholder').style.display = '';
  document.getElementById('logo-remove-btn').hidden = true;
  renderPreview();
}

/* ═══════════════════════════════════════════════
   BANK ACCOUNTS
═══════════════════════════════════════════════ */
function addBankAccount() {
  bankAccounts.push({ id: uid(), bankCode: 'BCA', customName: '', logoUrl: null, accountNumber: '', accountName: '' });
  renderBankAccountsList();
  renderPreview();
}

function deleteBankAccount(id) {
  if (bankAccounts.length === 1) { showToast('Minimal satu rekening', 'error'); return; }
  bankAccounts = bankAccounts.filter(b => b.id !== id);
  renderBankAccountsList();
  renderPreview();
}

function renderBankAccountsList() {
  const container = document.getElementById('bank-accounts-list');
  if (!container) return;
  container.innerHTML = '';
  bankAccounts.forEach(acct => {
    const bank = BANK_DATA[acct.bankCode] || BANK_DATA.CUSTOM;
    const row = document.createElement('div');
    row.className = 'bank-acct-row';
    row.dataset.id = acct.id;

    // Build bank options
    const options = Object.entries(BANK_DATA).map(([k, b]) =>
      `<option value="${k}" ${k===acct.bankCode ? 'selected' : ''}>${b.name}</option>`
    ).join('');

    const logoContent = acct.logoUrl
      ? `<img src="${acct.logoUrl}" style="width:100%;height:100%;object-fit:contain;padding:2px;" />`
      : `<div class="inv-bank-logo-text" style="font-size:9px;font-weight:900;color:${bank.color}">${bank.short}</div>`;

    const badgeStyle = acct.logoUrl
      ? 'background:#FFFFFF; border:1px solid #E2E8F0;'
      : `background:#FFFFFF; border:1.5px solid ${bank.color}40;`;

    row.innerHTML = `
      <div class="bank-acct-logo-cell">
        <div class="bank-badge-preview" style="${badgeStyle}" id="badge-${acct.id}">
          ${logoContent}
        </div>
        <input type="file" class="bank-logo-input" accept="image/*" data-id="${acct.id}" />
        <button class="bank-logo-upload-btn" data-id="${acct.id}" title="Upload logo bank">📷 Logo</button>
      </div>
      <div class="bank-acct-fields">
        <select class="bank-select-input" data-id="${acct.id}">${options}</select>
        <input type="text" class="bank-custom-name" placeholder="Nama bank custom..." value="${esc(acct.customName)}" data-id="${acct.id}" style="${acct.bankCode==='CUSTOM' ? '' : 'display:none'}" />
        <input type="text" class="bank-account-num-input" placeholder="No. Rekening (0123 4567 8900)" value="${esc(acct.accountNumber)}" data-id="${acct.id}" />
        <input type="text" class="bank-account-name-input" placeholder="Atas Nama" value="${esc(acct.accountName)}" data-id="${acct.id}" />
      </div>
      <button class="item-delete-btn" data-id="${acct.id}" title="Hapus rekening">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
        </svg>
      </button>`;

    container.appendChild(row);

    // Bank select change
    row.querySelector('.bank-select-input').addEventListener('change', e => {
      const acct = bankAccounts.find(b => b.id === e.target.dataset.id);
      if (!acct) return;
      acct.bankCode = e.target.value;
      acct.logoUrl = null; // reset custom logo when bank changes
      const customInput = row.querySelector('.bank-custom-name');
      customInput.style.display = e.target.value === 'CUSTOM' ? '' : 'none';
      // Update badge
      const bankDef = BANK_DATA[e.target.value] || BANK_DATA.CUSTOM;
      const badge = document.getElementById('badge-' + acct.id);
      if (badge) {
        badge.style.background = '#FFFFFF';
        badge.style.border = `1.5px solid ${bankDef.color}40`;
        badge.innerHTML = `<div class="inv-bank-logo-text" style="font-size:9px;font-weight:900;color:${bankDef.color}">${bankDef.short}</div>`;
      }
      renderPreview();
    });

    // Custom name
    row.querySelector('.bank-custom-name').addEventListener('input', e => {
      const acct = bankAccounts.find(b => b.id === e.target.dataset.id);
      if (acct) { acct.customName = e.target.value; renderPreview(); }
    });

    // Account number
    row.querySelector('.bank-account-num-input').addEventListener('input', e => {
      const acct = bankAccounts.find(b => b.id === e.target.dataset.id);
      if (acct) { acct.accountNumber = e.target.value; renderPreview(); }
    });

    // Account name
    row.querySelector('.bank-account-name-input').addEventListener('input', e => {
      const acct = bankAccounts.find(b => b.id === e.target.dataset.id);
      if (acct) { acct.accountName = e.target.value; renderPreview(); }
    });

    // Logo upload button → trigger file input
    row.querySelector('.bank-logo-upload-btn').addEventListener('click', e => {
      row.querySelector('.bank-logo-input').click();
    });

    // Logo file input
    row.querySelector('.bank-logo-input').addEventListener('change', e => {
      const file = e.target.files[0]; if (!file) return;
      if (file.size > 1*1024*1024) { showToast('Logo maks. 1MB', 'error'); return; }
      const reader = new FileReader();
      reader.onload = ev => {
        const acct = bankAccounts.find(b => b.id === e.target.dataset.id);
        if (!acct) return;
        acct.logoUrl = ev.target.result;
        const badge = document.getElementById('badge-' + acct.id);
        if (badge) {
          badge.style.background = '#FFFFFF';
          badge.style.border = '1px solid #E2E8F0';
          badge.innerHTML = `<img src="${acct.logoUrl}" style="width:100%;height:100%;object-fit:contain;padding:2px;" />`;
        }
        renderPreview();
        showToast('Logo bank berhasil diupload ✓', 'success');
      };
      reader.readAsDataURL(file);
    });

    // Delete
    row.querySelector('.item-delete-btn').addEventListener('click', () => deleteBankAccount(acct.id));
  });
}

/* Bank account preview HTML */
function bankCardsHtml() {
  if (!bankAccounts.some(b => b.accountNumber || b.accountName)) return '';
  const cur = getCurrency();
  let html = `<div class="inv-bank-section">
    <div class="inv-bank-section-label">Informasi Pembayaran</div>
    <div class="inv-bank-cards">`;

  bankAccounts.forEach(acct => {
    if (!acct.accountNumber && !acct.accountName) return;
    const bank = BANK_DATA[acct.bankCode] || BANK_DATA.CUSTOM;
    const bankName = acct.bankCode === 'CUSTOM' ? (acct.customName || 'Bank Lainnya') : bank.name;
    
    const logoContent = acct.logoUrl
      ? `<img src="${acct.logoUrl}" style="width:100%;height:100%;object-fit:contain;padding:4px;" />`
      : `<div class="inv-bank-logo-text" style="color:${bank.color}; font-size:10.5px; font-weight:900;">${bank.short}</div>`;
    
    const containerStyle = acct.logoUrl
      ? 'background: #FFFFFF; border: 1px solid #E2E8F0;'
      : `background: #FFFFFF; border: 1.5px solid ${bank.color}40;`;

    html += `<div class="inv-bank-card">
      <div class="inv-bank-logo" style="${containerStyle}">${logoContent}</div>
      <div>
        <div class="inv-bank-name">${esc(bankName)}</div>
        <div class="inv-bank-number">${esc(acct.accountNumber) || '–'}</div>
        <div class="inv-bank-holder">a/n ${esc(acct.accountName) || '–'}</div>
      </div>
    </div>`;
  });

  html += `</div></div>`;
  return html;
}

/* ═══════════════════════════════════════════════
   ITEMS
═══════════════════════════════════════════════ */
function addItem() {
  items.push({ id: uid(), desc: '', qty: 1, price: 0 });
  renderItemsList(); renderPreview();
  setTimeout(() => { const i = document.querySelectorAll('.item-desc'); i[i.length-1]?.focus(); }, 50);
}

function deleteItem(id) {
  if (items.length === 1) { showToast('Minimal satu item', 'error'); return; }
  items = items.filter(i => i.id !== id);
  renderItemsList(); renderPreview();
}

function handleItemInput(e) {
  const { id, field } = e.target.dataset;
  const item = items.find(i => i.id === id); if (!item) return;
  if (field==='desc')  item.desc  = e.target.value;
  if (field==='qty')   item.qty   = parseFloat(e.target.value) || 0;
  if (field==='price') item.price = parseFloat(e.target.value) || 0;
  const row = e.target.closest('.item-row');
  if (row) { const sub = row.querySelector('.item-subtotal'); if(sub) sub.textContent = fmtMoneyShort(item.qty*item.price); }
  renderPreview();
}

function renderItemsList() {
  const c = document.getElementById('items-list'); if (!c) return;
  c.innerHTML = '';
  items.forEach(item => {
    const sub = parseMoney(item.qty)*parseMoney(item.price);
    const row = document.createElement('div'); row.className = 'item-row';
    row.innerHTML = `
      <input class="item-desc" type="text" placeholder="Nama barang/jasa..." value="${esc(item.desc)}" data-id="${item.id}" data-field="desc" />
      <input class="item-qty" type="number" placeholder="1" min="0" step="any" value="${item.qty}" data-id="${item.id}" data-field="qty" />
      <input class="item-price" type="number" placeholder="0" min="0" step="any" value="${item.price||''}" data-id="${item.id}" data-field="price" />
      <div class="item-subtotal">${fmtMoneyShort(sub)}</div>
      <button class="item-delete-btn" data-id="${item.id}" title="Hapus">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
        </svg>
      </button>`;
    c.appendChild(row);
    row.querySelectorAll('input[data-id]').forEach(i => i.addEventListener('input', handleItemInput));
    row.querySelector('.item-delete-btn').addEventListener('click', e => deleteItem(e.currentTarget.dataset.id));
  });
}

/* ═══════════════════════════════════════════════
   SCOPE / TIMELINE / SPK SCOPE
═══════════════════════════════════════════════ */
function addScopeItem() {
  scopeItems.push({ id: uid(), text: '' });
  renderScopeList(); renderPreview();
  setTimeout(() => { const i = document.querySelectorAll('#scope-list .scope-text-input'); i[i.length-1]?.focus(); }, 50);
}
function deleteScopeItem(id) {
  if (scopeItems.length===1) { showToast('Minimal satu poin','error'); return; }
  scopeItems = scopeItems.filter(i => i.id!==id); renderScopeList(); renderPreview();
}
function renderScopeList() {
  const c = document.getElementById('scope-list'); if(!c) return; c.innerHTML='';
  scopeItems.forEach((item,idx) => {
    const row = document.createElement('div'); row.className = 'scope-item-row';
    row.innerHTML = `<div class="scope-item-num">${idx+1}</div>
      <input class="scope-text-input" type="text" placeholder="Poin lingkup pekerjaan..." value="${esc(item.text)}" data-id="${item.id}" />
      <button class="item-delete-btn" data-id="${item.id}" title="Hapus"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>`;
    c.appendChild(row);
    row.querySelector('input').addEventListener('input', e => { const si=scopeItems.find(i=>i.id===e.target.dataset.id); if(si){si.text=e.target.value; renderPreview();} });
    row.querySelector('.item-delete-btn').addEventListener('click', () => deleteScopeItem(item.id));
  });
}

function addTimelineItem() {
  timelineItems.push({ id: uid(), tahap:'', deskripsi:'', durasi:'' });
  renderTimelineList(); renderPreview();
}
function deleteTimelineItem(id) {
  if (timelineItems.length===1) { showToast('Minimal satu tahap','error'); return; }
  timelineItems = timelineItems.filter(i=>i.id!==id); renderTimelineList(); renderPreview();
}
function renderTimelineList() {
  const c = document.getElementById('timeline-list'); if(!c) return; c.innerHTML='';
  timelineItems.forEach(item => {
    const row = document.createElement('div'); row.className = 'timeline-item-row';
    row.innerHTML = `
      <input type="text" placeholder="Tahap 1" value="${esc(item.tahap)}" data-id="${item.id}" data-field="tahap" />
      <input type="text" placeholder="Deskripsi kegiatan" value="${esc(item.deskripsi)}" data-id="${item.id}" data-field="deskripsi" />
      <input type="text" placeholder="2 minggu" value="${esc(item.durasi)}" data-id="${item.id}" data-field="durasi" />
      <button class="item-delete-btn" data-id="${item.id}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>`;
    c.appendChild(row);
    row.querySelectorAll('input[data-id]').forEach(i => i.addEventListener('input', e => {
      const ti=timelineItems.find(t=>t.id===e.target.dataset.id); if(ti){ti[e.target.dataset.field]=e.target.value; renderPreview();}
    }));
    row.querySelector('.item-delete-btn').addEventListener('click', () => deleteTimelineItem(item.id));
  });
}

function addSpkScopeItem() {
  spkScopeItems.push({ id: uid(), text: '' });
  renderSpkScopeList(); renderPreview();
  setTimeout(() => { const i = document.querySelectorAll('#spk-scope-list .scope-text-input'); i[i.length-1]?.focus(); }, 50);
}
function deleteSpkScopeItem(id) {
  if (spkScopeItems.length===1) { showToast('Minimal satu poin','error'); return; }
  spkScopeItems = spkScopeItems.filter(i=>i.id!==id); renderSpkScopeList(); renderPreview();
}
function renderSpkScopeList() {
  const c = document.getElementById('spk-scope-list'); if(!c) return; c.innerHTML='';
  spkScopeItems.forEach((item,idx) => {
    const row = document.createElement('div'); row.className = 'scope-item-row';
    row.innerHTML = `<div class="scope-item-num">${idx+1}</div>
      <input class="scope-text-input" type="text" placeholder="Poin pekerjaan..." value="${esc(item.text)}" data-id="${item.id}" />
      <button class="item-delete-btn" data-id="${item.id}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>`;
    c.appendChild(row);
    row.querySelector('input').addEventListener('input', e => { const si=spkScopeItems.find(i=>i.id===e.target.dataset.id); if(si){si.text=e.target.value; renderPreview();} });
    row.querySelector('.item-delete-btn').addEventListener('click', () => deleteSpkScopeItem(item.id));
  });
}

function renderAllLists() {
  renderItemsList(); renderBankAccountsList();
  renderScopeList(); renderTimelineList(); renderSpkScopeList();
}

/* ═══════════════════════════════════════════════
   PREVIEW RENDERING
═══════════════════════════════════════════════ */
function renderPreview() {
  const el = document.getElementById('invoice-preview'); if (!el) return;
  updateDpDisplay();
  const renderers = { invoice: renderInvoicePreview, penawaran: renderPenawaranPreview, proposal: renderProposalPreview, spk: renderSPKPreview };
  el.innerHTML = (renderers[currentDocType] || renderers.invoice)();
}

/* ── Shared helpers ── */
function senderBlockHtml(small=false) {
  const nm = esc(val('sender-name')) || 'Nama Perusahaan';
  const addr = esc(val('sender-address'));
  const phone = esc(val('sender-phone'));
  const email = esc(val('sender-email'));
  const web = esc(val('sender-website'));
  const npwp = esc(val('sender-npwp'));
  const detail = [addr, phone && `📞 ${phone}`, email && `✉ ${email}`, web && `🌐 ${web}`, npwp && `NPWP: ${npwp}`].filter(Boolean).join('<br>');
  return `
    <div class="inv-company-block">
      ${logoDataUrl ? `<div class="inv-company-logo"><img src="${logoDataUrl}" /></div>` : ''}
      <div>
        <div class="inv-company-info-name">${nm}</div>
        <div class="inv-company-info-detail">${detail}</div>
      </div>
    </div>`;
}

function itemsTableHtml() {
  const cur = getCurrency();
  const rows = items.map((item,i) => {
    const sub = parseMoney(item.qty)*parseMoney(item.price);
    return `<tr>
      <td class="td-num">${i+1}</td>
      <td class="td-desc">${esc(item.desc) || `<em style="color:#8B93A9">Item ${i+1}</em>`}</td>
      <td class="td-qty">${item.qty}</td>
      <td class="td-price">${fmtMoney(item.price, cur)}</td>
      <td class="td-sub">${fmtMoney(sub, cur)}</td>
    </tr>`;
  }).join('');
  return `<div class="inv-items-area">
    <table class="inv-table">
      <thead><tr>
        <th style="width:30px">#</th>
        <th>Deskripsi</th>
        <th class="th-qty">Qty</th>
        <th class="th-price">Harga Satuan</th>
        <th class="th-sub" style="text-align:right">Subtotal</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function summaryBlockHtml() {
  const { subtotal, discountPct, discountAmt, taxPct, taxAmt, total, dpPct, dpAmt, pelPct, pelAmt } = calculate();
  const cur = getCurrency();
  let rows = `<div class="inv-sum-row"><span class="inv-sum-label">Subtotal</span><span class="inv-sum-value">${fmtMoney(subtotal,cur)}</span></div>`;
  if (discountPct > 0) rows += `<div class="inv-sum-row discount"><span class="inv-sum-label">Diskon (${discountPct}%)</span><span class="inv-sum-value">– ${fmtMoney(discountAmt,cur)}</span></div>`;
  if (taxPct > 0)      rows += `<div class="inv-sum-row tax"><span class="inv-sum-label">PPN (${taxPct}%)</span><span class="inv-sum-value">${fmtMoney(taxAmt,cur)}</span></div>`;
  rows += `<div class="inv-sum-row total"><span class="inv-sum-label">TOTAL</span><span class="inv-sum-value">${fmtMoney(total,cur)}</span></div>`;

  // DP + Pelunasan rows
  if (dpEnabled && dpAmt > 0) {
    rows += `
    <div style="height:6px"></div>
    <div class="inv-sum-row" style="background:#EDF2FF;border-radius:6px 6px 0 0;">
      <span class="inv-sum-label" style="color:#3B5BDB;font-weight:700;">
        <span style="display:inline-block;background:#3B5BDB;color:white;font-size:9px;font-weight:900;padding:1px 6px;border-radius:99px;margin-right:5px;letter-spacing:.04em">DP</span>
        Down Payment (${dpPct}%)
      </span>
      <span class="inv-sum-value" style="color:#3B5BDB">${fmtMoney(dpAmt,cur)}</span>
    </div>
    <div class="inv-sum-row" style="background:#E6FCF5;border-radius:0 0 6px 6px;">
      <span class="inv-sum-label" style="color:#0CA678;font-weight:700;">
        <span style="display:inline-block;background:#0CA678;color:white;font-size:9px;font-weight:900;padding:1px 6px;border-radius:99px;margin-right:5px;letter-spacing:.04em">PLS</span>
        Pelunasan (${pelPct}%)
      </span>
      <span class="inv-sum-value" style="color:#0CA678">${fmtMoney(pelAmt,cur)}</span>
    </div>`;
  }

  return `<div class="inv-summary-area"><div class="inv-summary-box">${rows}</div></div>`;
}

function terbilangBlockHtml() {
  const { total, dpEnabled: _dp, dpAmt, pelAmt, dpPct, pelPct } = calculate();
  if (total <= 0 || getCurrency() !== 'IDR') return '';
  let html = `<div class="inv-terbilang">`;
  if (dpEnabled && dpAmt > 0) {
    html += `<div class="inv-terbilang-text" style="margin-bottom:4px">
      <strong style="color:#3B5BDB">DP (${dpPct}%):</strong> <em>${terbilangRupiah(dpAmt)}</em>
    </div>
    <div class="inv-terbilang-text">
      <strong style="color:#0CA678">Pelunasan (${pelPct}%):</strong> <em>${terbilangRupiah(pelAmt)}</em>
    </div>`;
  } else {
    html += `<div class="inv-terbilang-text">Terbilang: <em>${terbilangRupiah(total)}</em></div>`;
  }
  html += `</div>`;
  return html;
}

function statusStampHtml() {
  if (!docStatus) return '';
  const cls = docStatus === 'LUNAS' ? 'stamp-lunas' : docStatus === 'BELUM LUNAS' ? 'stamp-unpaid' : 'stamp-draft';
  return `<div class="inv-status-stamp ${cls} visible">${docStatus}</div>`;
}

function notesBlockHtml() {
  const notes = val('notes');
  if (!notes.trim()) return '';
  return `<div class="inv-footer-info"><div class="inv-notes-box">
    <div class="inv-notes-label">Catatan</div>
    <div class="inv-notes-text">${esc(notes)}</div>
  </div></div>`;
}

/* ─── INVOICE PREVIEW ─── */
function renderInvoicePreview() {
  const sigName  = esc(val('signatory-name'));
  const sigTitle = esc(val('signatory-title'));
  const dueDate  = val('due-date');
  const clientNpwp = val('client-npwp');

  return `
  ${statusStampHtml()}
  <div class="inv-header-band">
    ${senderBlockHtml()}
    <div class="inv-doc-title-block">
      <div class="inv-doc-type-label c-invoice">INVOICE</div>
      <div class="inv-doc-number">#${esc(val('invoice-number')) || 'INV-000'}</div>
    </div>
  </div>
  <div class="inv-stripe c-invoice"></div>
  <div class="inv-meta-band">
    <div class="inv-bill-to">
      <div class="inv-meta-label">Ditagihkan Kepada</div>
      <div class="inv-client-name">${esc(val('client-name')) || 'Nama Klien'}</div>
      <div class="inv-client-sub">${[val('client-address'),val('client-phone'),val('client-email')].filter(Boolean).map(esc).join('<br>')}</div>
      ${clientNpwp ? `<span class="inv-npwp-badge">NPWP: ${esc(clientNpwp)}</span>` : ''}
    </div>
    <div class="inv-date-grid">
      <div class="inv-date-row"><span class="inv-date-key">Tanggal</span><span class="inv-date-val">${formatDate(val('invoice-date'))}</span></div>
      ${dueDate ? `<div class="inv-date-row"><span class="inv-date-key">Jatuh Tempo</span><span class="inv-date-val overdue">${formatDate(dueDate)}</span></div>` : ''}
      <div class="inv-date-row"><span class="inv-date-key">Mata Uang</span><span class="inv-date-val">${getCurrency()}</span></div>
    </div>
  </div>
  ${itemsTableHtml()}
  ${summaryBlockHtml()}
  ${terbilangBlockHtml()}
  ${bankCardsHtml()}
  ${notesBlockHtml()}
  <div class="inv-signature-area">
    <div class="inv-sign-left">Dokumen ini dibuat secara elektronik dan sah tanpa tanda tangan basah.</div>
    <div class="inv-sign-right">
      <div class="inv-sign-box"></div>
      <div class="inv-sign-name">${sigName || esc(val('sender-name')) || '_______________'}</div>
      <div class="inv-sign-title">${sigTitle || 'Hormat Kami'}</div>
    </div>
  </div>`;
}

/* ─── PENAWARAN PREVIEW ─── */
function renderPenawaranPreview() {
  const sigName    = esc(val('signatory-name'));
  const sigTitle   = esc(val('signatory-title'));
  const perihal    = val('penawaran-perihal');
  const terms      = val('penawaran-terms');
  const clientNpwp = val('client-npwp');

  return `
  ${statusStampHtml()}
  <div class="inv-header-band">
    ${senderBlockHtml()}
    <div class="inv-doc-title-block">
      <div class="inv-doc-type-label c-penawaran">PENAWARAN</div>
      <div class="inv-doc-number">#${esc(val('invoice-number')) || 'QUO-000'}</div>
    </div>
  </div>
  <div class="inv-stripe c-penawaran"></div>
  <div class="inv-meta-band">
    <div class="inv-bill-to">
      <div class="inv-meta-label">Ditujukan Kepada</div>
      <div class="inv-client-name">${esc(val('client-name')) || 'Nama Klien'}</div>
      <div class="inv-client-sub">${[val('client-address'),val('client-phone'),val('client-email')].filter(Boolean).map(esc).join('<br>')}</div>
      ${clientNpwp ? `<span class="inv-npwp-badge">NPWP: ${esc(clientNpwp)}</span>` : ''}
    </div>
    <div class="inv-date-grid">
      <div class="inv-date-row"><span class="inv-date-key">Tanggal</span><span class="inv-date-val">${formatDate(val('invoice-date'))}</span></div>
      ${val('valid-until') ? `<div class="inv-date-row"><span class="inv-date-key">Berlaku Hingga</span><span class="inv-date-val overdue">${formatDate(val('valid-until'))}</span></div>` : ''}
      <div class="inv-date-row"><span class="inv-date-key">Mata Uang</span><span class="inv-date-val">${getCurrency()}</span></div>
    </div>
  </div>
  ${perihal ? `<div class="inv-perihal-bar"><div class="inv-perihal-inner">
    <div class="inv-perihal-dot" style="background:#C76B00"></div>
    <span class="inv-perihal-label">Perihal:</span>
    <span class="inv-perihal-text">${esc(perihal)}</span>
  </div></div>` : ''}
  ${itemsTableHtml()}
  ${summaryBlockHtml()}
  ${terbilangBlockHtml()}
  ${terms.trim() ? `<div class="inv-footer-info"><div class="inv-notes-box" style="border-left-color:#E67700">
    <div class="inv-notes-label">Syarat &amp; Ketentuan</div>
    <div class="inv-notes-text">${esc(terms)}</div>
  </div></div>` : ''}
  ${bankCardsHtml()}
  ${notesBlockHtml()}
  <div class="inv-signature-area">
    <div class="inv-sign-left">Penawaran ini berlaku sesuai tanggal yang tertera. Untuk konfirmasi, hubungi kami.</div>
    <div class="inv-sign-right">
      <div class="inv-sign-box"></div>
      <div class="inv-sign-name">${sigName || esc(val('sender-name')) || '_______________'}</div>
      <div class="inv-sign-title">${sigTitle || 'Hormat Kami'}</div>
    </div>
  </div>`;
}

/* ─── PROPOSAL PREVIEW ─── */
function renderProposalPreview() {
  const cur = getCurrency();
  const closing  = val('proposal-closing');
  const notes    = val('notes');
  const sigName  = esc(val('signatory-name-proposal'));
  const sigTitle = esc(val('signatory-title-proposal'));

  const scopeHtml = scopeItems.length ? `<ul class="prop-scope-list">${scopeItems.map((s,i) =>
    `<li><span class="prop-scope-num">${i+1}</span><span>${esc(s.text)||`<em style="color:#8B93A9">Poin ${i+1}</em>`}</span></li>`
  ).join('')}</ul>` : '';

  const hasTimeline = timelineItems.some(t => t.tahap||t.deskripsi||t.durasi);
  const timelineHtml = hasTimeline ? `<table class="prop-timeline-tbl">
    <thead><tr><th>Tahap</th><th>Deskripsi Kegiatan</th><th>Durasi</th></tr></thead>
    <tbody>${timelineItems.map(t => `<tr><td>${esc(t.tahap)||'–'}</td><td>${esc(t.deskripsi)||'–'}</td><td>${esc(t.durasi)||'–'}</td></tr>`).join('')}</tbody>
  </table>` : '';

  const { subtotal, discountPct, discountAmt, taxPct, taxAmt, total } = calculate();
  const anggaranRows = items.map((item,i) => {
    const sub = parseMoney(item.qty)*parseMoney(item.price);
    return `<tr><td class="td-num">${i+1}</td><td class="td-desc">${esc(item.desc)||`<em style="color:#8B93A9">Item ${i+1}</em>`}</td><td class="td-qty">${item.qty}</td><td class="td-price">${fmtMoney(item.price,cur)}</td><td class="td-sub">${fmtMoney(sub,cur)}</td></tr>`;
  }).join('');

  return `
  <div class="prop-kop">
    <div class="prop-kop-left">
      ${logoDataUrl ? `<div class="prop-kop-logo"><img src="${logoDataUrl}" /></div>` : ''}
      <div>
        <div class="prop-sender-name">${esc(val('sender-name'))||'Nama Perusahaan'}</div>
        <div class="prop-sender-detail">${[val('sender-address'),val('sender-phone'),val('sender-email'),val('sender-website')].filter(Boolean).map(esc).join(' · ')}</div>
        ${val('sender-npwp') ? `<div class="prop-sender-detail">NPWP: ${esc(val('sender-npwp'))}</div>` : ''}
      </div>
    </div>
    <div>
      <div class="prop-doc-label">PROPOSAL</div>
      <div class="prop-doc-number">${esc(val('invoice-number'))||'PRP-000'}</div>
    </div>
  </div>
  <div class="inv-stripe c-proposal"></div>
  <div class="prop-to-section">
    <div class="prop-to-label">Ditujukan Kepada</div>
    <div class="prop-to-name">${esc(val('client-name'))||'Nama Klien'}</div>
    <div class="prop-to-detail">${[val('client-address'),val('client-phone'),val('client-email')].filter(Boolean).map(esc).join(' · ')}</div>
    ${val('proposal-perihal') ? `<div class="prop-to-perihal"><strong>Perihal:</strong> ${esc(val('proposal-perihal'))}</div>` : ''}
    <div class="prop-to-date">Tanggal: ${formatDate(val('invoice-date'))}</div>
  </div>
  <div class="prop-body">
    ${val('proposal-latar') ? `<div class="prop-section-heading">Latar Belakang</div><div class="prop-text">${esc(val('proposal-latar'))}</div>` : ''}
    ${val('proposal-tujuan') ? `<div class="prop-section-heading">Tujuan &amp; Sasaran</div><div class="prop-text">${esc(val('proposal-tujuan'))}</div>` : ''}
    ${scopeItems.length ? `<div class="prop-section-heading">Ruang Lingkup Pekerjaan</div>${scopeHtml}` : ''}
    ${hasTimeline ? `<div class="prop-section-heading">Timeline / Jadwal</div>${timelineHtml}` : ''}
    <div class="prop-section-heading">Rincian Anggaran</div>
  </div>
  <div class="inv-items-area">
    <table class="inv-table">
      <thead><tr><th style="width:30px">#</th><th>Deskripsi</th><th class="th-qty">Qty</th><th class="th-price">Harga</th><th class="th-sub" style="text-align:right">Subtotal</th></tr></thead>
      <tbody>${anggaranRows}</tbody>
    </table>
  </div>
  ${summaryBlockHtml()}
  ${terbilangBlockHtml()}
  ${notes.trim() ? `<div class="inv-footer-info"><div class="inv-notes-box" style="border-left-color:#6741D9"><div class="inv-notes-label">Catatan</div><div class="inv-notes-text">${esc(notes)}</div></div></div>` : ''}
  ${closing ? `<div style="margin:16px 0 0;padding:0 48px;"><div class="prop-closing-box"><div class="prop-section-heading" style="margin-top:0;color:#6741D9">Penutup</div><div class="prop-closing-text">${esc(closing)}</div></div></div>` : ''}
  <div class="prop-sign-area">
    <div class="prop-sign-box">
      <div class="prop-sign-role">Pihak Penerima</div>
      <div class="prop-sign-party">${esc(val('client-name'))||'Penerima'}</div>
      <div class="prop-sign-line">
        <div class="prop-sign-name">( ___________________ )</div>
      </div>
    </div>
    <div class="prop-sign-box">
      <div class="prop-sign-role">Pihak Pengaju</div>
      <div class="prop-sign-party">${esc(val('sender-name'))||'Pengirim'}</div>
      <div class="prop-sign-line">
        <div class="prop-sign-name">${sigName || esc(val('sender-name')) || '( ___________________ )'}</div>
        ${sigTitle ? `<div class="prop-sign-title">${sigTitle}</div>` : ''}
      </div>
    </div>
  </div>`;
}

/* ─── SPK PREVIEW ─── */
function renderSPKPreview() {
  const nilaiRaw = parseMoney(val('spk-nilai'));
  const nilaiText = nilaiRaw > 0 ? 'Rp\u00A0' + Math.round(nilaiRaw).toLocaleString('id-ID') : '–';
  const sigName  = esc(val('spk-signatory-name'));
  const sigTitle = esc(val('spk-signatory-title'));
  const caraBayar= val('spk-cara-bayar');
  const syarat   = val('spk-syarat');
  const lokasi   = val('spk-lokasi');

  const scopeHtml = spkScopeItems.length ? `<ul class="spk-scope-list">${spkScopeItems.map((s,i) =>
    `<li><span class="spk-scope-num">${i+1}</span><span>${esc(s.text)||`<em style="color:#8B93A9">Pekerjaan ${i+1}</em>`}</span></li>`
  ).join('')}</ul>` : '';

  return `
  <div class="spk-kop">
    <div class="spk-kop-inner">
      ${logoDataUrl ? `<div class="spk-kop-logo"><img src="${logoDataUrl}" /></div>` : ''}
      <div>
        <div class="spk-company-name">${esc(val('sender-name'))||'Nama Perusahaan'}</div>
        <div class="spk-company-detail">${[val('sender-address'),val('sender-phone'),val('sender-email'),val('sender-website')].filter(Boolean).map(esc).join(' | ')}</div>
        ${val('sender-npwp') ? `<div class="spk-company-detail">NPWP: ${esc(val('sender-npwp'))}</div>` : ''}
      </div>
    </div>
    <div class="spk-doc-title">Surat Perjanjian Kerjasama</div>
    <div class="spk-doc-number">No: ${esc(val('invoice-number'))||'SPK-000'}</div>
  </div>
  <div class="inv-stripe c-spk"></div>
  <div class="spk-parties">
    <div class="spk-party-box">
      <div class="spk-party-label">Pihak Pertama (Pemberi Kerja)</div>
      <div class="spk-party-name">${esc(val('sender-name'))||'–'}</div>
      <div class="spk-party-detail">${esc(val('sender-address'))}</div>
      ${val('sender-phone') ? `<div class="spk-party-detail">${esc(val('sender-phone'))}</div>` : ''}
      ${val('sender-npwp')  ? `<div class="spk-party-detail">NPWP: ${esc(val('sender-npwp'))}</div>` : ''}
    </div>
    <div class="spk-party-box">
      <div class="spk-party-label">Pihak Kedua (Penerima Kerja)</div>
      <div class="spk-party-name">${esc(val('client-name'))||'–'}</div>
      <div class="spk-party-detail">${esc(val('client-address'))}</div>
      ${val('client-phone') ? `<div class="spk-party-detail">${esc(val('client-phone'))}</div>` : ''}
      ${val('client-npwp')  ? `<div class="spk-party-detail">NPWP: ${esc(val('client-npwp'))}</div>` : ''}
    </div>
  </div>
  <div class="spk-pasal">
    <div class="spk-pasal-title">Pasal 1 – Nama &amp; Ruang Lingkup Pekerjaan</div>
    <div class="spk-pasal-body">
      <strong>Nama Pekerjaan:</strong> ${esc(val('spk-nama'))||'–'}
      ${lokasi ? `<br><strong>Lokasi:</strong> ${esc(lokasi)}` : ''}
      ${spkScopeItems.some(s=>s.text) ? `<br><br>${scopeHtml}` : ''}
    </div>
  </div>
  <div class="spk-pasal">
    <div class="spk-pasal-title">Pasal 2 – Jangka Waktu Pelaksanaan</div>
    <div class="spk-pasal-body">
      Pekerjaan dilaksanakan mulai <strong>${formatDate(val('spk-mulai'))}</strong> dan diselesaikan paling lambat <strong>${formatDate(val('spk-selesai'))}</strong>.
    </div>
  </div>
  <div class="spk-pasal">
    <div class="spk-pasal-title">Pasal 3 – Nilai Kontrak &amp; Pembayaran</div>
    <div class="spk-pasal-body">
      <div class="spk-value-box">
        <div class="spk-value-label">Nilai Kontrak</div>
        <div class="spk-value-amount">${nilaiText}</div>
        ${nilaiRaw > 0 ? `<div style="font-size:10.5px;color:#6B7A99;margin-top:3px;font-style:italic">${terbilangRupiah(nilaiRaw)}</div>` : ''}
      </div>
      ${caraBayar ? `<strong>Cara Pembayaran / Termin:</strong><br><span style="white-space:pre-line;font-size:11px;line-height:1.8;color:#3D4663">${esc(caraBayar)}</span>` : ''}
    </div>
  </div>
  ${syarat ? `<div class="spk-pasal">
    <div class="spk-pasal-title">Pasal 4 – Syarat &amp; Ketentuan Umum</div>
    <div class="spk-pasal-body" style="white-space:pre-line;font-size:11px;line-height:1.9;">${esc(syarat)}</div>
  </div>` : ''}
  <div class="spk-pasal" style="margin-bottom:0">
    <div class="spk-pasal-title">Tanda Tangan Para Pihak</div>
    <div class="spk-pasal-body">Demikian Surat Perjanjian Kerjasama ini dibuat dan ditandatangani pada tanggal <strong>${formatDate(val('invoice-date'))}</strong>.</div>
  </div>
  <div class="spk-sign-area">
    <div class="spk-sign-box">
      <div class="spk-sign-role">Pihak Pertama</div>
      <div class="spk-sign-party">${esc(val('sender-name'))||'Pemberi Kerja'}</div>
      <div class="spk-sign-line">
        <div class="spk-sign-name">${sigName || esc(val('sender-name')).substring(0,22) || '( _______________ )'}</div>
        ${sigTitle ? `<div class="spk-sign-title">${sigTitle}</div>` : ''}
      </div>
    </div>
    <div class="spk-sign-box">
      <div class="spk-sign-role">Pihak Kedua</div>
      <div class="spk-sign-party">${esc(val('client-name'))||'Penerima Kerja'}</div>
      <div class="spk-sign-line">
        <div class="spk-sign-name">${esc(val('client-name')).substring(0,22)||'( _______________ )'}</div>
      </div>
    </div>
  </div>`;
}

/* ═══════════════════════════════════════════════
   EXPORT PDF
═══════════════════════════════════════════════ */
function exportPDF() {
  showToast('Menyiapkan PDF...', 'info');
  const el = document.getElementById('invoice-preview');
  const filename = `${DOC_LABELS[currentDocType]}-${val('invoice-number')||'dokumen'}.pdf`;
  html2pdf().set({
    margin: [10,10,10,10], filename,
    image: { type:'jpeg', quality:0.98 },
    html2canvas: { scale:2, useCORS:true, logging:false },
    jsPDF: { unit:'mm', format:'a4', orientation:'portrait' },
    pagebreak: { mode:['avoid-all', 'css', 'legacy'] },
  }).from(el).save()
    .then(()  => showToast(`✓ ${DOC_LABELS[currentDocType]} berhasil didownload!`, 'success'))
    .catch(() => showToast('Gagal membuat PDF', 'error'));
}

/* ═══════════════════════════════════════════════
   RESET
═══════════════════════════════════════════════ */
function resetForm() {
  if (!confirm(`Reset semua data ${DOC_LABELS[currentDocType]}?`)) return;
  ['sender-name','sender-address','sender-phone','sender-email','sender-website','sender-npwp',
   'client-name','client-address','client-phone','client-email','client-npwp',
   'tax-rate','discount','notes',
   'due-date','valid-until','spk-lokasi',
   'penawaran-perihal','penawaran-terms',
   'proposal-perihal','proposal-latar','proposal-tujuan','proposal-closing',
   'signatory-name','signatory-title','signatory-name-proposal','signatory-title-proposal',
   'spk-nama','spk-nilai','spk-cara-bayar','spk-syarat','spk-signatory-name','spk-signatory-title',
  ].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });

  docStatus = '';
  dpEnabled = false;
  const enableDpEl = document.getElementById('enable-dp');
  if (enableDpEl) enableDpEl.checked = false;
  const dpSectionEl = document.getElementById('dp-section-fields');
  if (dpSectionEl) dpSectionEl.style.display = 'none';
  const dpPercentEl = document.getElementById('dp-percent');
  if (dpPercentEl) dpPercentEl.value = 50;

  document.querySelectorAll('#status-selector .status-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('#status-selector .status-btn').classList.add('active');

  initDefaults();
  removeLogo();

  items         = [{ id:uid(), desc:'', qty:1, price:0 }];
  bankAccounts  = [{ id:uid(), bankCode:'BCA', customName:'', logoUrl:null, accountNumber:'', accountName:'' }];
  scopeItems    = [{ id:uid(), text:'' }];
  spkScopeItems = [{ id:uid(), text:'' }];
  timelineItems = [{ id:uid(), tahap:'', deskripsi:'', durasi:'' }];

  renderAllLists();
  renderPreview();
  showToast('Form berhasil direset', 'info');
}

/* ═══════════════════════════════════════════════
   AUTHENTICATION & SESSION GUARD
═══════════════════════════════════════════════ */
const AUTH_KEY = 'docpro_internal_auth';
const VALID_CREDS = [
  { user: 'Admin Anshel', pass: 'Anshel2026.' },
  { user: 'admin', pass: 'admin123' },
];

function initAuth() {
  const overlay = document.getElementById('login-overlay');
  const loginForm = document.getElementById('login-form');
  const errorAlert = document.getElementById('login-error');
  const logoutBtn = document.getElementById('btn-logout');

  // Check existing session
  const savedSession = sessionStorage.getItem(AUTH_KEY) || localStorage.getItem(AUTH_KEY);
  if (savedSession) {
    try {
      const authData = JSON.parse(savedSession);
      if (authData && authData.isAuth) {
        document.body.classList.remove('auth-locked');
        if (overlay) overlay.classList.add('hidden');
        updateHeaderUser(authData.username || 'Admin Anshel');
      }
    } catch(e) {}
  }

  // Submit login handler
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const u = document.getElementById('login-username').value.trim();
      const p = document.getElementById('login-password').value.trim();

      const isValid = VALID_CREDS.some(c => 
        c.user.toLowerCase() === u.toLowerCase() && c.pass === p
      );

      if (isValid) {
        if (errorAlert) errorAlert.style.display = 'none';
        const sessionPayload = { isAuth: true, username: u, time: Date.now() };
        sessionStorage.setItem(AUTH_KEY, JSON.stringify(sessionPayload));
        localStorage.setItem(AUTH_KEY, JSON.stringify(sessionPayload));
        
        document.body.classList.remove('auth-locked');
        updateHeaderUser(u);
        if (overlay) overlay.classList.add('hidden');
        showToast(`Selamat datang, ${u}! 👋`, 'success');
      } else {
        if (errorAlert) {
          errorAlert.textContent = '❌ Username atau Password salah!';
          errorAlert.style.display = 'block';
        }
      }
    });
  }

  // Logout handler
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem(AUTH_KEY);
      localStorage.removeItem(AUTH_KEY);
      document.body.classList.add('auth-locked');
      if (overlay) overlay.classList.remove('hidden');
      document.getElementById('login-password').value = '';
      showToast('Berhasil keluar dari sistem', 'info');
    });
  }
}

function updateHeaderUser(name) {
  const badgeName = document.querySelector('#header-user-badge .user-name');
  const badgeAvatar = document.querySelector('#header-user-badge .user-avatar');
  if (badgeName) badgeName.textContent = name;
  if (badgeAvatar) {
    const initials = name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();
    badgeAvatar.textContent = initials || 'AA';
  }
}

/* ═══════════════════════════════════════════════
   MOBILE VIEW SWITCHER & PWA REGISTER
═══════════════════════════════════════════════ */
function initMobileAndPWA() {
  // Mobile View Switcher (Form vs Preview)
  const btnForm = document.getElementById('btn-show-form');
  const btnPreview = document.getElementById('btn-show-preview');

  document.body.classList.add('mobile-view-form');

  if (btnForm && btnPreview) {
    btnForm.addEventListener('click', () => {
      document.body.classList.remove('mobile-view-preview');
      document.body.classList.add('mobile-view-form');
      btnForm.classList.add('active');
      btnPreview.classList.remove('active');
    });

    btnPreview.addEventListener('click', () => {
      document.body.classList.remove('mobile-view-form');
      document.body.classList.add('mobile-view-preview');
      btnPreview.classList.add('active');
      btnForm.classList.remove('active');
    });
  }

  // Mobile Sticky Bar Button Event Bindings
  const mobReset = document.getElementById('mobile-btn-reset');
  const mobPrint = document.getElementById('mobile-btn-print');
  const mobPdf   = document.getElementById('mobile-btn-pdf');

  if (mobReset) mobReset.addEventListener('click', resetForm);
  if (mobPrint) mobPrint.addEventListener('click', () => window.print());
  if (mobPdf)   mobPdf.addEventListener('click', exportPDF);

  // Service Worker Registration
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('PWA ServiceWorker ready:', reg.scope))
        .catch(err => console.log('PWA ServiceWorker error:', err));
    });
  }

  // PWA Install Prompt Listener
  let deferredPrompt;
  const installBtn = document.getElementById('btn-pwa-install');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) installBtn.style.display = 'inline-flex';
  });

  if (installBtn) {
    installBtn.addEventListener('click', () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            showToast('Aplikasi DocPro berhasil diinstall! 📱', 'success');
          }
          deferredPrompt = null;
          installBtn.style.display = 'none';
        });
      }
    });
  }
}

// Auto init auth & mobile PWA on load
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initMobileAndPWA();
});

