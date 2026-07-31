/**
 * DocPro – app.js v2
 * Multi-document: Invoice, Proposal, Penawaran, SPK
 * All client-side, no backend required.
 */

/* ═══════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════ */
let currentDocType = 'invoice';
let logoDataUrl    = null;

// Shared: invoice, penawaran, proposal (anggaran)
let items = [{ id: uid(), desc: '', qty: 1, price: 0 }];

// Proposal scope items
let scopeItems    = [{ id: uid(), text: '' }];
// SPK scope items
let spkScopeItems = [{ id: uid(), text: '' }];
// Proposal timeline
let timelineItems = [{ id: uid(), tahap: '', deskripsi: '', durasi: '' }];

/* ═══════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════ */
function uid() { return '_' + Math.random().toString(36).slice(2, 9); }

const DOC_PREFIXES = { invoice: 'INV', proposal: 'PRP', penawaran: 'QUO', spk: 'SPK' };

function generateDocNumber(type) {
  const now  = new Date();
  const y    = now.getFullYear();
  const m    = String(now.getMonth() + 1).padStart(2, '0');
  const d    = String(now.getDate()).padStart(2, '0');
  const rand = String(Math.floor(Math.random() * 900) + 100);
  return `${DOC_PREFIXES[type] || 'DOC'}-${y}${m}${d}-${rand}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '–';
  const [y, m, d] = dateStr.split('-');
  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
}

function parseMoney(val) { return parseFloat(val) || 0; }

const CURRENCY_SYMBOLS  = { IDR: 'Rp', USD: '$', EUR: '€', SGD: 'S$' };
const CURRENCY_LOCALES  = { IDR: 'id-ID', USD: 'en-US', EUR: 'de-DE', SGD: 'en-SG' };

function getCurrency() { return (document.getElementById('currency') || {}).value || 'IDR'; }

function formatMoney(amount, currency) {
  currency = currency || getCurrency();
  const sym = CURRENCY_SYMBOLS[currency] || 'Rp';
  if (currency === 'IDR') return sym + '\u00A0' + Math.round(amount).toLocaleString('id-ID');
  const locale = CURRENCY_LOCALES[currency] || 'en-US';
  return sym + '\u00A0' + amount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatMoneyShort(amount) {
  const currency = getCurrency();
  const sym = CURRENCY_SYMBOLS[currency] || 'Rp';
  if (currency === 'IDR') {
    if (amount >= 1_000_000) return sym + (amount / 1_000_000).toFixed(1).replace('.0', '') + 'jt';
    if (amount >= 1_000)     return sym + Math.round(amount / 1_000) + 'rb';
    return sym + Math.round(amount);
  }
  if (amount >= 1_000_000) return sym + (amount / 1_000_000).toFixed(1) + 'M';
  if (amount >= 1_000)     return sym + (amount / 1_000).toFixed(1) + 'K';
  return sym + amount.toFixed(2);
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function esc(str) { return escHtml(str); }

function val(id) { return (document.getElementById(id) || {}).value || ''; }

function showToast(msg, type = 'info', duration = 2800) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  setTimeout(() => { t.className = 'toast'; }, duration);
}

function calculate() {
  const subtotal    = items.reduce((s, i) => s + parseMoney(i.qty) * parseMoney(i.price), 0);
  const discountPct = parseMoney(val('discount'));
  const taxPct      = parseMoney(val('tax-rate'));
  const discountAmt = subtotal * discountPct / 100;
  const afterDisc   = subtotal - discountAmt;
  const taxAmt      = afterDisc * taxPct / 100;
  const total       = afterDisc + taxAmt;
  return { subtotal, discountPct, discountAmt, taxPct, taxAmt, total };
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
  const todayStr = today.toISOString().split('T')[0];
  const due = new Date(today); due.setDate(due.getDate() + 30);
  const dueStr = due.toISOString().split('T')[0];

  document.getElementById('invoice-number').value = generateDocNumber('invoice');
  document.getElementById('invoice-date').value   = todayStr;
  document.getElementById('due-date').value       = dueStr;

  // SPK defaults
  document.getElementById('spk-mulai').value   = todayStr;
  const spkEnd = new Date(today); spkEnd.setMonth(spkEnd.getMonth() + 3);
  document.getElementById('spk-selesai').value = spkEnd.toISOString().split('T')[0];
}

/* ═══════════════════════════════════════════════
   EVENT BINDING
═══════════════════════════════════════════════ */
function bindEvents() {
  // Doc type tabs
  document.querySelectorAll('.doc-type-btn').forEach(btn => {
    btn.addEventListener('click', () => switchDocType(btn.dataset.type));
  });

  // Logo upload
  document.getElementById('logo-placeholder').addEventListener('click', () =>
    document.getElementById('logo-input').click());
  document.getElementById('logo-input').addEventListener('change', handleLogoUpload);
  document.getElementById('logo-remove-btn').addEventListener('click', removeLogo);

  // Generate doc number
  document.getElementById('btn-generate-inv').addEventListener('click', () => {
    document.getElementById('invoice-number').value = generateDocNumber(currentDocType);
    renderPreview();
    showToast('Nomor dokumen baru digenerate', 'success');
  });

  // Payment method → show/hide bank details
  document.getElementById('payment-method').addEventListener('change', (e) => {
    const bankGroup = document.getElementById('field-bank-details');
    if (bankGroup) bankGroup.style.display = e.target.value === 'Transfer Bank' ? '' : 'none';
    renderPreview();
  });

  // Items
  document.getElementById('btn-add-item').addEventListener('click', addItem);

  // Proposal scope
  document.getElementById('btn-add-scope').addEventListener('click', addScopeItem);

  // Proposal timeline
  document.getElementById('btn-add-timeline').addEventListener('click', addTimelineItem);

  // SPK scope
  document.getElementById('btn-add-spk-scope').addEventListener('click', addSpkScopeItem);

  // Action buttons
  document.getElementById('btn-reset').addEventListener('click', resetForm);
  document.getElementById('btn-pdf').addEventListener('click', exportPDF);
  document.getElementById('btn-pdf-sm').addEventListener('click', exportPDF);
  document.getElementById('btn-print').addEventListener('click', () => window.print());
  document.getElementById('btn-print-sm').addEventListener('click', () => window.print());

  // Live inputs – all inputs/textareas/selects trigger preview update
  document.querySelector('.form-panel').addEventListener('input', renderPreview);
  document.querySelector('.form-panel').addEventListener('change', renderPreview);
}

/* ═══════════════════════════════════════════════
   DOC TYPE SWITCHING
═══════════════════════════════════════════════ */
function switchDocType(type, doToast = true) {
  currentDocType = type;

  // Update tabs
  document.querySelectorAll('.doc-type-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === type);
  });

  // Update section visibility
  updateSectionVisibility();

  // Update labels
  updateDynamicLabels();

  // Reset doc number prefix
  document.getElementById('invoice-number').value = generateDocNumber(type);

  renderPreview();
  if (doToast) showToast(`Mode: ${DOC_LABELS[type]}`, 'info', 1800);
}

const DOC_LABELS = {
  invoice:   'Invoice',
  proposal:  'Proposal',
  penawaran: 'Penawaran',
  spk:       'SPK',
};

function updateSectionVisibility() {
  // Sections with data-types attribute
  document.querySelectorAll('[data-types]').forEach(el => {
    const types = el.dataset.types;
    const show  = types === 'all' || types.split(' ').includes(currentDocType);
    el.style.display = show ? '' : 'none';
  });

  // Conditional FIELDS within sections (data-show-for)
  document.querySelectorAll('[data-show-for]').forEach(el => {
    const types = el.dataset.showFor.split(' ');
    el.style.display = types.includes(currentDocType) ? '' : 'none';
  });
}

function updateDynamicLabels() {
  const isSpk = currentDocType === 'spk';
  const t      = currentDocType;

  // Section titles
  const senderTitle = document.getElementById('sender-section-title');
  const clientTitle = document.getElementById('client-section-title');
  const docTitle    = document.getElementById('doc-detail-title');
  const itemsTitle  = document.getElementById('items-section-title');
  const lblDocNum   = document.getElementById('lbl-doc-number');

  if (senderTitle) senderTitle.textContent = isSpk ? 'Pihak Pertama (Pemberi Kerja)' : 'Informasi Pengirim';
  if (clientTitle) clientTitle.textContent = isSpk ? 'Pihak Kedua (Penerima Kerja)'  : 'Informasi Klien';

  const docTitleMap = { invoice:'Detail Invoice', proposal:'Detail Proposal', penawaran:'Detail Penawaran', spk:'Detail SPK' };
  if (docTitle) docTitle.textContent = docTitleMap[t] || 'Detail Dokumen';

  const numLabelMap = { invoice:'Nomor Invoice', proposal:'Nomor Proposal', penawaran:'Nomor Penawaran', spk:'Nomor SPK' };
  if (lblDocNum) lblDocNum.textContent = numLabelMap[t] || 'Nomor Dokumen';

  const itemsLabelMap = { invoice:'Daftar Item', proposal:'Rincian Anggaran', penawaran:'Daftar Item / Jasa' };
  if (itemsTitle) itemsTitle.textContent = itemsLabelMap[t] || 'Daftar Item';

  const lblSender = document.getElementById('lbl-sender-name');
  const lblClient = document.getElementById('lbl-client-name');
  if (lblSender) lblSender.textContent = isSpk ? 'Nama Perusahaan (Pihak Pertama)' : 'Nama Perusahaan / Pengirim';
  if (lblClient) lblClient.textContent = isSpk ? 'Nama Penerima Kerja (Pihak Kedua)' : 'Nama Klien / Penerima';
}

/* ═══════════════════════════════════════════════
   LOGO
═══════════════════════════════════════════════ */
function handleLogoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { showToast('Ukuran file maks. 2MB', 'error'); return; }
  const reader = new FileReader();
  reader.onload = (ev) => {
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
   ITEMS (Invoice, Penawaran, Proposal Anggaran)
═══════════════════════════════════════════════ */
function addItem() {
  items.push({ id: uid(), desc: '', qty: 1, price: 0 });
  renderItemsList();
  renderPreview();
  setTimeout(() => {
    const inputs = document.querySelectorAll('.item-desc');
    inputs[inputs.length - 1]?.focus();
  }, 50);
}

function deleteItem(id) {
  if (items.length === 1) { showToast('Minimal harus ada satu item', 'error'); return; }
  items = items.filter(i => i.id !== id);
  renderItemsList();
  renderPreview();
}

function handleItemInput(e) {
  const { id, field } = e.target.dataset;
  const item = items.find(i => i.id === id);
  if (!item) return;
  if (field === 'desc')  item.desc  = e.target.value;
  if (field === 'qty')   item.qty   = parseFloat(e.target.value) || 0;
  if (field === 'price') item.price = parseFloat(e.target.value) || 0;
  const row = e.target.closest('.item-row');
  if (row) {
    const sub = row.querySelector('.item-subtotal');
    if (sub) sub.textContent = formatMoneyShort(item.qty * item.price);
  }
  renderPreview();
}

function renderItemsList() {
  const container = document.getElementById('items-list');
  if (!container) return;
  container.innerHTML = '';
  items.forEach(item => {
    const sub = parseMoney(item.qty) * parseMoney(item.price);
    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `
      <input class="item-desc" type="text" placeholder="Nama barang/jasa..." value="${esc(item.desc)}" data-id="${item.id}" data-field="desc" />
      <input class="item-qty"  type="number" placeholder="1" min="0" step="any" value="${item.qty}" data-id="${item.id}" data-field="qty" />
      <input class="item-price" type="number" placeholder="0" min="0" step="any" value="${item.price || ''}" data-id="${item.id}" data-field="price" />
      <div class="item-subtotal">${formatMoneyShort(sub)}</div>
      <button class="item-delete-btn" data-id="${item.id}" title="Hapus">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
        </svg>
      </button>`;
    container.appendChild(row);
  });
  container.querySelectorAll('input[data-id]').forEach(i => i.addEventListener('input', handleItemInput));
  container.querySelectorAll('.item-delete-btn').forEach(b => b.addEventListener('click', e => deleteItem(e.currentTarget.dataset.id)));
}

/* ═══════════════════════════════════════════════
   SCOPE ITEMS (Proposal)
═══════════════════════════════════════════════ */
function addScopeItem() {
  scopeItems.push({ id: uid(), text: '' });
  renderScopeList();
  renderPreview();
  setTimeout(() => {
    const inputs = document.querySelectorAll('#scope-list .scope-text-input');
    inputs[inputs.length - 1]?.focus();
  }, 50);
}

function deleteScopeItem(id) {
  if (scopeItems.length === 1) { showToast('Minimal harus ada satu poin', 'error'); return; }
  scopeItems = scopeItems.filter(i => i.id !== id);
  renderScopeList();
  renderPreview();
}

function renderScopeList() {
  const container = document.getElementById('scope-list');
  if (!container) return;
  container.innerHTML = '';
  scopeItems.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'scope-item-row';
    row.innerHTML = `
      <div class="scope-item-num">${idx + 1}</div>
      <input class="scope-text-input" type="text" placeholder="Poin lingkup pekerjaan..." value="${esc(item.text)}" data-id="${item.id}" />
      <button class="item-delete-btn" data-id="${item.id}" title="Hapus">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
        </svg>
      </button>`;
    container.appendChild(row);
    row.querySelector('input').addEventListener('input', e => {
      const si = scopeItems.find(i => i.id === e.target.dataset.id);
      if (si) si.text = e.target.value;
      renderPreview();
    });
    row.querySelector('.item-delete-btn').addEventListener('click', () => deleteScopeItem(item.id));
  });
}

/* ═══════════════════════════════════════════════
   TIMELINE ITEMS (Proposal)
═══════════════════════════════════════════════ */
function addTimelineItem() {
  timelineItems.push({ id: uid(), tahap: '', deskripsi: '', durasi: '' });
  renderTimelineList();
  renderPreview();
}

function deleteTimelineItem(id) {
  if (timelineItems.length === 1) { showToast('Minimal harus ada satu tahap', 'error'); return; }
  timelineItems = timelineItems.filter(i => i.id !== id);
  renderTimelineList();
  renderPreview();
}

function renderTimelineList() {
  const container = document.getElementById('timeline-list');
  if (!container) return;
  container.innerHTML = '';
  timelineItems.forEach(item => {
    const row = document.createElement('div');
    row.className = 'timeline-item-row';
    row.innerHTML = `
      <input type="text" placeholder="Tahap 1" value="${esc(item.tahap)}" data-id="${item.id}" data-field="tahap" />
      <input type="text" placeholder="Desain & Wireframe" value="${esc(item.deskripsi)}" data-id="${item.id}" data-field="deskripsi" />
      <input type="text" placeholder="2 minggu" value="${esc(item.durasi)}" data-id="${item.id}" data-field="durasi" />
      <button class="item-delete-btn" data-id="${item.id}" title="Hapus">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
        </svg>
      </button>`;
    container.appendChild(row);
    row.querySelectorAll('input[data-id]').forEach(input => {
      input.addEventListener('input', e => {
        const ti = timelineItems.find(i => i.id === e.target.dataset.id);
        if (ti) ti[e.target.dataset.field] = e.target.value;
        renderPreview();
      });
    });
    row.querySelector('.item-delete-btn').addEventListener('click', () => deleteTimelineItem(item.id));
  });
}

/* ═══════════════════════════════════════════════
   SPK SCOPE ITEMS
═══════════════════════════════════════════════ */
function addSpkScopeItem() {
  spkScopeItems.push({ id: uid(), text: '' });
  renderSpkScopeList();
  renderPreview();
  setTimeout(() => {
    const inputs = document.querySelectorAll('#spk-scope-list .scope-text-input');
    inputs[inputs.length - 1]?.focus();
  }, 50);
}

function deleteSpkScopeItem(id) {
  if (spkScopeItems.length === 1) { showToast('Minimal harus ada satu poin', 'error'); return; }
  spkScopeItems = spkScopeItems.filter(i => i.id !== id);
  renderSpkScopeList();
  renderPreview();
}

function renderSpkScopeList() {
  const container = document.getElementById('spk-scope-list');
  if (!container) return;
  container.innerHTML = '';
  spkScopeItems.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'scope-item-row';
    row.innerHTML = `
      <div class="scope-item-num">${idx + 1}</div>
      <input class="scope-text-input" type="text" placeholder="Poin pekerjaan..." value="${esc(item.text)}" data-id="${item.id}" />
      <button class="item-delete-btn" data-id="${item.id}" title="Hapus">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
        </svg>
      </button>`;
    container.appendChild(row);
    row.querySelector('input').addEventListener('input', e => {
      const si = spkScopeItems.find(i => i.id === e.target.dataset.id);
      if (si) si.text = e.target.value;
      renderPreview();
    });
    row.querySelector('.item-delete-btn').addEventListener('click', () => deleteSpkScopeItem(item.id));
  });
}

function renderAllLists() {
  renderItemsList();
  renderScopeList();
  renderTimelineList();
  renderSpkScopeList();
}

/* ═══════════════════════════════════════════════
   PREVIEW RENDERING – MAIN DISPATCHER
═══════════════════════════════════════════════ */
function renderPreview() {
  const el = document.getElementById('invoice-preview');
  if (!el) return;
  const renderers = {
    invoice:   renderInvoicePreview,
    penawaran: renderPenawaranPreview,
    proposal:  renderProposalPreview,
    spk:       renderSPKPreview,
  };
  el.innerHTML = (renderers[currentDocType] || renderers.invoice)();
}

/* Helper: logo HTML */
function logoHtml(maxW = '110px', maxH = '72px') {
  if (!logoDataUrl) return '';
  return `<img src="${logoDataUrl}" alt="Logo" style="max-width:${maxW};max-height:${maxH};object-fit:contain;display:block;" />`;
}

/* Helper: items table rows */
function itemsTableRows() {
  const cur = getCurrency();
  return items.map((item, idx) => {
    const sub = parseMoney(item.qty) * parseMoney(item.price);
    return `<tr>
      <td>${idx + 1}</td>
      <td class="td-desc-main">${esc(item.desc) || `<em style="color:#9CA3AF">Item ${idx + 1}</em>`}</td>
      <td class="td-qty">${item.qty}</td>
      <td class="td-price">${formatMoney(item.price, cur)}</td>
      <td class="td-sub">${formatMoney(sub, cur)}</td>
    </tr>`;
  }).join('');
}

/* Helper: summary block */
function summaryHtml() {
  const { subtotal, discountPct, discountAmt, taxPct, taxAmt, total } = calculate();
  const cur = getCurrency();
  let html = `
    <div class="inv-summary-wrap"><div class="inv-summary">
      <div class="inv-sum-row"><span>Subtotal</span><span>${formatMoney(subtotal, cur)}</span></div>`;
  if (discountPct > 0) html += `
      <div class="inv-sum-row discount-row"><span>Diskon (${discountPct}%)</span><span>– ${formatMoney(discountAmt, cur)}</span></div>`;
  if (taxPct > 0) html += `
      <div class="inv-sum-row tax-row"><span>PPN (${taxPct}%)</span><span>${formatMoney(taxAmt, cur)}</span></div>`;
  html += `
      <div class="inv-sum-divider"></div>
      <div class="inv-sum-row total-row"><span>TOTAL</span><span>${formatMoney(total, cur)}</span></div>
    </div></div>`;
  return html;
}

/* ─── INVOICE PREVIEW ─── */
function renderInvoicePreview() {
  const paymentMethod = val('payment-method');
  const bankDetails   = val('bank-details');
  const notes         = val('notes');
  const dueDate       = val('due-date');

  return `
    <div class="inv-header">
      <div class="inv-header-left">
        <div class="inv-logo-wrap">${logoHtml()}</div>
        <div class="inv-sender">
          <div class="inv-sender-name">${esc(val('sender-name')) || 'Nama Perusahaan'}</div>
          ${val('sender-address') ? `<div class="inv-sender-detail">${esc(val('sender-address'))}</div>` : ''}
          ${val('sender-phone')   ? `<div class="inv-sender-detail">${esc(val('sender-phone'))}</div>` : ''}
          ${val('sender-email')   ? `<div class="inv-sender-detail">${esc(val('sender-email'))}</div>` : ''}
        </div>
      </div>
      <div class="inv-header-right">
        <div class="inv-title color-invoice">INVOICE</div>
        <div class="inv-number">#${esc(val('invoice-number')) || 'INV-000'}</div>
      </div>
    </div>

    <div class="inv-divider color-invoice"></div>

    <div class="inv-meta">
      <div class="inv-meta-block">
        <div class="inv-meta-label">Ditagihkan Kepada</div>
        <div class="inv-client-name">${esc(val('client-name')) || 'Nama Klien'}</div>
        ${val('client-address') ? `<div class="inv-client-detail">${esc(val('client-address'))}</div>` : ''}
        ${val('client-phone')   ? `<div class="inv-client-detail">${esc(val('client-phone'))}</div>` : ''}
        ${val('client-email')   ? `<div class="inv-client-detail">${esc(val('client-email'))}</div>` : ''}
      </div>
      <div class="inv-meta-block inv-dates">
        <div class="inv-date-row"><span class="inv-date-label">Tanggal</span><span class="inv-date-value">${formatDate(val('invoice-date'))}</span></div>
        ${dueDate ? `<div class="inv-date-row"><span class="inv-date-label">Jatuh Tempo</span><span class="inv-date-value due-highlight">${formatDate(dueDate)}</span></div>` : ''}
        <div class="inv-date-row"><span class="inv-date-label">Mata Uang</span><span class="inv-date-value">${getCurrency()}</span></div>
      </div>
    </div>

    <table class="inv-table">
      <thead><tr>
        <th style="width:28px">#</th>
        <th>Deskripsi</th>
        <th style="width:50px;text-align:center">Qty</th>
        <th style="width:110px;text-align:right">Harga Satuan</th>
        <th style="width:115px;text-align:right">Subtotal</th>
      </tr></thead>
      <tbody>${itemsTableRows()}</tbody>
    </table>

    ${summaryHtml()}

    ${paymentMethod ? `
    <div class="inv-footer-section">
      <div class="inv-footer-label">Metode Pembayaran</div>
      <div class="inv-footer-value">${esc(paymentMethod)}</div>
      ${bankDetails ? `<div class="inv-footer-bank">${esc(bankDetails)}</div>` : ''}
    </div>` : ''}

    ${notes.trim() ? `
    <div class="inv-footer-section">
      <div class="inv-footer-label">Catatan</div>
      <div class="inv-footer-value notes-text">${esc(notes)}</div>
    </div>` : ''}

    <div class="inv-stamp-area">
      <div class="inv-stamp-box">
        <div class="inv-stamp-name">${esc(val('sender-name')).substring(0, 20)}</div>
        <div class="inv-stamp-label">Tanda Tangan &amp; Cap</div>
      </div>
      <div class="inv-thank-you">Terima kasih atas kepercayaan Anda!</div>
    </div>`;
}

/* ─── PENAWARAN PREVIEW ─── */
function renderPenawaranPreview() {
  const paymentMethod = val('payment-method');
  const bankDetails   = val('bank-details');
  const notes         = val('notes');
  const terms         = val('penawaran-terms');
  const perihal       = val('penawaran-perihal');

  return `
    <div class="inv-header">
      <div class="inv-header-left">
        <div class="inv-logo-wrap">${logoHtml()}</div>
        <div class="inv-sender">
          <div class="inv-sender-name">${esc(val('sender-name')) || 'Nama Perusahaan'}</div>
          ${val('sender-address') ? `<div class="inv-sender-detail">${esc(val('sender-address'))}</div>` : ''}
          ${val('sender-phone')   ? `<div class="inv-sender-detail">${esc(val('sender-phone'))}</div>` : ''}
          ${val('sender-email')   ? `<div class="inv-sender-detail">${esc(val('sender-email'))}</div>` : ''}
        </div>
      </div>
      <div class="inv-header-right">
        <div class="inv-title color-penawaran">PENAWARAN</div>
        <div class="inv-number">#${esc(val('invoice-number')) || 'QUO-000'}</div>
      </div>
    </div>

    <div class="inv-divider color-penawaran"></div>

    <div class="inv-meta">
      <div class="inv-meta-block">
        <div class="inv-meta-label">Ditujukan Kepada</div>
        <div class="inv-client-name">${esc(val('client-name')) || 'Nama Klien'}</div>
        ${val('client-address') ? `<div class="inv-client-detail">${esc(val('client-address'))}</div>` : ''}
        ${val('client-phone')   ? `<div class="inv-client-detail">${esc(val('client-phone'))}</div>` : ''}
        ${val('client-email')   ? `<div class="inv-client-detail">${esc(val('client-email'))}</div>` : ''}
      </div>
      <div class="inv-meta-block inv-dates">
        <div class="inv-date-row"><span class="inv-date-label">Tanggal</span><span class="inv-date-value">${formatDate(val('invoice-date'))}</span></div>
        ${val('valid-until') ? `<div class="inv-date-row"><span class="inv-date-label">Berlaku Hingga</span><span class="inv-date-value due-highlight">${formatDate(val('valid-until'))}</span></div>` : ''}
        <div class="inv-date-row"><span class="inv-date-label">Mata Uang</span><span class="inv-date-value">${getCurrency()}</span></div>
      </div>
    </div>

    ${perihal ? `
    <div class="inv-perihal-bar color-penawaran">
      <div class="inv-perihal-label">Perihal</div>
      <div class="inv-perihal-text">${esc(perihal)}</div>
    </div>` : ''}

    <table class="inv-table">
      <thead><tr>
        <th style="width:28px">#</th>
        <th>Deskripsi</th>
        <th style="width:50px;text-align:center">Qty</th>
        <th style="width:110px;text-align:right">Harga Satuan</th>
        <th style="width:115px;text-align:right">Subtotal</th>
      </tr></thead>
      <tbody>${itemsTableRows()}</tbody>
    </table>

    ${summaryHtml()}

    ${terms.trim() ? `
    <div class="inv-footer-section color-penawaran">
      <div class="inv-footer-label">Syarat &amp; Ketentuan</div>
      <div class="inv-footer-value terms-text">${esc(terms)}</div>
    </div>` : ''}

    ${paymentMethod ? `
    <div class="inv-footer-section color-penawaran">
      <div class="inv-footer-label">Metode Pembayaran</div>
      <div class="inv-footer-value">${esc(paymentMethod)}</div>
      ${bankDetails ? `<div class="inv-footer-bank">${esc(bankDetails)}</div>` : ''}
    </div>` : ''}

    ${notes.trim() ? `
    <div class="inv-footer-section color-penawaran">
      <div class="inv-footer-label">Catatan</div>
      <div class="inv-footer-value notes-text">${esc(notes)}</div>
    </div>` : ''}

    <div class="inv-stamp-area">
      <div class="inv-stamp-box">
        <div class="inv-stamp-name">${esc(val('sender-name')).substring(0, 20)}</div>
        <div class="inv-stamp-label">Hormat Kami</div>
      </div>
      <div class="inv-thank-you">Penawaran ini dapat dinegosiasikan.</div>
    </div>`;
}

/* ─── PROPOSAL PREVIEW ─── */
function renderProposalPreview() {
  const cur = getCurrency();
  const perihal  = val('proposal-perihal');
  const latar    = val('proposal-latar');
  const tujuan   = val('proposal-tujuan');
  const closing  = val('proposal-closing');
  const notes    = val('notes');

  // Scope list
  const scopeHtml = scopeItems.length
    ? `<ul class="prop-scope-list">${scopeItems.map((s, i) =>
        `<li><span class="prop-scope-num">${i+1}</span><span>${esc(s.text) || `<em style="color:#9CA3AF">Poin ${i+1}</em>`}</span></li>`
      ).join('')}</ul>`
    : '';

  // Timeline table
  const hasTimeline = timelineItems.some(t => t.tahap || t.deskripsi || t.durasi);
  const timelineHtml = hasTimeline ? `
    <table class="prop-timeline-table" style="width:100%;border-collapse:collapse;">
      <thead><tr>
        <th>Tahap</th><th>Deskripsi Kegiatan</th><th>Durasi</th>
      </tr></thead>
      <tbody>${timelineItems.map(t => `<tr>
        <td>${esc(t.tahap) || '–'}</td>
        <td>${esc(t.deskripsi) || '–'}</td>
        <td>${esc(t.durasi) || '–'}</td>
      </tr>`).join('')}</tbody>
    </table>` : '';

  // Anggaran
  const { subtotal, discountPct, discountAmt, taxPct, taxAmt, total } = calculate();
  const anggaranRows = items.map((item, idx) => {
    const sub = parseMoney(item.qty) * parseMoney(item.price);
    return `<tr>
      <td>${idx + 1}</td>
      <td class="td-desc-main">${esc(item.desc) || `<em style="color:#9CA3AF">Item ${idx + 1}</em>`}</td>
      <td class="td-qty">${item.qty}</td>
      <td class="td-price">${formatMoney(item.price, cur)}</td>
      <td class="td-sub">${formatMoney(sub, cur)}</td>
    </tr>`;
  }).join('');

  return `
    <div class="prop-header">
      <div class="prop-logo-sender">
        ${logoHtml('80px','56px')}
        <div>
          <div class="prop-sender-name">${esc(val('sender-name')) || 'Nama Perusahaan'}</div>
          ${val('sender-address') ? `<div class="prop-sender-detail">${esc(val('sender-address'))}</div>` : ''}
          ${val('sender-phone')   ? `<div class="prop-sender-detail">${esc(val('sender-phone'))}</div>` : ''}
          ${val('sender-email')   ? `<div class="prop-sender-detail">${esc(val('sender-email'))}</div>` : ''}
        </div>
      </div>
      <div class="prop-title-block">
        <div class="prop-doc-label">PROPOSAL</div>
        <div class="prop-doc-number">${esc(val('invoice-number')) || 'PRP-000'}</div>
      </div>
    </div>

    <div class="inv-divider color-proposal"></div>

    <div class="prop-to-block">
      <div class="prop-to-label">Ditujukan Kepada</div>
      <div class="prop-to-name">${esc(val('client-name')) || 'Nama Klien / Penerima'}</div>
      ${val('client-address') ? `<div class="prop-to-detail">${esc(val('client-address'))}</div>` : ''}
      ${val('client-phone')   ? `<div class="prop-to-detail">${esc(val('client-phone'))}</div>` : ''}
      ${perihal ? `<div class="prop-perihal" style="margin-top:10px;"><span class="prop-perihal-label">Perihal: </span><span class="prop-perihal-val">${esc(perihal)}</span></div>` : ''}
      <div class="prop-date-info">Tanggal: ${formatDate(val('invoice-date'))}</div>
    </div>

    ${latar ? `<div class="prop-section-heading">Latar Belakang</div>
    <div class="prop-body-text">${esc(latar)}</div>` : ''}

    ${tujuan ? `<div class="prop-section-heading">Tujuan &amp; Sasaran</div>
    <div class="prop-body-text">${esc(tujuan)}</div>` : ''}

    ${scopeItems.length ? `<div class="prop-section-heading">Ruang Lingkup Pekerjaan</div>
    ${scopeHtml}` : ''}

    ${hasTimeline ? `<div class="prop-section-heading">Timeline / Jadwal</div>
    ${timelineHtml}` : ''}

    <div class="prop-section-heading">Rincian Anggaran</div>
    <table class="inv-table">
      <thead><tr>
        <th style="width:28px">#</th>
        <th>Deskripsi</th>
        <th style="width:50px;text-align:center">Qty</th>
        <th style="width:110px;text-align:right">Harga</th>
        <th style="width:115px;text-align:right">Subtotal</th>
      </tr></thead>
      <tbody>${anggaranRows}</tbody>
    </table>
    ${summaryHtml()}

    ${notes.trim() ? `<div class="inv-footer-section" style="border-left-color:#7C3AED;">
      <div class="inv-footer-label">Catatan</div>
      <div class="inv-footer-value notes-text">${esc(notes)}</div>
    </div>` : ''}

    ${closing ? `
    <div class="prop-closing">
      <div class="prop-section-heading" style="margin-top:0;margin-bottom:8px;">Penutup</div>
      <div class="prop-closing-text">${esc(closing)}</div>
    </div>` : ''}

    <div class="prop-sign-area">
      <div class="prop-sign-box">
        <div class="prop-sign-line"></div>
        <div class="prop-sign-name">${esc(val('client-name')).substring(0, 24) || 'Penerima'}</div>
        <div class="prop-sign-role">Pihak Penerima</div>
      </div>
      <div class="prop-sign-box">
        <div class="prop-sign-line"></div>
        <div class="prop-sign-name">${esc(val('sender-name')).substring(0, 24) || 'Pengirim'}</div>
        <div class="prop-sign-role">Pihak Pengaju</div>
      </div>
    </div>`;
}

/* ─── SPK PREVIEW ─── */
function renderSPKPreview() {
  const nilaiRaw  = parseMoney(val('spk-nilai'));
  const nilaiText = nilaiRaw > 0 ? 'Rp\u00A0' + Math.round(nilaiRaw).toLocaleString('id-ID') : '–';
  const caraBayar = val('spk-cara-bayar');
  const syarat    = val('spk-syarat');
  const lokasi    = val('spk-lokasi');

  // Scope list
  const scopeHtml = spkScopeItems.length
    ? `<ul class="spk-scope-list">${spkScopeItems.map((s, i) =>
        `<li><span class="spk-scope-num">${i+1}</span><span>${esc(s.text) || `<em style="color:#9CA3AF">Pekerjaan ${i+1}</em>`}</span></li>`
      ).join('')}</ul>`
    : '';

  return `
    <div class="spk-kop">
      <div class="spk-kop-logo">
        ${logoHtml('72px','50px')}
        <div>
          <div class="spk-company-name">${esc(val('sender-name')) || 'Nama Perusahaan'}</div>
          ${val('sender-address') ? `<div class="spk-company-detail">${esc(val('sender-address'))}</div>` : ''}
          ${val('sender-phone')   ? `<div class="spk-company-detail">${esc(val('sender-phone'))}</div>` : ''}
          ${val('sender-email')   ? `<div class="spk-company-detail">${esc(val('sender-email'))}</div>` : ''}
        </div>
      </div>
      <div class="spk-doc-title">Surat Perintah Kerja</div>
      <div class="spk-doc-number">No: ${esc(val('invoice-number')) || 'SPK-000'}</div>
    </div>

    <div class="spk-parties">
      <div class="spk-party-box">
        <div class="spk-party-label">Pihak Pertama (Pemberi Kerja)</div>
        <div class="spk-party-name">${esc(val('sender-name')) || '–'}</div>
        <div class="spk-party-detail">${esc(val('sender-address'))}</div>
        ${val('sender-phone') ? `<div class="spk-party-detail">${esc(val('sender-phone'))}</div>` : ''}
      </div>
      <div class="spk-party-box">
        <div class="spk-party-label">Pihak Kedua (Penerima Kerja)</div>
        <div class="spk-party-name">${esc(val('client-name')) || '–'}</div>
        <div class="spk-party-detail">${esc(val('client-address'))}</div>
        ${val('client-phone') ? `<div class="spk-party-detail">${esc(val('client-phone'))}</div>` : ''}
      </div>
    </div>

    <div class="spk-pasal">
      <div class="spk-pasal-title">Pasal 1 – Nama &amp; Ruang Lingkup Pekerjaan</div>
      <div class="spk-pasal-body">
        <strong>Nama Pekerjaan:</strong> ${esc(val('spk-nama')) || '–'}
        ${lokasi ? `<br><strong>Lokasi:</strong> ${esc(lokasi)}` : ''}
        <br><br>
        ${scopeHtml}
      </div>
    </div>

    <div class="spk-pasal">
      <div class="spk-pasal-title">Pasal 2 – Jangka Waktu Pekerjaan</div>
      <div class="spk-pasal-body">
        Pekerjaan dimulai pada <strong>${formatDate(val('spk-mulai'))}</strong> dan diselesaikan paling lambat pada <strong>${formatDate(val('spk-selesai'))}</strong>.
      </div>
    </div>

    <div class="spk-pasal">
      <div class="spk-pasal-title">Pasal 3 – Nilai Kontrak</div>
      <div class="spk-pasal-body">
        <div class="spk-value-box">
          <div class="spk-value-label">Nilai Kontrak</div>
          <div class="spk-value-amount">${nilaiText}</div>
        </div>
        ${caraBayar ? `<strong>Cara Pembayaran / Termin:</strong><br><span style="white-space:pre-line;font-size:11px;line-height:1.8;">${esc(caraBayar)}</span>` : ''}
      </div>
    </div>

    ${syarat ? `
    <div class="spk-pasal">
      <div class="spk-pasal-title">Pasal 4 – Syarat &amp; Ketentuan Umum</div>
      <div class="spk-pasal-body" style="white-space:pre-line;font-size:11px;line-height:1.8;">${esc(syarat)}</div>
    </div>` : ''}

    <div class="spk-pasal" style="margin-bottom:0;">
      <div class="spk-pasal-title">Tanda Tangan Para Pihak</div>
      <div class="spk-pasal-body" style="margin-bottom:4px;">Demikian Surat Perintah Kerja ini dibuat dan ditandatangani pada tanggal <strong>${formatDate(val('invoice-date'))}</strong>.</div>
    </div>

    <div class="spk-sign-area">
      <div class="spk-sign-box">
        <div class="spk-sign-role">Pihak Pertama</div>
        <div class="spk-sign-party">${esc(val('sender-name')) || 'Pemberi Kerja'}</div>
        <div class="spk-sign-line">
          <div class="spk-sign-name">${esc(val('sender-name')).substring(0, 22) || '( ________________ )'}</div>
        </div>
      </div>
      <div class="spk-sign-box">
        <div class="spk-sign-role">Pihak Kedua</div>
        <div class="spk-sign-party">${esc(val('client-name')) || 'Penerima Kerja'}</div>
        <div class="spk-sign-line">
          <div class="spk-sign-name">${esc(val('client-name')).substring(0, 22) || '( ________________ )'}</div>
        </div>
      </div>
    </div>`;
}

/* ═══════════════════════════════════════════════
   EXPORT PDF
═══════════════════════════════════════════════ */
function exportPDF() {
  showToast('Menyiapkan PDF...', 'info');
  const el       = document.getElementById('invoice-preview');
  const docNum   = val('invoice-number') || 'dokumen';
  const typeLabel= DOC_LABELS[currentDocType] || 'dokumen';
  const filename = `${typeLabel}-${docNum}.pdf`;

  const opt = {
    margin:     [10, 10, 10, 10],
    filename:   filename,
    image:      { type: 'jpeg', quality: 0.98 },
    html2canvas:{ scale: 2, useCORS: true, logging: false },
    jsPDF:      { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak:  { mode: ['avoid-all'] },
  };

  html2pdf().set(opt).from(el).save()
    .then(()  => showToast(`✓ ${typeLabel} berhasil didownload!`, 'success'))
    .catch(() => showToast('Gagal membuat PDF, coba lagi', 'error'));
}

/* ═══════════════════════════════════════════════
   RESET FORM
═══════════════════════════════════════════════ */
function resetForm() {
  if (!confirm(`Reset semua data ${DOC_LABELS[currentDocType]}? Aksi ini tidak bisa dibatalkan.`)) return;

  // Clear common fields
  ['sender-name','sender-address','sender-phone','sender-email',
   'client-name','client-address','client-phone','client-email',
   'tax-rate','discount','notes','payment-method','bank-details',
   'due-date','valid-until','spk-lokasi',
   'penawaran-perihal','penawaran-terms',
   'proposal-perihal','proposal-latar','proposal-tujuan','proposal-closing',
   'spk-nama','spk-nilai','spk-cara-bayar','spk-syarat',
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  document.getElementById('payment-method').value = '';
  document.getElementById('field-bank-details').style.display = 'none';

  initDefaults();

  // Reset logo
  removeLogo();

  // Reset lists
  items         = [{ id: uid(), desc: '', qty: 1, price: 0 }];
  scopeItems    = [{ id: uid(), text: '' }];
  spkScopeItems = [{ id: uid(), text: '' }];
  timelineItems = [{ id: uid(), tahap: '', deskripsi: '', durasi: '' }];

  renderAllLists();
  renderPreview();
  showToast('Form berhasil direset', 'info');
}
