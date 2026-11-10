import React from 'react';
import { X, Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2, RefreshCw, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Student } from '../types';

interface ExcelStudentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingStudents: Student[];
  onImportSuccess: (newOrUpdatedStudents: Student[], importedCount: number) => void;
}

export default function ExcelStudentImportModal({
  isOpen,
  onClose,
  existingStudents,
  onImportSuccess
}: ExcelStudentImportModalProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [parsedRows, setParsedRows] = React.useState<Partial<Student>[]>([]);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [overwriteDuplicates, setOverwriteDuplicates] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Generate downloadable Excel Template (.xlsx)
  const downloadTemplate = () => {
    const templateData = [
      {
        "NIS": "2026.01.001",
        "Nama Lengkap": "Ahmad Fauzi",
        "Jenis Kelamin (L/P)": "L",
        "Sekolah Formal": "SMA Kelas X",
        "Sekolah Madrasah": "Wustha Kelas 1",
        "Kamar / Asrama": "Abu Bakar 01",
        "Nama Ayah": "H. Sulaiman",
        "Nama Ibu": "Hj. Aminah",
        "Nama Wali": "H. Sulaiman",
        "No. WhatsApp Wali": "081234567890",
        "NIK Santri": "3526110102030001",
        "No. KK": "3526110102030002",
        "Tempat Lahir": "Bangkalan",
        "Tanggal Lahir (YYYY-MM-DD)": "2010-05-14",
        "Alamat Lengkap": "Dusun Mancengan, RT 02/01, Modung, Bangkalan",
        "Status (Aktif/Berhenti)": "Aktif",
        "Riwayat Kesehatan": "-"
      },
      {
        "NIS": "2026.01.002",
        "Nama Lengkap": "Siti Nur Halimah",
        "Jenis Kelamin (L/P)": "P",
        "Sekolah Formal": "SMP Kelas VII",
        "Sekolah Madrasah": "Ula Kelas 1",
        "Kamar / Asrama": "Fatimah 02",
        "Nama Ayah": "M. Thohir",
        "Nama Ibu": "Siti Maryam",
        "Nama Wali": "M. Thohir",
        "No. WhatsApp Wali": "085712345678",
        "NIK Santri": "3526110405060001",
        "No. KK": "3526110405060002",
        "Tempat Lahir": "Sampang",
        "Tanggal Lahir (YYYY-MM-DD)": "2012-08-20",
        "Alamat Lengkap": "Jl. Raya Kedungdung, Sampang, Madura",
        "Status (Aktif/Berhenti)": "Aktif",
        "Riwayat Kesehatan": "Alergi debu ringan"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    // Set auto column widths
    worksheet['!cols'] = [
      { wch: 14 }, // NIS
      { wch: 24 }, // Nama
      { wch: 18 }, // Gender
      { wch: 18 }, // Formal
      { wch: 18 }, // Madrasah
      { wch: 16 }, // Kamar
      { wch: 18 }, // Ayah
      { wch: 18 }, // Ibu
      { wch: 18 }, // Wali
      { wch: 18 }, // WA
      { wch: 20 }, // NIK
      { wch: 20 }, // KK
      { wch: 16 }, // Tempat Lahir
      { wch: 16 }, // Tgl Lahir
      { wch: 35 }, // Alamat
      { wch: 14 }, // Status
      { wch: 24 }  // Riwayat
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template Santri");
    XLSX.writeFile(workbook, "Template_Impor_Santri_Al_Asyariyah.xlsx");
  };

  // Helper to normalize header keys
  const normalizeKey = (key: string): string => {
    return key.toLowerCase().replace(/[^a-z0-9]/g, '');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setErrors([]);
    setParsedRows([]);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          setErrors(["Berkas Excel kosong atau tidak memiliki baris data."]);
          setIsProcessing(false);
          return;
        }

        const parsed: Partial<Student>[] = [];
        const detectedErrors: string[] = [];
        const seenNis = new Set<string>();

        rawJson.forEach((row, idx) => {
          const rowNumber = idx + 2; // header is row 1
          const normRow: Record<string, any> = {};
          Object.keys(row).forEach(k => {
            normRow[normalizeKey(k)] = row[k];
          });

          // Resolve Nama
          const fullName = String(
            normRow['namalengkap'] || normRow['nama'] || normRow['namasantri'] || normRow['fullname'] || ''
          ).trim();

          if (!fullName) {
            detectedErrors.push(`Baris ${rowNumber}: Nama santri wajib diisi.`);
            return;
          }

          // Resolve NIS
          let nis = String(
            normRow['nis'] || normRow['noinduk'] || normRow['nomorinduk'] || ''
          ).trim();

          if (!nis) {
            // Auto generate standard NIS if omitted: 2026.01.XXX
            nis = `2026.01.${String(existingStudents.length + parsed.length + 1).padStart(3, '0')}`;
          }

          if (seenNis.has(nis)) {
            detectedErrors.push(`Baris ${rowNumber}: NIS ${nis} terduplikasi di dalam berkas Excel.`);
          }
          seenNis.add(nis);

          // Resolve Gender
          const rawGender = String(normRow['jeniskelaminlp'] || normRow['jeniskelamin'] || normRow['gender'] || normRow['jk'] || '').trim().toLowerCase();
          const gender: 'Laki-laki' | 'Perempuan' = (rawGender.startsWith('p') || rawGender.includes('putri') || rawGender.includes('perempuan'))
            ? 'Perempuan'
            : 'Laki-laki';

          // Resolve Classes
          const classFormal = String(normRow['sekolahformal'] || normRow['kelasformal'] || normRow['formal'] || normRow['classformal'] || '-').trim();
          const classMadrasah = String(normRow['sekolahmadrasah'] || normRow['kelasmadrasah'] || normRow['madrasah'] || normRow['diniyah'] || normRow['classmadrasah'] || '-').trim();
          const finalClass = `${classFormal} • ${classMadrasah}`;

          // Resolve Kamar
          const kamar = String(normRow['kamarasrama'] || normRow['kamar'] || normRow['asrama'] || '').trim();

          // Resolve Parents
          const fatherName = String(normRow['namaayah'] || normRow['ayah'] || '').trim();
          const motherName = String(normRow['namaibu'] || normRow['ibu'] || '').trim();
          const parentName = String(normRow['namawali'] || normRow['wali'] || fatherName || motherName || 'Wali Santri').trim();
          const parentPhone = String(normRow['nowhatsappwali'] || normRow['nowa'] || normRow['whatsapp'] || normRow['nohp'] || normRow['telepon'] || '').trim();

          // Resolve Demographics
          const nik = String(normRow['niksantri'] || normRow['nik'] || '').trim();
          const kk = String(normRow['nokk'] || normRow['kk'] || '').trim();
          const birthPlace = String(normRow['tempatlahir'] || '').trim();
          let birthDate = String(normRow['tanggallahiryyyymmdd'] || normRow['tanggallahir'] || '').trim();
          // Check if Excel serial date number
          if (/^\d{5}$/.test(birthDate)) {
            const parsedD = new Date((parseInt(birthDate, 10) - 25569) * 86400 * 1000);
            if (!isNaN(parsedD.getTime())) {
              birthDate = parsedD.toISOString().split('T')[0];
            }
          }

          const address = String(normRow['alamatlengkap'] || normRow['alamat'] || '-').trim();
          const rawStatus = String(normRow['statusaktifberhenti'] || normRow['status'] || 'Aktif').trim();
          const status = rawStatus.toLowerCase().includes('berhenti') ? 'Berhenti' : 'Aktif';
          const healthHistory = String(normRow['riwayatkesehatanpenyakit'] || normRow['riwayatkesehatan'] || '-').trim();

          parsed.push({
            id: `std-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
            nis,
            fullName,
            gender,
            classFormal,
            classMadrasah,
            class: finalClass,
            classPagi: classMadrasah,
            classSore: classFormal,
            kamar,
            fatherName,
            motherName,
            parentName,
            parentPhone,
            nik,
            kk,
            birthPlace,
            birthDate,
            address,
            status,
            healthHistory,
            entryDate: new Date().toISOString().split('T')[0]
          });
        });

        setParsedRows(parsed);
        setErrors(detectedErrors);
      } catch (err: any) {
        setErrors([`Gagal membaca berkas: ${err?.message || 'Format tidak didukung'}`]);
      } finally {
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setErrors(["Gagal membuka file. Pastikan file dalam format .xlsx, .xls, atau .csv valid."]);
      setIsProcessing(false);
    };

    reader.readAsBinaryString(selectedFile);
  };

  const handleExecuteImport = () => {
    if (parsedRows.length === 0) return;

    const existingMap = new Map<string, Student>();
    existingStudents.forEach(s => {
      if (s && s.nis) existingMap.set(s.nis.trim().toLowerCase(), s);
    });

    let importedCount = 0;
    const mergedList: Student[] = [...existingStudents];

    parsedRows.forEach(row => {
      const nisKey = (row.nis || '').trim().toLowerCase();
      const existing = existingMap.get(nisKey);

      if (existing) {
        if (overwriteDuplicates) {
          const idx = mergedList.findIndex(s => s.id === existing.id);
          if (idx >= 0) {
            mergedList[idx] = {
              ...existing,
              ...row,
              id: existing.id // preserve original student ID
            } as Student;
            importedCount++;
          }
        }
      } else {
        mergedList.push(row as Student);
        existingMap.set(nisKey, row as Student);
        importedCount++;
      }
    });

    onImportSuccess(mergedList, importedCount);
    onClose();
  };

  const handleReset = () => {
    setFile(null);
    setParsedRows([]);
    setErrors([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 flex flex-col my-auto mx-auto max-h-[90vh] overflow-hidden text-left">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-800 text-white flex items-center justify-center shrink-0">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight">
                Impor Data Santri Massal (Excel / CSV)
              </h3>
              <p className="text-[11px] text-slate-500">
                Muat ratusan data santri baru sekaligus secara cepat dan terstruktur
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer transition"
            title="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs">
          
          {/* Step 1: Download Template */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="font-bold text-slate-900 block">Langkah 1: Unduh Format Template Excel</span>
              <p className="text-[11px] text-slate-500">
                Gunakan template resmi ini untuk mengisi data kolom santri agar sesuai dengan format sistem.
              </p>
            </div>
            <button
              type="button"
              onClick={downloadTemplate}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 text-emerald-900 border border-emerald-300 font-bold rounded-lg transition flex items-center justify-center gap-1.5 shadow-xs shrink-0 cursor-pointer text-xs"
            >
              <Download className="h-3.5 w-3.5 text-emerald-700" />
              <span>Unduh Template (.xlsx)</span>
            </button>
          </div>

          {/* Step 2: Upload File Area */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 block">Langkah 2: Pilih Berkas Excel Yang Sudah Diisi</label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 border-2 border-dashed rounded-xl text-center cursor-pointer transition ${
                file 
                  ? 'border-emerald-500 bg-emerald-50/40 text-emerald-900' 
                  : 'border-slate-300 hover:border-emerald-700 hover:bg-slate-50/80 text-slate-600'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <Upload className="h-7 w-7 mx-auto mb-2 text-slate-400" />
              {file ? (
                <div className="space-y-1">
                  <span className="font-bold text-emerald-950 text-xs block">{file.name}</span>
                  <span className="text-[11px] text-slate-500 block">
                    Ukuran: {(file.size / 1024).toFixed(1)} KB • Klik untuk ganti berkas
                  </span>
                </div>
              ) : (
                <div className="space-y-0.5">
                  <span className="font-semibold text-xs block text-slate-800">
                    Klik untuk memilih berkas (.xlsx, .xls, .csv)
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    Maksimal 10 MB per berkas data santri
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Processing Indicator */}
          {isProcessing && (
            <div className="p-3 bg-slate-100 rounded-xl flex items-center justify-center gap-2 text-slate-700 text-xs font-semibold">
              <RefreshCw className="h-4 w-4 animate-spin text-emerald-800" />
              <span>Sedang membaca dan memvalidasi baris data Excel...</span>
            </div>
          )}

          {/* Errors Notice */}
          {errors.length > 0 && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-xs text-rose-900">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>Peringatan / Catatan Validasi:</span>
              </div>
              <ul className="list-disc list-inside text-[11px] text-rose-750 max-h-24 overflow-y-auto space-y-0.5 pl-1">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Step 3: Parsed Rows Preview */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
                  <span className="font-bold text-slate-900">
                    Terbaca {parsedRows.length} Calon Data Santri
                  </span>
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-slate-700">
                  <input
                    type="checkbox"
                    checked={overwriteDuplicates}
                    onChange={(e) => setOverwriteDuplicates(e.target.checked)}
                    className="h-3.5 w-3.5 accent-emerald-800 rounded"
                  />
                  <span>Perbarui data jika NIS sudah terdaftar di sistem</span>
                </label>
              </div>

              {/* Table Preview */}
              <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-48">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3 text-center">No</th>
                      <th className="py-2 px-3">NIS</th>
                      <th className="py-2 px-3">Nama Santri</th>
                      <th className="py-2 px-2 text-center">JK</th>
                      <th className="py-2 px-3">Kamar</th>
                      <th className="py-2 px-3">Kelas Formal / Madrasah</th>
                      <th className="py-2 px-3">Wali / WhatsApp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.slice(0, 15).map((row, idx) => {
                      const isExistingNis = existingStudents.some(s => s.nis === row.nis);
                      return (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                          <td className="py-1.5 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                          <td className="py-1.5 px-3 font-mono font-bold text-emerald-950">
                            {row.nis}
                            {isExistingNis && (
                              <span className="ml-1 text-[9px] text-amber-700 font-sans font-bold">
                                ({overwriteDuplicates ? 'update' : 'skip'})
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 px-3 font-bold text-slate-900">{row.fullName}</td>
                          <td className="py-1.5 px-2 text-center text-slate-600">{row.gender === 'Perempuan' ? 'P' : 'L'}</td>
                          <td className="py-1.5 px-3 text-slate-700">{row.kamar || '-'}</td>
                          <td className="py-1.5 px-3 text-slate-600">{row.class || '-'}</td>
                          <td className="py-1.5 px-3 text-slate-600 font-mono text-[10px]">{row.parentPhone || row.parentName || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {parsedRows.length > 15 && (
                <p className="text-[10px] text-slate-400 italic text-right">
                  Menampilkan 15 dari {parsedRows.length} data santri pada pratinjau.
                </p>
              )}
            </div>
          )}

        </div>

        {/* Modal Actions */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl font-semibold text-xs transition cursor-pointer"
          >
            Reset Pilihan
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl font-semibold text-xs transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={parsedRows.length === 0 || isProcessing}
              onClick={handleExecuteImport}
              className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Impor {parsedRows.length > 0 ? `${parsedRows.length} Santri` : ''} Sekarang</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
