export interface News {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  date: string;
  category: 'Kajian' | 'Kegiatan' | 'Prestasi' | 'Informasi';
  image: string;
  author: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  priority: 'low' | 'medium' | 'high';
  targetRole: 'all' | 'santri' | 'walisantri';
}

export interface PCSBRegistration {
  id: string;
  fullName: string;
  gender: 'Laki-laki' | 'Perempuan';
  birthPlace: string;
  birthDate: string;
  parentName: string;
  parentPhone: string;
  address: string;
  previousSchool: string;
  registrationDate: string;
  status: 'Pending' | 'Diterima' | 'Ditolak';
  notes?: string;
  
  // New comprehensive details
  kk?: string;
  nik?: string;
  fatherName?: string;
  motherName?: string;
  bloodType?: string;
  healthHistory?: string;
  paymentType?: 'Cicilan Bulanan' | 'Langsung Lunas';
}

export interface TahfidzLog {
  id: string;
  juz: number;         // 1 - 30
  surah: string;       // Nama Surah e.g., "Al-Baqarah", "Yasin"
  verses: string;      // Ayat e.g. "1-20" or "Lengkap"
  status: 'Setoran Baru' | 'Murojaah' | 'Imtihan / Ujian';
  grade: 'A (Istimewa)' | 'B (Lancar)' | 'C (Cukup)';
  date: string;
  verifiedBy: string;  // Nama Ustadz / Ustadzah penguji
}

export interface SecurityLog {
  id: string;
  studentId: string;
  studentName: string;
  permitType: 'Keluar Lingkungan' | 'Pulang (Keluarga)';
  description: string;
  outDate: string;
  expectedReturnDate: string;
  actualReturnDate?: string;
  status: 'Aktif / Keluar' | 'Kembali' | 'Terlambat' | 'Menunggu Persetujuan' | 'Ditolak';
  signedBy: string;
}

export interface DisciplineLog {
  id: string;
  studentId: string;
  studentName: string;
  violationType: string;
  level: 'Ringan' | 'Sedang' | 'Berat';
  points: number;
  consequence: string;
  date: string;
  signedBy: string;
  status?: 'Selesai' | 'Sedang Mengurus' | 'Belum Diurus';
}

export interface HealthLog {
  id: string;
  studentId: string;
  studentName: string;
  complaint: string;
  diagnosis: string;
  treatment: string;
  status: 'Rawat Jalan (Kamar)' | 'Nginap di Poskestren' | 'Dirujuk ke RS / Pulang';
  date: string;
  signedBy: string;
}

export interface Student {
  id: string; // Used as username or matched during login
  nis: string; // NIS 10 digit, format: YYYY.GG.SSSS
  fullName: string;
  gender: 'Laki-laki' | 'Perempuan';
  classPagi: string; // Madrasah pagi
  classSore: string; // Umum sore
  class: string; // e.g. Combined 'XI A SMK TKJ / 1A Mts'
  classMadrasah?: string; // Madrasah class
  classFormal?: string; // Formal class
  akunMadrasah?: string; // Credentials/Account info for madrasah systems
  parentName: string;
  parentPhone: string;
  guardianName?: string;
  email: string; // Used for login
  address: string;
  status: 'Aktif' | 'Alumni' | 'Cuti' | 'Berhenti';
  kamar?: string; // Kamar Santri (Room)
  
  // New comprehensive details
  kk?: string;
  nik?: string;
  fatherName?: string;
  motherName?: string;
  birthPlace?: string;
  birthDate?: string;
  bloodType?: string;
  healthHistory?: string;

  // Quran memorization parameters
  tahfidzLogs?: TahfidzLog[];
  securityLogs?: SecurityLog[];
  disciplineLogs?: DisciplineLog[];
  healthLogs?: HealthLog[];
  currentHafalan?: string; // e.g. "12 Juz"
  photoUrl?: string; // local upload profile picture (base64)
  alumniId?: string; // Unique ID for alumni, generated upon graduation
  tahunKeluar?: string; // Exit/graduation year
  alumniReason?: string; // Sebab berhenti/lulus (e.g., Lulus, Pindah Sekolah, Bekerja, Mengabdi, dll.)
}

export interface Bill {
  id: string;
  studentId: string;
  studentName: string;
  nis?: string;
  title: string; // e.g. 'Syahriyah Juli 2026', 'Uang Seragam'
  amount: number;
  dueDate: string;
  status: 'Lunas' | 'Belum Lunas' | 'Konfirmasi Pembayaran';
  category?: string;
  paymentDate?: string;
  paymentProofUrl?: string;
  paymentMethod?: string;
  senderBank?: string;
  senderAccountNumber?: string;
  verificationStatus?: 'Terverifikasi Otomatis' | 'Perlu Peninjauan' | 'Gagal';
  verificationLogs?: {
    uploadedBy: string;
    uploadedAt: string;
    verifiedAt: string;
    aiResult: string;
  }[];
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  isMain?: boolean;
  type?: 'bank' | 'ewallet';
}

export interface AcademicEvent {
  id: string;
  title: string;
  description: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  category: 'ujian' | 'libur' | 'kegiatan' | 'ppdb';
  location?: string;
  confirmed?: boolean;
}

export interface PortalSettings {
  schoolName: string;
  namaYayasan?: string;
  tagline: string;
  aboutUs: string;
  vision: string;
  mission: string[];
  address: string;
  phone: string;
  email: string;
  logoUrl?: string;
  accentColor: string;
  stempelPesantrenUrl?: string;
  namaPengurus?: string;
  ttdPengurusUrl?: string;
  namaPengasuh?: string;
  stempelPengasuhUrl?: string;
  ttdPengasuhUrl?: string;
  
  // Custom officials with their signatures and stamps
  namaKetuaPcsb?: string;
  ttdKetuaPcsbUrl?: string;
  stempelPcsbUrl?: string;
  
  namaBendahara?: string;
  ttdBendaharaUrl?: string;
  stempelBendaharaUrl?: string;
  
  namaKeamanan?: string;
  ttdKeamananUrl?: string;
  stempelKeamananUrl?: string;
  
  namaKetertiban?: string;
  ttdKetertibanUrl?: string;
  stempelKetertibanUrl?: string;
  
  namaKesehatan?: string;
  ttdKesehatanUrl?: string;
  stempelKesehatanUrl?: string;

  namaAkademik?: string;
  ttdAkademikUrl?: string;
  stempelAkademikUrl?: string;

  ppdbOpen?: boolean;
  ppdbStartDate?: string;
  ppdbEndDate?: string;
  pesantrenBankName?: string;

  // New student (PCSB) auto billing configurations
  pcsbFeePendaftaran?: number;
  pcsbFeeSarpras?: number;
  pcsbFeeSeragam?: number;
  pcsbFeeKitab?: number;
  pcsbFeeKesehatan?: number;
  pcsbFeeSyahriyah?: number;
  pcsbEnablePendaftaran?: boolean;
  pcsbEnableSarpras?: boolean;
  pcsbEnableSeragam?: boolean;
  pcsbEnableKitab?: boolean;
  pcsbEnableKesehatan?: boolean;
  pcsbEnableSyahriyah?: boolean;
  pesantrenBankAccountNumber?: string;
  pesantrenBankAccountName?: string;
  rekeningList?: BankAccount[];
  availableFormalClasses?: string[];
  availableMadrasahClasses?: string[];
}

export interface UserSession {
  role: 'admin' | 'santri' | 'guest' | 'keamanan' | 'ketertiban' | 'kesehatan';
  email?: string;
  studentId?: string; // If role is santri
  fullName?: string; // Individual name for this specific account
  roleName?: string; // Display name for this specific account
}

export interface ForgotPasswordRequest {
  id: string;
  nis: string;
  parentPhone: string;
  studentName: string;
  requestedAt: string;
  status: 'Pending' | 'Disetujui';
  gender?: 'Laki-laki' | 'Perempuan';
  address?: string;
  formalSchool?: string;
  diniyahSchool?: string;
}

export interface Room {
  id: string;
  name: string;
  gender: 'Laki-laki' | 'Perempuan';
  formalSchool: string;
  diniyahSchool: string;
  capacity: number;
  ketuaKamarId?: string;
  ketuaKamarName?: string;
}

export function normalizeRoomName(roomName?: string): string {
  if (!roomName) return '';
  return roomName.replace(/^Kamar\s+/i, '').trim();
}

export function isSameRoom(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  return normalizeRoomName(a).toLowerCase() === normalizeRoomName(b).toLowerCase();
}

export function compressImage(file: File, maxWidth = 300, maxHeight = 400, quality = 0.75): Promise<string> {
  return new Promise((resolve) => {
    // If SVG, read directly as data URL to preserve 100% vector sharpness
    if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
          if (isPng) {
            // Clear canvas to preserve transparency for PNG
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/png'));
          } else {
            // For JPEG/other, fill white background to prevent transparent areas from turning pitch black
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
          }
        } else {
          resolve(e.target?.result as string || '');
        }
      };
      img.onerror = () => {
        resolve(e.target?.result as string || '');
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      resolve('');
    };
    reader.readAsDataURL(file);
  });
}


