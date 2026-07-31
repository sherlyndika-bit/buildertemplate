# 📄 Invoice Generator Pro

> Aplikasi web untuk membuat invoice/faktur profesional secara instan — gratis, cepat, dan berjalan sepenuhnya di browser.

![Invoice Generator Preview](https://img.shields.io/badge/version-1.0.0-blue?style=flat-square) ![License](https://img.shields.io/badge/license-MIT-green?style=flat-square) ![No Backend](https://img.shields.io/badge/backend-none-orange?style=flat-square)

---

## ✨ Fitur

| Fitur | Keterangan |
|-------|-----------|
| 🏢 Info Pengirim | Nama, alamat, telepon, email, upload logo |
| 👤 Info Klien | Nama, alamat, telepon, email klien |
| 🔢 Nomor Invoice | Auto-generate + bisa diedit manual |
| 📅 Tanggal | Tanggal invoice & jatuh tempo |
| 📋 Daftar Item | Tambah/hapus baris dinamis, subtotal otomatis |
| 💱 Multi-mata uang | IDR, USD, EUR, SGD |
| 🏷️ PPN & Diskon | Opsional, dihitung otomatis |
| 💳 Metode Pembayaran | Transfer bank, tunai, QRIS, e-wallet |
| 📝 Catatan | Keterangan tambahan bebas |
| 👁️ Preview Real-time | Tampilan invoice langsung diperbarui |
| 📥 Export PDF | Download PDF langsung dari browser |
| 🖨️ Cetak | Print langsung ke printer |

---

## 🚀 Cara Penggunaan

### Option 1: Buka Langsung (Tidak Perlu Install)

Cukup buka file `index.html` di browser Anda — **tidak perlu server, tidak perlu install apapun**.

```bash
# Clone repo
git clone https://github.com/sherlyndika-bit/buildertemplate.git
cd buildertemplate

# Buka di browser
start index.html    # Windows
open index.html     # macOS
xdg-open index.html # Linux
```

### Option 2: Jalankan dengan Live Server

```bash
# Jika punya Node.js
npx serve .

# Atau dengan Python
python -m http.server 8080
```

---

## 🛠️ Teknologi

- **HTML5** – Struktur semantik
- **CSS3** – Desain modern (glassmorphism, gradients, animasi)
- **JavaScript (Vanilla)** – Logic tanpa framework
- **[html2pdf.js](https://ekoopmans.github.io/html2pdf.js/)** – Export PDF (CDN, tidak perlu install)
- **[Google Fonts (Inter)](https://fonts.google.com/specimen/Inter)** – Tipografi profesional

---

## 📁 Struktur File

```
invoice-generator/
├── index.html    # Halaman utama & markup
├── style.css     # Semua styling & responsif
├── app.js        # Logic JavaScript lengkap
└── README.md     # Dokumentasi ini
```

---

## 🎨 Desain

- **Color Palette**: Biru indigo (#4F6BED) + ungu (#7C3AED) sebagai aksen
- **Font**: Inter (Google Fonts)
- **Layout**: Dua kolom — form di kiri, preview di kanan
- **Responsive**: Mendukung desktop, tablet, dan HP
- **Print-friendly**: CSS khusus untuk mode cetak

---

## 📄 Lisensi

MIT © 2024 — Bebas digunakan untuk keperluan pribadi maupun komersial.
