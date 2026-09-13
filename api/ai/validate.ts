import { GoogleGenAI } from '@google/genai';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type, studentData, contextData, extraPrompt } = req.body || {};
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(200).json({
        result: null,
        error: 'GEMINI_API_KEY environment variable is not configured on Vercel.'
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const systemInstruction = "Anda adalah Asisten AI Sistem Informasi Pondok Pesantren Al-Asy'ariyah. Tugas Anda adalah membantu pengurus memvalidasi persetujuan perizinan keluar, bukti pembayaran syahriyah, atau kedisiplinan santri dengan bijak, sopan, dan obyektif. Jawab dalam Bahasa Indonesia yang formal namun ramah.";
    let prompt = "";

    if (type === 'izin') {
      const points = studentData?.disciplineLogs?.filter((d: any) => d.status !== 'Selesai').reduce((sum: number, d: any) => sum + d.points, 0) || 0;
      prompt = `
Tolong lakukan evaluasi kelayakan perizinan keluar untuk santri berikut:
Nama: ${studentData?.fullName || '-'}
NIS: ${studentData?.nis || '-'}
Kelas: ${studentData?.class || '-'}
Total Poin Pelanggaran Aktif: ${points}
Catatan Riwayat Pelanggaran: ${JSON.stringify(studentData?.disciplineLogs || [])}

Rencana Izin Keluar:
Keperluan: ${contextData?.purpose || '-'}
Durasi/Tanggal Kembali: ${contextData?.expectedReturn || '-'}

Evaluasi kelayakan berdasarkan aturan:
1. Jika poin pelanggaran aktif > 10, izin sebaiknya DITOLAK atau diberikan catatan pembinaan ketat.
2. Keperluan yang valid biasanya mencakup urusan keluarga darurat, sakit, atau administrasi penting.
Berikan keputusan/rekomendasi: [SETUJU], [SETUJU DENGAN CATATAN], atau [TOLAK] beserta alasannya secara singkat, padat, dan ramah.
      `;
    } else if (type === 'payment') {
      prompt = `
Tolong lakukan konfirmasi, pencocokan data, dan analisis keaslian bukti transfer/pembayaran syahriyah (SPP) berikut:
- Nama Santri: ${studentData?.fullName || '-'}
- Nama Tagihan: ${contextData?.billTitle || '-'}
- Nominal Tagihan: Rp ${contextData?.billAmount?.toLocaleString('id-ID') || 0}
- Metode/Tujuan Transfer Dipilih: ${contextData?.paymentMethod || '-'}

Data Transfer Tujuan Resmi Pesantren:
- Bank Tujuan: ${contextData?.destinationBank || '-'}
- Nomor Rekening Tujuan: ${contextData?.destinationAccount || '-'}

Data Rekening Pengirim (Sesuai Konfirmasi Wali):
- Bank Pengirim: ${contextData?.senderBank || '-'}
- Nomor Rekening Pengirim: ${contextData?.senderAccountNumber || '-'}

Bukti transfer terunggah: ${contextData?.proofUrl ? "Ada (Gambar Terlampir)" : "Tidak ada bukti terunggah"}

Instruksi Analisis Gambar Bukti Pembayaran:
1. Periksalah gambar bukti transfer yang dilampirkan (jika ada). 
2. COCOKKAN NOMINAL: Apakah nominal transfer yang tertera pada resi/bukti gambar SAMA dengan Nominal Tagihan (Rp ${contextData?.billAmount?.toLocaleString('id-ID') || 0})?
3. COCOKKAN REKENING TUJUAN: Apakah bank tujuan dan nomor rekening tujuan yang tertera di gambar resi cocok/sesuai dengan Bank Tujuan (${contextData?.destinationBank}) dan Nomor Rekening Tujuan (${contextData?.destinationAccount})?
4. DETEKSI REKAYASA/DUMMY: Laporkan jika bukti transfer tampak mencurigakan, berupa gambar internet generik, atau rekayasa. (Catatan: Jika gambar adalah pemandangan alam, gambar abstrak, atau screenshot yang bukan resi bank, nyatakan dengan tegas bahwa gambar tersebut BUKAN bukti pembayaran yang sah!).

Format Hasil Analisis Anda harus rapi dan terstruktur:
- **Status Validitas**: Terverifikasi Otomatis / Perlu Peninjauan / Gagal (Tulis salah satu)
- **Kesesuaian Nominal**: [Tulis analisis kesesuaian nominal tagihan dengan nilai di resi]
- **Kesesuaian Rekening Tujuan**: [Tulis analisis kecocokan bank & nomor rekening tujuan di resi dengan rekening tujuan transfer yang ditentukan]
- **Catatan Tambahan**: [Beri penjelasan tambahan jika ada keganjilan atau petunjuk bagi pengurus]

PENTING: Di akhir respons Anda, tuliskan baris berikut secara persis di baris baru untuk dibaca oleh sistem parser kami:
VERIFICATION_STATUS: [Terverifikasi Otomatis / Perlu Peninjauan / Gagal]
Pilih salah satu status yang paling tepat berdasarkan hasil analisis Anda.
      `;
    } else if (type === 'ppdb') {
      prompt = `
Tolong lakukan evaluasi kelayakan & kelengkapan berkas Pendaftaran Calon Santri Baru (PPDB) berikut:
Nama Calon Santri: ${studentData?.fullName || '-'}
Gender: ${contextData?.gender || 'Tidak ditentukan'}
Tempat, Tanggal Lahir: ${contextData?.birthPlace || 'Tidak ditentukan'}, ${contextData?.birthDate || 'Tidak ditentukan'}
Sekolah Asal: ${contextData?.previousSchool || 'Tidak ditentukan'}
Nama Wali: ${contextData?.parentName || 'Tidak ditentukan'}
Nomor HP Wali: ${contextData?.parentPhone || 'Tidak ditentukan'}
Tanggal Pendaftaran: ${contextData?.registrationDate || 'Tidak ditentukan'}

Kriteria Kelayakan & Kelengkapan Berkas:
1. Nama Calon Santri, Sekolah Asal, Nama Wali, dan Nomor HP Wali harus terisi dengan lengkap dan masuk akal (bukan strip atau kosong).
2. Nomor HP Wali harus valid (mengandung angka telepon seluler aktif).
3. Jika data di atas lengkap dan terisi dengan baik, sampaikan kesimpulan di baris paling atas atau dalam respons Anda: "REKOMENDASI: DIREKOMENDASIKAN UNTUK DITERIMA" karena berkas lengkap, akurat, dan valid.
4. Jika ada data krusial yang kosong, sampaikan kesimpulan: "REKOMENDASI: BUTUH KELENGKAPAN DATA".

Sampaikan hasil analisis Anda dengan ramah, sopan, dan terstruktur.
      `;
    } else if (type === 'login_help') {
      prompt = `
Tolong berikan respons cepat dan bantuan informasi login untuk Wali Santri:
- Pesan/Kendala yang disampaikan Wali: "${extraPrompt || '-'}"
- Nama Santri: ${studentData?.fullName || '-'}
- No. WhatsApp / HP Wali: ${studentData?.parentPhone || '-'}
- Informasi Status Sistem: ${contextData?.systemStatus || 'Pencarian Kredensial Wali Santri'}
${contextData?.matchFound ? `- Data Santri Terverifikasi: Nama: ${contextData.matchedName}, NIS: ${contextData.matchedNis}, Kelas: ${contextData.matchedClass}` : '- Data santri belum otomatis teridentifikasi secara langsung'}

Instruksi Asisten AI Cepat:
1. Awali dengan salam hangat dan islami (Assalamu'alaikum Warahmatullahi Wabarakatuh).
2. Jelaskan aturan login Portal Wali Santri:
   - Username: Nomor WhatsApp / HP Wali yang terdaftar (contoh: ${studentData?.parentPhone || '081234567890'}).
   - Password: NIS (Nomor Induk Santri) resmi santri (contoh: ${contextData?.matchedNis || '0001'}).
3. Berikan saran/arahan solusi yang konkret dan ramah. Jika data santri valid, pandu untuk langsung mencoba masuk dengan NIS tersebut.
4. Berikan opsi untuk menghubungi Admin WhatsApp Sekretariat jika nomor HP belum terdaftar atau lupa NIS.
5. Jawab dengan ringkas, padat, terstruktur rapi, dan menyejukkan hati.
      `;
    } else {
      prompt = `
Pertanyaan umum atau permintaan kustom dari pengurus:
"${extraPrompt || ''}"

Data Santri Terkait (jika ada):
Nama: ${studentData?.fullName || "Tidak ditentukan"}
Riwayat: ${JSON.stringify(studentData || {})}

Berikan jawaban atau bimbingan yang sesuai dengan tradisi pesantren dan administrasi yang tertib.
      `;
    }

    let imagePart: any = null;
    if (contextData && contextData.proofUrl && contextData.proofUrl.startsWith("data:image/")) {
      const matches = contextData.proofUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        imagePart = {
          inlineData: {
            mimeType: matches[1],
            data: matches[2]
          }
        };
      }
    }

    const primaryModel = 'gemini-3.6-flash';
    const fallbackModel = 'gemini-3.1-flash-lite';

    const parts: any[] = [{ text: systemInstruction + "\n\n" + prompt }];
    if (imagePart) {
      parts.push(imagePart);
    }

    let responseText = '';
    try {
      const response = await ai.models.generateContent({
        model: primaryModel,
        contents: [{ role: 'user', parts }]
      });
      responseText = response.text || '';
    } catch (modelErr) {
      const response = await ai.models.generateContent({
        model: fallbackModel,
        contents: [{ role: 'user', parts }]
      });
      responseText = response.text || '';
    }

    let aiStatus = 'Perlu Peninjauan';
    if (type === 'payment') {
      const matchStatus = responseText.match(/VERIFICATION_STATUS:\s*(Terverifikasi Otomatis|Perlu Peninjauan|Gagal)/i);
      if (matchStatus) {
        aiStatus = matchStatus[1].trim();
      } else {
        if (responseText.includes('Terverifikasi Otomatis') || responseText.includes('Lulus Verifikasi')) {
          aiStatus = 'Terverifikasi Otomatis';
        } else if (responseText.includes('Gagal') || responseText.includes('Ditolak')) {
          aiStatus = 'Gagal';
        }
      }
    }

    return res.status(200).json({ result: responseText, aiStatus });
  } catch (error: any) {
    return res.status(200).json({
      error: error?.message || 'Terjadi kesalahan pada server AI.'
    });
  }
}

