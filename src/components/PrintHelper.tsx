import React from 'react';
import { Download, AlertTriangle } from 'lucide-react';

export function downloadPrintableHTML(elementId: string, title: string) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found.`);
    alert('Elemen dokumen tidak ditemukan.');
    return;
  }

  // Clone element to avoid mutating live DOM
  const clone = element.cloneNode(true) as HTMLElement;
  
  // Strip utility interactive buttons and action panels
  const interactivePanels = clone.querySelectorAll('.print\\:hidden, button');
  interactivePanels.forEach(el => el.remove());

  const cleanHTML = clone.innerHTML;

  const htmlContent = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background-color: #f1f5f9;
      color: #0f172a;
      padding: 1.5rem 0.5rem;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .print-sheet {
      background: white;
      border: 1px solid #cbd5e1;
      border-radius: 0;
      padding: 15mm 15mm;
      width: 210mm;
      max-width: 100%;
      min-height: 297mm;
      margin: 0 auto;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
      box-sizing: border-box;
    }
    /* Excel & Official Document Ledger Styling */
    table {
      width: 100% !important;
      border-collapse: collapse !important;
      border: 1.5px solid #334155 !important;
      font-size: 11px !important;
      margin-top: 8px !important;
      margin-bottom: 12px !important;
    }
    th {
      background-color: #064e3b !important;
      color: #ffffff !important;
      border: 1px solid #334155 !important;
      padding: 6px 8px !important;
      font-weight: 700 !important;
      font-size: 10.5px !important;
      text-transform: uppercase !important;
      letter-spacing: 0.02em !important;
    }
    td {
      border: 1px solid #cbd5e1 !important;
      padding: 5px 7px !important;
      font-size: 10.5px !important;
      vertical-align: top !important;
    }
    tr:nth-child(even) td {
      background-color: #f8fafc !important;
    }
    .rounded-2xl, .rounded-xl, .rounded-lg, .rounded-3xl {
      border-radius: 2px !important;
    }
    .shadow-sm, .shadow-md, .shadow-lg, .shadow-xl, .shadow-2xs, .shadow-xs {
      box-shadow: none !important;
    }
    @media print {
      @page {
        size: A4 portrait;
        margin: 10mm 12mm 12mm 12mm;
      }
      body {
        background-color: white !important;
        padding: 0 !important;
      }
      .print-sheet {
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
        min-height: auto !important;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body onload="window.print()">
  <div class="print-sheet">
    ${cleanHTML}
  </div>
  
  <div class="mt-8 text-center no-print max-w-md mx-auto space-y-4 px-4">
    <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-950">
      <p class="font-bold text-base mb-1">⎙ Dokumen Siap Cetak</p>
      <p class="text-gray-650 leading-relaxed font-medium">
        Halaman printer browser Anda seharusnya terbuka secara otomatis. Jika tidak terbuka, klik tombol di bawah ini atau gunakan tombol pintasan keyboard <strong>Ctrl+P</strong> (Windows) atau <strong>Cmd+P</strong> (Mac) untuk mencetak dokumen.
      </p>
    </div>
    
    <button onclick="window.print()" class="w-full sm:w-auto px-6 py-2 bg-gradient-to-r from-emerald-800 to-teal-900 text-white font-extrabold rounded-lg hover:from-emerald-700 hover:to-teal-850 cursor-pointer text-sm shadow-md transition duration-200">
      Cetak Halaman Ini ⎙
    </button>
  </div>
</body>
</html>
`;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.html`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function PrintGuideAlert() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-950 flex gap-2 items-start text-left print:hidden mb-4">
      <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5 animate-bounce" />
      <div className="space-y-1">
        <p className="font-extrabold text-amber-900 leading-tight">Bantuan Cetak & Unduh Dokumen:</p>
        <p className="text-gray-650 font-medium leading-relaxed">
          Karena batasan sistem keamanan penjelajah dalam pratinjau bingkai (sandboxed preview), tombol <strong className="font-bold">Cetak</strong> mungkin tidak langsung menampilkan antarmuka cetak printer Anda.
        </p>
        <p className="text-gray-650 font-bold leading-relaxed">
          Silakan klik tombol <strong className="font-bold text-amber-950">Unduh HTML Offline 📥</strong> di sampingnya untuk mendapatkan berkas cetak luring yang utuh dan indah!
        </p>
      </div>
    </div>
  );
}

export function downloadPrintableTableHTML(elementId: string, title: string) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found.`);
    alert('Elemen dokumen tidak ditemukan.');
    return;
  }

  // Load portal settings for Kop Surat
  let settings: any = null;
  try {
    const stored = localStorage.getItem('pesantren_settings');
    if (stored) settings = JSON.parse(stored);
  } catch (e) {
    console.error('Failed to parse pesantren_settings', e);
  }

  const clone = element.cloneNode(true) as HTMLElement;
  const interactivePanels = clone.querySelectorAll('.print\\:hidden, button');
  interactivePanels.forEach(el => el.remove());

  // Use outerHTML to preserve the <table> tag itself, if it is a table
  const cleanHTML = clone.outerHTML || clone.innerHTML;

  const hasKop = clone.querySelector('img[alt="Logo Pesantren"]') || 
                 clone.innerHTML.includes('YAYASAN') || 
                 clone.innerHTML.includes('Pondok Pesantren') || 
                 clone.innerHTML.includes('PONDOK PESANTREN');

  const logoHtml = (settings?.logoUrl || '/pesantren_logo.jpg')
    ? `<img src="${settings?.logoUrl || '/pesantren_logo.jpg'}" alt="Logo Pesantren" class="h-16 w-16 object-contain mr-4 shrink-0" referrerPolicy="no-referrer" />`
    : `<div class="h-16 w-16 bg-emerald-50 rounded-full border border-emerald-200 flex items-center justify-center text-2xl mr-4 shrink-0">🕌</div>`;

  const kopSuratHtml = hasKop ? '' : `
    <div class="border-b-4 border-double border-emerald-700 pb-4 mb-6 flex items-center justify-between">
      <div class="flex items-center">
        ${logoHtml}
        <div class="text-left">
          <h4 class="text-emerald-900 font-black text-sm sm:text-base tracking-wide uppercase leading-tight">${settings?.schoolName || "Pondok Pesantren Al-Asy'ariyah"}</h4>
          <p class="text-[10px] sm:text-[11px] text-gray-500 max-w-xl leading-relaxed mt-1">
            ${settings?.address || "Jl. Raya Modung, Langpanggang, Modung, Bangkalan, Jawa Timur"}<br />
            ${settings?.phone ? `Hubungi: ${settings.phone} | ` : ''} Email: ${settings?.email || "info@alasyariyah.sch.id"}
          </p>
          <p class="text-[9px] sm:text-[10px] text-emerald-700 font-bold italic tracking-wide mt-1">
            ${settings?.tagline || "Mencetak Generasi Qur'ani, Berakhlakul Karimah, Unggul, dan Mandiri"}
          </p>
        </div>
      </div>
      <div class="text-right shrink-0">
        <span class="bg-emerald-100 px-3 py-1 rounded text-emerald-800 text-[10px] uppercase font-mono font-bold tracking-widest leading-none">
          DOKUMEN RESMI
        </span>
        <div class="text-[10px] text-gray-400 font-mono mt-2">Tanggal: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
      </div>
    </div>
  `;

  const htmlContent = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background-color: #f1f5f9;
      color: #0f172a;
      padding: 1rem 0.5rem;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .print-sheet {
      background: white;
      border: 1px solid #cbd5e1;
      border-radius: 0;
      padding: 12mm 15mm;
      width: 297mm;
      max-width: 100%;
      margin: 0 auto;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
      box-sizing: border-box;
    }
    /* Excel & Official Document Ledger Table Styling */
    table {
      width: 100% !important;
      border-collapse: collapse !important;
      border: 1.5px solid #334155 !important;
      font-size: 10px !important;
      margin-top: 8px !important;
      margin-bottom: 12px !important;
    }
    th {
      background-color: #064e3b !important;
      color: #ffffff !important;
      border: 1px solid #334155 !important;
      padding: 5px 6px !important;
      font-weight: 700 !important;
      font-size: 9.5px !important;
      text-transform: uppercase !important;
      letter-spacing: 0.02em !important;
    }
    td {
      border: 1px solid #cbd5e1 !important;
      padding: 4px 6px !important;
      font-size: 9.5px !important;
      vertical-align: top !important;
    }
    tr:nth-child(even) td {
      background-color: #f8fafc !important;
    }
    .rounded-2xl, .rounded-xl, .rounded-lg, .rounded-3xl {
      border-radius: 2px !important;
    }
    .shadow-sm, .shadow-md, .shadow-lg, .shadow-xl, .shadow-2xs, .shadow-xs {
      box-shadow: none !important;
    }
    @media print {
      @page {
        size: A4 landscape;
        margin: 8mm 10mm 10mm 10mm;
      }
      body {
        background-color: white !important;
        padding: 0 !important;
      }
      .print-sheet {
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body onload="window.print()">
  <div class="print-sheet">
    ${kopSuratHtml}
    <div class="mt-4">
      ${cleanHTML}
    </div>
  </div>
  
  <div class="mt-8 text-center no-print max-w-md mx-auto space-y-4 px-4">
    <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-950">
      <p class="font-bold text-base mb-1">⎙ Laporan Lintas-Sektoral Siap Cetak</p>
      <p class="text-gray-650 leading-relaxed font-medium">
        Berkas laporan tabel telah dioptimalkan untuk orientasi <strong>Landscape (Tidur)</strong> dengan penyertaan Kop Surat Resmi. Klik tombol cetak di bawah jika pratinjau tidak muncul otomatis.
      </p>
    </div>
    
    <button onclick="window.print()" class="w-full sm:w-auto px-6 py-2 bg-gradient-to-r from-emerald-800 to-teal-900 text-white font-extrabold rounded-lg hover:from-emerald-700 hover:to-teal-850 cursor-pointer text-sm shadow-md transition duration-200">
      Cetak Halaman Ini ⎙
    </button>
  </div>
</body>
</html>
`;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.html`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadPrintableA4ReceiptHTML(elementId: string, title: string) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found.`);
    alert('Elemen dokumen tidak ditemukan.');
    return;
  }

  const clone = element.cloneNode(true) as HTMLElement;
  const interactivePanels = clone.querySelectorAll('.print\\:hidden, button');
  interactivePanels.forEach(el => el.remove());

  const cleanHTML = clone.innerHTML;

  const htmlContent = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background-color: #f3f4f6;
      color: #111827;
      padding: 2rem 1rem;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .print-sheet {
      background: white;
      border: 1px solid #cbd5e1;
      border-radius: 0;
      padding: 12mm 15mm;
      width: 210mm;
      max-width: 100%;
      min-height: 297mm;
      margin: 0 auto;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
      box-sizing: border-box;
    }
    table {
      width: 100% !important;
      border-collapse: collapse !important;
      border: 1.5px solid #334155 !important;
      font-size: 11px !important;
      margin-top: 8px !important;
      margin-bottom: 12px !important;
    }
    th {
      background-color: #064e3b !important;
      color: #ffffff !important;
      border: 1px solid #334155 !important;
      padding: 6px 8px !important;
      font-weight: 700 !important;
      font-size: 10.5px !important;
      text-transform: uppercase !important;
    }
    td {
      border: 1px solid #cbd5e1 !important;
      padding: 5px 7px !important;
      font-size: 10.5px !important;
      vertical-align: top !important;
    }
    tr:nth-child(even) td {
      background-color: #f8fafc !important;
    }
    .rounded-2xl, .rounded-xl, .rounded-lg, .rounded-3xl {
      border-radius: 2px !important;
    }
    .shadow-sm, .shadow-md, .shadow-lg, .shadow-xl, .shadow-2xs, .shadow-xs {
      box-shadow: none !important;
    }
    @media print {
      @page {
        size: A4 portrait;
        margin: 10mm 12mm 12mm 12mm;
      }
      body {
        background-color: white !important;
        padding: 0 !important;
      }
      .print-sheet {
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
        min-height: auto !important;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body onload="window.print()">
  <div class="print-sheet">
    ${cleanHTML}
  </div>
  
  <div class="mt-8 text-center no-print max-w-md mx-auto space-y-4 px-4">
    <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-950">
      <p class="font-bold text-base mb-1">⎙ Lembar Rekapitulasi Tagihan Siap Cetak (Format A4)</p>
      <p class="text-gray-650 leading-relaxed font-medium">
        Dokumen ini telah diatur khusus untuk ukuran <strong>A4 Portrait</strong>. Anda dapat langsung mencetak atau memilih opsi <strong>"Save as PDF" (Simpan sebagai PDF)</strong> pada tujuan printer Anda.
      </p>
    </div>
    
    <button onclick="window.print()" class="w-full sm:w-auto px-6 py-2 bg-gradient-to-r from-emerald-800 to-teal-900 text-white font-extrabold rounded-lg hover:from-emerald-700 hover:to-teal-850 cursor-pointer text-sm shadow-md transition duration-200">
      Cetak / Simpan PDF Sekarang ⎙
    </button>
  </div>
</body>
</html>
`;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.html`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
