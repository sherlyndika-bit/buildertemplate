/**
 * Invoice Generator Pro – app.js
 * Full client-side logic: real-time preview, PDF export, print
 */

/* ═══════════════════════════════════════
   STATE
═══════════════════════════════════════ */
let logoDataUrl = null;
let items = [
  { id: uid(), desc: '', qty: 1, price: 0 }
];

/* ═══════════════════════════════════════
   UTILS
═══════════════════════════════════════ */
function uid() {
  return '_' + Math.random().toString(36).slice(2, 9);
}

function generateInvoiceNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = String(Math.floor(Math.random() * 900) + 100);
  return `INV-${y}${m}${d}-${rand}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '–';
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
  return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
}

function parseMoney(val) {
  return parseFloat(val) || 0;
}

const CURRENCY_SYMBOLS = {
  IDR: 'Rp',
  USD: '$',
  EUR: '€',
  SGD: 'S$',
};

const CURRENCY_LOCALES = {
  IDR: 'id-ID',
  USD: 'en-US',
  EUR: 'de-DE',
  SGD: 'en-SG',
};

function formatMoney(amount, currency) {
  currency = currency || getCurrencyValue();
  const locale = CURRENCY_LOCALES[currency] || 'id-ID';
  const sym = CURRENCY_SYMBOLS[currency] || 'Rp';
  if (currency === 'IDR') {
    return sym + ' ' + Math.round(amount).toLocaleString('id-ID');
  }
  return sym + ' ' + amount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getCurrencyValue() {
  return document.getElementById('currency').value || 'IDR';
}

function showToast(msg, type = 'info', duration = 2800) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  setTimeout(() => { toast.className = 'toast'; }, duration);
}

/* ═══════════════════════════════════════
   INIT
═══════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initDefaults();
  renderItems();
  updatePreview();
  bindEvents();
});

function initDefaults() {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const due = new Date(today);
  due.setDate(due.getDate() + 30);
  const dueStr = due.toISOString().split('T')[0];

  document.getElementById('invoice-number').value = generateInvoiceNumber();
  document.getElementById('invoice-date').value = todayStr;
  document.getElementById('due-date').value = dueStr;
}

/* ═══════════════════════════════════════
   EVENTS
═══════════════════════════════════════ */
function bindEvents() {
  // Logo upload
  const logoArea = document.getElementById('logo-upload-area');
  const logoInput = document.getElementById('logo-input');
  const logoPlaceholder = document.getElementById('logo-placeholder');
  const logoPreview = document.getElementById('logo-preview');
  const logoRemove = document.getElementById('logo-remove-btn');

  logoPlaceholder.addEventListener('click', () => logoInput.click());
  logoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast('Ukuran file maks. 2MB', 'error'); return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      logoDataUrl = ev.target.result;
      logoPreview.src = logoDataUrl;
      logoPreview.hidden = false;
      logoPlaceholder.style.display = 'none';
      logoRemove.hidden = false;
      updatePreview();
    };
    reader.readAsDataURL(file);
  });

  logoRemove.addEventListener('click', () => {
    logoDataUrl = null;
    logoInput.value = '';
    logoPreview.hidden = true;
    logoPlaceholder.style.display = '';
    logoRemove.hidden = true;
    updatePreview();
  });

  // Form inputs
  const liveInputs = document.querySelectorAll(
    '#sender-name, #sender-address, #sender-phone, #sender-email,' +
    '#client-name, #client-address, #client-phone, #client-email,' +
    '#invoice-number, #invoice-date, #due-date, #currency,' +
    '#tax-rate, #discount, #notes, #payment-method, #bank-details'
  );
  liveInputs.forEach(el => {
    el.addEventListener('input', updatePreview);
    el.addEventListener('change', updatePreview);
  });

  // Payment method show/hide bank details
  document.getElementById('payment-method').addEventListener('change', (e) => {
    const bankGroup = document.getElementById('bank-details-group');
    bankGroup.style.display = e.target.value === 'Transfer Bank' ? 'flex' : 'none';
    updatePreview();
  });

  // Generate invoice number
  document.getElementById('btn-generate-inv').addEventListener('click', () => {
    document.getElementById('invoice-number').value = generateInvoiceNumber();
    updatePreview();
    showToast('Nomor invoice baru digenerate', 'success');
  });

  // Add item
  document.getElementById('btn-add-item').addEventListener('click', addItem);

  // Reset
  document.getElementById('btn-reset').addEventListener('click', resetForm);

  // PDF buttons
  document.getElementById('btn-pdf').addEventListener('click', exportPDF);
  document.getElementById('btn-pdf-sm').addEventListener('click', exportPDF);

  // Print buttons
  document.getElementById('btn-print').addEventListener('click', printInvoice);
  document.getElementById('btn-print-sm').addEventListener('click', printInvoice);
}

/* ═══════════════════════════════════════
   ITEMS
═══════════════════════════════════════ */
function addItem() {
  items.push({ id: uid(), desc: '', qty: 1, price: 0 });
  renderItems();
  updatePreview();
  // Focus new description input
  setTimeout(() => {
    const inputs = document.querySelectorAll('.item-desc');
    inputs[inputs.length - 1]?.focus();
  }, 50);
}

function deleteItem(id) {
  if (items.length === 1) {
    showToast('Minimal harus ada satu item', 'error');
    return;
  }
  items = items.filter(item => item.id !== id);
  renderItems();
  updatePreview();
}

function renderItems() {
  const container = document.getElementById('items-list');
  container.innerHTML = '';
  items.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'item-row';
    row.dataset.id = item.id;

    const subtotal = parseMoney(item.qty) * parseMoney(item.price);

    row.innerHTML = `
      <input class="item-desc" type="text" placeholder="Nama barang/jasa..." value="${escHtml(item.desc)}" data-id="${item.id}" data-field="desc" />
      <input class="item-qty" type="number" placeholder="1" min="0" step="any" value="${item.qty}" data-id="${item.id}" data-field="qty" />
      <input class="item-price" type="number" placeholder="0" min="0" step="any" value="${item.price || ''}" data-id="${item.id}" data-field="price" />
      <div class="item-subtotal">${formatMoneyShort(subtotal)}</div>
      <button class="item-delete-btn" data-id="${item.id}" title="Hapus item">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
          <path d="M10 11v6M14 11v6"></path>
          <path d="M9 6V4h6v2"></path>
        </svg>
      </button>
    `;

    container.appendChild(row);
  });

  // Bind item events
  container.querySelectorAll('input[data-id]').forEach(input => {
    input.addEventListener('input', handleItemInput);
  });
  container.querySelectorAll('.item-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => deleteItem(e.currentTarget.dataset.id));
  });
}

function handleItemInput(e) {
  const { id, field } = e.target.dataset;
  const item = items.find(i => i.id === id);
  if (!item) return;

  if (field === 'desc') item.desc = e.target.value;
  else if (field === 'qty') item.qty = parseFloat(e.target.value) || 0;
  else if (field === 'price') item.price = parseFloat(e.target.value) || 0;

  // Update subtotal display
  const row = e.target.closest('.item-row');
  if (row) {
    const sub = row.querySelector('.item-subtotal');
    if (sub) sub.textContent = formatMoneyShort(item.qty * item.price);
  }

  updatePreview();
}

function formatMoneyShort(amount) {
  const currency = getCurrencyValue();
  if (currency === 'IDR') {
    if (amount >= 1_000_000) return 'Rp ' + (amount / 1_000_000).toFixed(1).replace('.0', '') + 'jt';
    if (amount >= 1_000) return 'Rp ' + Math.round(amount / 1000) + 'rb';
    return 'Rp ' + Math.round(amount);
  }
  const sym = CURRENCY_SYMBOLS[currency] || '';
  if (amount >= 1_000_000) return sym + (amount / 1_000_000).toFixed(1) + 'M';
  if (amount >= 1_000) return sym + (amount / 1_000).toFixed(1) + 'K';
  return sym + amount.toFixed(2);
}

function escHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ═══════════════════════════════════════
   CALCULATIONS
═══════════════════════════════════════ */
function calculate() {
  const subtotal = items.reduce((sum, item) => sum + parseMoney(item.qty) * parseMoney(item.price), 0);
  const discountPct = parseMoney(document.getElementById('discount').value);
  const taxPct = parseMoney(document.getElementById('tax-rate').value);

  const discountAmt = subtotal * discountPct / 100;
  const afterDiscount = subtotal - discountAmt;
  const taxAmt = afterDiscount * taxPct / 100;
  const total = afterDiscount + taxAmt;

  return { subtotal, discountPct, discountAmt, taxPct, taxAmt, total };
}

/* ═══════════════════════════════════════
   PREVIEW UPDATE
═══════════════════════════════════════ */
function updatePreview() {
  const currency = getCurrencyValue();

  // Sender
  setText('prev-sender-name', document.getElementById('sender-name').value || 'Nama Perusahaan');
  setText('prev-sender-address', document.getElementById('sender-address').value);
  setText('prev-sender-phone', document.getElementById('sender-phone').value);
  setText('prev-sender-email', document.getElementById('sender-email').value);

  // Client
  setText('prev-client-name', document.getElementById('client-name').value || 'Nama Klien');
  setText('prev-client-address', document.getElementById('client-address').value);
  setText('prev-client-phone', document.getElementById('client-phone').value);
  setText('prev-client-email', document.getElementById('client-email').value);

  // Invoice details
  setText('prev-invoice-number', '#' + (document.getElementById('invoice-number').value || 'INV-000'));
  setText('prev-invoice-date', formatDate(document.getElementById('invoice-date').value));
  setText('prev-due-date', formatDate(document.getElementById('due-date').value));
  setText('prev-currency', currency);

  // Logo
  const prevLogo = document.getElementById('prev-logo');
  if (logoDataUrl) {
    prevLogo.src = logoDataUrl;
    prevLogo.hidden = false;
  } else {
    prevLogo.hidden = true;
  }

  // Items table
  const tbody = document.getElementById('prev-items-body');
  tbody.innerHTML = '';
  items.forEach((item, idx) => {
    if (!item.desc && item.price === 0 && idx > 0) return; // skip truly empty rows
    const sub = parseMoney(item.qty) * parseMoney(item.price);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td class="td-desc-main">${escHtml(item.desc) || '<em style="color:#9CA3AF">Item ' + (idx+1) + '</em>'}</td>
      <td class="td-qty">${item.qty}</td>
      <td class="td-price">${formatMoney(item.price, currency)}</td>
      <td class="td-sub">${formatMoney(sub, currency)}</td>
    `;
    tbody.appendChild(tr);
  });

  // Summary
  const { subtotal, discountPct, discountAmt, taxPct, taxAmt, total } = calculate();
  setText('prev-subtotal', formatMoney(subtotal, currency));
  setText('prev-total', formatMoney(total, currency));

  const discountRow = document.getElementById('prev-discount-row');
  if (discountPct > 0) {
    discountRow.style.display = '';
    setText('prev-discount-label', `Diskon (${discountPct}%)`);
    setText('prev-discount-val', '– ' + formatMoney(discountAmt, currency));
  } else {
    discountRow.style.display = 'none';
  }

  const taxRow = document.getElementById('prev-tax-row');
  if (taxPct > 0) {
    taxRow.style.display = '';
    setText('prev-tax-label', `PPN (${taxPct}%)`);
    setText('prev-tax-val', formatMoney(taxAmt, currency));
  } else {
    taxRow.style.display = 'none';
  }

  // Payment
  const paymentMethod = document.getElementById('payment-method').value;
  const bankDetails = document.getElementById('bank-details').value;
  const paymentSection = document.getElementById('prev-payment-section');
  if (paymentMethod) {
    paymentSection.style.display = '';
    setText('prev-payment-method', paymentMethod);
    const bankEl = document.getElementById('prev-bank-details');
    bankEl.textContent = bankDetails || '';
    bankEl.style.display = bankDetails ? '' : 'none';
  } else {
    paymentSection.style.display = 'none';
  }

  // Notes
  const notes = document.getElementById('notes').value;
  const notesSection = document.getElementById('prev-notes-section');
  if (notes.trim()) {
    notesSection.style.display = '';
    setText('prev-notes', notes);
  } else {
    notesSection.style.display = 'none';
  }
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  if (value && value.trim()) {
    el.textContent = value;
    el.style.display = '';
  } else {
    el.textContent = '';
    el.style.display = 'none';
  }
}

/* ═══════════════════════════════════════
   EXPORT PDF
═══════════════════════════════════════ */
function exportPDF() {
  showToast('Menyiapkan PDF...', 'info');
  const invoiceEl = document.getElementById('invoice-preview');
  const invNum = document.getElementById('invoice-number').value || 'invoice';
  const filename = `${invNum}.pdf`;

  const opt = {
    margin: [10, 10, 10, 10],
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      letterRendering: true,
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
    },
    pagebreak: { mode: ['avoid-all'] },
  };

  html2pdf()
    .set(opt)
    .from(invoiceEl)
    .save()
    .then(() => {
      showToast('✓ Invoice berhasil didownload!', 'success');
    })
    .catch(() => {
      showToast('Gagal membuat PDF, coba lagi', 'error');
    });
}

/* ═══════════════════════════════════════
   PRINT
═══════════════════════════════════════ */
function printInvoice() {
  window.print();
}

/* ═══════════════════════════════════════
   RESET
═══════════════════════════════════════ */
function resetForm() {
  if (!confirm('Reset semua data form? Aksi ini tidak bisa dibatalkan.')) return;

  document.getElementById('sender-name').value = '';
  document.getElementById('sender-address').value = '';
  document.getElementById('sender-phone').value = '';
  document.getElementById('sender-email').value = '';
  document.getElementById('client-name').value = '';
  document.getElementById('client-address').value = '';
  document.getElementById('client-phone').value = '';
  document.getElementById('client-email').value = '';
  document.getElementById('invoice-number').value = generateInvoiceNumber();
  document.getElementById('currency').value = 'IDR';
  document.getElementById('tax-rate').value = '';
  document.getElementById('discount').value = '';
  document.getElementById('payment-method').value = '';
  document.getElementById('bank-details').value = '';
  document.getElementById('bank-details-group').style.display = 'none';
  document.getElementById('notes').value = '';

  initDefaults();

  // Reset logo
  logoDataUrl = null;
  document.getElementById('logo-input').value = '';
  document.getElementById('logo-preview').hidden = true;
  document.getElementById('logo-placeholder').style.display = '';
  document.getElementById('logo-remove-btn').hidden = true;

  // Reset items
  items = [{ id: uid(), desc: '', qty: 1, price: 0 }];
  renderItems();
  updatePreview();

  showToast('Form berhasil direset', 'info');
}
