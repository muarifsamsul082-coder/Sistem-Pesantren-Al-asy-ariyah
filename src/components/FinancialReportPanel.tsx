import React, { useState, useMemo, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Calendar, 
  Filter, 
  Printer, 
  Plus, 
  Trash2, 
  FileText, 
  Search, 
  Eye, 
  X, 
  CheckCircle2, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownRight,
  Landmark,
  UserCheck,
  Building,
  Tag,
  RefreshCw,
  Image as ImageIcon,
  Pencil
} from 'lucide-react';
import { Bill, Student, PortalSettings, FinancialExpense, compressImage } from '../types';
import { getCityFromAddress } from '../lib/qris';
import { formatIndonesianDate } from '../lib/dateUtils';
import { 
  syncExpensesWithSupabase, 
  pushExpenseToSupabase, 
  deleteExpenseFromSupabase,
  isSupabaseConfigured 
} from '../lib/supabase';

interface FinancialReportPanelProps {
  bills: Bill[];
  students: Student[];
  settings: PortalSettings;
  currentAdminName?: string;
  showAlert: (type: 'success' | 'danger', message: string) => void;
  logAdminActivity: (actionType: string, description: string, targetId?: string, targetName?: string) => void;
}

export default function FinancialReportPanel({
  bills,
  students,
  settings,
  currentAdminName = 'Admin Bendahara',
  showAlert,
  logAdminActivity
}: FinancialReportPanelProps) {
  // Expenses state
  const [expenses, setExpenses] = useState<FinancialExpense[]>(() => {
    try {
      const saved = localStorage.getItem('pesantren_financial_expenses');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    // Default initial mock/seed expenses so the report is immediately insightful
    return [
      {
        id: 'exp-init-1',
        bendaharaType: 'putra',
        bendaharaName: 'Ustadz M. Fauzan (Bendahara Putra)',
        date: '2026-08-05',
        category: 'Konsumsi & Dapur',
        amount: 3500000,
        description: 'Belanja beras 3 kuintal & lauk pauk dapur asrama putra',
        recipient: 'Toko Beras Barokah',
        createdAt: '2026-08-05T08:30:00Z'
      },
      {
        id: 'exp-init-2',
        bendaharaType: 'putri',
        bendaharaName: 'Ustadzah Siti Aminah (Bendahara Putri)',
        date: '2026-08-06',
        category: 'Konsumsi & Dapur',
        amount: 3200000,
        description: 'Belanja bahan pangan sayuran & sembako dapur santri putri',
        recipient: 'Pasar Tradisional Gayam',
        createdAt: '2026-08-06T09:00:00Z'
      },
      {
        id: 'exp-init-3',
        bendaharaType: 'putra',
        bendaharaName: 'Ustadz M. Fauzan (Bendahara Putra)',
        date: '2026-08-10',
        category: 'Operasional Listrik & Air',
        amount: 1450000,
        description: 'Pembayaran token listrik PLN gedung asrama putra & pompa air',
        recipient: 'PLN Persero',
        createdAt: '2026-08-10T10:15:00Z'
      },
      {
        id: 'exp-init-4',
        bendaharaType: 'putri',
        bendaharaName: 'Ustadzah Siti Aminah (Bendahara Putri)',
        date: '2026-08-11',
        category: 'Operasional Listrik & Air',
        amount: 1200000,
        description: 'Pembayaran token listrik PLN komplek asrama putri Khadijah',
        recipient: 'PLN Persero',
        createdAt: '2026-08-11T11:00:00Z'
      },
      {
        id: 'exp-init-5',
        bendaharaType: 'putra',
        bendaharaName: 'Ustadz M. Fauzan (Bendahara Putra)',
        date: '2026-08-15',
        category: 'Sarana & Prasarana',
        amount: 850000,
        description: 'Perbaikan instalasi kran & genteng kamar Al-Ghazali putra',
        recipient: 'TB. Sinar Abadi',
        createdAt: '2026-08-15T14:20:00Z'
      },
      {
        id: 'exp-init-6',
        bendaharaType: 'putri',
        bendaharaName: 'Ustadzah Siti Aminah (Bendahara Putri)',
        date: '2026-08-18',
        category: 'Kitab & Pendidikan',
        amount: 1750000,
        description: 'Pengadaan kitab Fathul Qorib & jurumiyah kelas 1A MI/MTs putri',
        recipient: 'Penerbit Menara Kudus',
        createdAt: '2026-08-18T13:40:00Z'
      }
    ];
  });

  // Cross-device synchronization for expenses
  useEffect(() => {
    localStorage.setItem('pesantren_financial_expenses', JSON.stringify(expenses));
    
    // Broadcast to other tabs
    try {
      const channel = new BroadcastChannel('pesantren_multi_device_sync');
      channel.postMessage({ type: 'EXPENSES_UPDATED', expenses });
      channel.close();
    } catch (e) {}

    // Save to server endpoint
    fetch('/api/financial-expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expenses)
    }).catch(() => {});
  }, [expenses]);

  // Load from server and Supabase on mount
  useEffect(() => {
    const fetchRemoteExpenses = async () => {
      try {
        const res = await fetch('/api/financial-expenses');
        if (res.ok) {
          const json = await res.json();
          if (json && json.success && Array.isArray(json.expenses) && json.expenses.length > 0) {
            setExpenses(json.expenses);
            localStorage.setItem('pesantren_financial_expenses', JSON.stringify(json.expenses));
          }
        }
      } catch (e) {}

      if (isSupabaseConfigured()) {
        try {
          const remote = await syncExpensesWithSupabase(expenses);
          if (Array.isArray(remote) && remote.length > 0) {
            setExpenses(remote);
            localStorage.setItem('pesantren_financial_expenses', JSON.stringify(remote));
          }
        } catch (e) {}
      }
    };
    fetchRemoteExpenses();

    // Listen for storage events across tabs
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'pesantren_financial_expenses' && e.newValue) {
        try {
          setExpenses(JSON.parse(e.newValue));
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Filter States
  const [activeSubTab, setActiveSubTab] = useState<'rekap' | 'pemasukan' | 'pengeluaran'>('rekap');
  const [selectedPeriod, setSelectedPeriod] = useState<'semua' | 'bulan_ini' | 'custom'>('semua');
  const [filterMonth, setFilterMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [genderFilter, setGenderFilter] = useState<'semua' | 'putra' | 'putri'>('semua');
  const [expenseBendaharaFilter, setExpenseBendaharaFilter] = useState<'semua' | 'putra' | 'putri'>('semua');

  // Modal States
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<FinancialExpense | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [viewReceiptModalUrl, setViewReceiptModalUrl] = useState<string | null>(null);

  // Form states for new expense
  const [expBendaharaType, setExpBendaharaType] = useState<'putra' | 'putri'>('putra');
  const [expBendaharaName, setExpBendaharaName] = useState<string>('Ustadz M. Fauzan (Bendahara Putra)');
  const [expDate, setExpDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [expCategory, setExpCategory] = useState<string>('Konsumsi & Dapur');
  const [expAmount, setExpAmount] = useState<number>(0);
  const [expDescription, setExpDescription] = useState<string>('');
  const [expRecipient, setExpRecipient] = useState<string>('');
  const [expReceiptUrl, setExpReceiptUrl] = useState<string>('');
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);

  // Auto update default bendahara name when type changes
  const handleBendaharaTypeChange = (type: 'putra' | 'putri') => {
    setExpBendaharaType(type);
    if (type === 'putra') {
      setExpBendaharaName('Ustadz M. Fauzan (Bendahara Putra)');
    } else {
      setExpBendaharaName(settings.namaBendahara || 'Ustadzah Siti Aminah (Bendahara Putri)');
    }
  };

  // Student Map for easy lookup of gender and metadata
  const studentMap = useMemo(() => {
    const map = new Map<string, Student>();
    (students || []).forEach(s => {
      if (s && s.id) {
        map.set(String(s.id), s);
        if (s.nis) map.set(String(s.nis), s);
      }
    });
    return map;
  }, [students]);

  // Helper date checker within selected period
  const isDateInPeriod = (dateStr?: string) => {
    if (!dateStr) return true;
    const itemDate = dateStr.slice(0, 10);
    if (selectedPeriod === 'semua') return true;
    if (selectedPeriod === 'bulan_ini') {
      return itemDate.startsWith(filterMonth);
    }
    if (selectedPeriod === 'custom') {
      if (startDate && itemDate < startDate) return false;
      if (endDate && itemDate > endDate) return false;
      return true;
    }
    return true;
  };

  // Filtered Paid Bills (Pemasukan)
  const paidBillsWithGender = useMemo(() => {
    return (bills || [])
      .filter(b => b && b.status === 'Lunas')
      .map(b => {
        const std = studentMap.get(String(b.studentId)) || studentMap.get(String(b.nis));
        const gender: 'Laki-laki' | 'Perempuan' = std?.gender === 'Perempuan' ? 'Perempuan' : 'Laki-laki';
        const type: 'putra' | 'putri' = gender === 'Perempuan' ? 'putri' : 'putra';
        return {
          ...b,
          studentGender: gender,
          santriType: type,
          studentObj: std
        };
      })
      .filter(b => {
        if (!isDateInPeriod(b.paidDate || b.paymentDate || b.dueDate)) return false;
        if (genderFilter === 'putra' && b.santriType !== 'putra') return false;
        if (genderFilter === 'putri' && b.santriType !== 'putri') return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = (b.title || '').toLowerCase().includes(q);
          const matchName = (b.studentName || '').toLowerCase().includes(q);
          const matchNis = (b.nis || '').toLowerCase().includes(q);
          if (!matchTitle && !matchName && !matchNis) return false;
        }
        return true;
      });
  }, [bills, studentMap, selectedPeriod, filterMonth, startDate, endDate, genderFilter, searchQuery]);

  // Filtered Expenses (Pengeluaran)
  const filteredExpenses = useMemo(() => {
    return (expenses || [])
      .filter(exp => {
        if (!exp) return false;
        if (!isDateInPeriod(exp.date)) return false;
        if (expenseBendaharaFilter === 'putra' && exp.bendaharaType !== 'putra') return false;
        if (expenseBendaharaFilter === 'putri' && exp.bendaharaType !== 'putri') return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchDesc = (exp.description || '').toLowerCase().includes(q);
          const matchCat = (exp.category || '').toLowerCase().includes(q);
          const matchPic = (exp.bendaharaName || '').toLowerCase().includes(q);
          const matchRecipient = (exp.recipient || '').toLowerCase().includes(q);
          if (!matchDesc && !matchCat && !matchPic && !matchRecipient) return false;
        }
        return true;
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [expenses, selectedPeriod, filterMonth, startDate, endDate, expenseBendaharaFilter, searchQuery]);

  // Aggregate Calculations
  const stats = useMemo(() => {
    // 1. Pemasukan Putra & Putri (hanya tagihan berstatus LUNAS sesuai periode)
    let incomePutra = 0;
    let incomePutri = 0;
    let countPutra = 0;
    let countPutri = 0;

    (bills || []).forEach(b => {
      if (b && b.status === 'Lunas' && isDateInPeriod(b.paidDate || b.paymentDate || b.dueDate)) {
        const std = studentMap.get(String(b.studentId)) || studentMap.get(String(b.nis));
        const isPutri = std?.gender === 'Perempuan';
        const amt = Number(b.amount || 0);
        if (isPutri) {
          incomePutri += amt;
          countPutri += 1;
        } else {
          incomePutra += amt;
          countPutra += 1;
        }
      }
    });

    const totalIncome = incomePutra + incomePutri;

    // 2. Pengeluaran Bendahara Putra & Putri sesuai periode
    let expensePutra = 0;
    let expensePutri = 0;
    let countExpPutra = 0;
    let countExpPutri = 0;

    (expenses || []).forEach(exp => {
      if (exp && isDateInPeriod(exp.date)) {
        const amt = Number(exp.amount || 0);
        if (exp.bendaharaType === 'putri') {
          expensePutri += amt;
          countExpPutri += 1;
        } else {
          expensePutra += amt;
          countExpPutra += 1;
        }
      }
    });

    const totalExpense = expensePutra + expensePutri;

    // 3. Saldo Kas Masing-Masing
    const balancePutra = incomePutra - expensePutra;
    const balancePutri = incomePutri - expensePutri;
    const netBalance = totalIncome - totalExpense;

    return {
      incomePutra,
      incomePutri,
      totalIncome,
      countPutra,
      countPutri,
      expensePutra,
      expensePutri,
      totalExpense,
      countExpPutra,
      countExpPutri,
      balancePutra,
      balancePutri,
      netBalance
    };
  }, [bills, expenses, studentMap, selectedPeriod, filterMonth, startDate, endDate]);

  // Open Add Expense Form
  const handleOpenAddExpense = () => {
    setEditingExpense(null);
    setExpBendaharaType('putra');
    setExpBendaharaName('Ustadz M. Fauzan (Bendahara Putra)');
    setExpDate(new Date().toISOString().split('T')[0]);
    setExpCategory('Konsumsi & Dapur');
    setExpAmount(0);
    setExpDescription('');
    setExpRecipient('');
    setExpReceiptUrl('');
    setIsAddExpenseModalOpen(true);
  };

  // Open Edit Expense Form
  const handleOpenEditExpense = (exp: FinancialExpense) => {
    setEditingExpense(exp);
    setExpBendaharaType(exp.bendaharaType);
    setExpBendaharaName(exp.bendaharaName);
    setExpDate(exp.date);
    setExpCategory(exp.category);
    setExpAmount(Number(exp.amount) || 0);
    setExpDescription(exp.description);
    setExpRecipient(exp.recipient || '');
    setExpReceiptUrl(exp.receiptUrl || '');
    setIsAddExpenseModalOpen(true);
  };

  // Handle Save Expense (Add or Edit)
  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expAmount || expAmount <= 0) {
      alert('Masukkan nominal pengeluaran yang valid.');
      return;
    }
    if (!expDescription.trim()) {
      alert('Tuliskan keterangan keperluan pengeluaran.');
      return;
    }

    if (editingExpense) {
      // Update existing expense
      const updatedExp: FinancialExpense = {
        ...editingExpense,
        bendaharaType: expBendaharaType,
        bendaharaName: expBendaharaName.trim() || (expBendaharaType === 'putra' ? 'Bendahara Putra' : 'Bendahara Putri'),
        date: expDate || new Date().toISOString().split('T')[0],
        category: expCategory,
        amount: Number(expAmount),
        description: expDescription.trim(),
        recipient: expRecipient.trim() || undefined,
        receiptUrl: expReceiptUrl || undefined
      };

      setExpenses(prev => {
        const next = prev.map(item => item.id === editingExpense.id ? updatedExp : item);
        try {
          localStorage.setItem('pesantren_financial_expenses', JSON.stringify(next));
        } catch (e) {}
        return next;
      });

      pushExpenseToSupabase(updatedExp).catch(console.error);

      logAdminActivity(
        'PENGELUARAN_KAS',
        `Memperbarui pengeluaran ${updatedExp.bendaharaType === 'putra' ? 'Bendahara Putra' : 'Bendahara Putri'} sebesar Rp ${updatedExp.amount.toLocaleString('id-ID')} (${updatedExp.category}): ${updatedExp.description}`
      );

      showAlert('success', `Perubahan catatan pengeluaran kas berhasil disimpan & disinkronkan!`);

      // Reset & Close
      setIsAddExpenseModalOpen(false);
      setEditingExpense(null);
      setExpAmount(0);
      setExpDescription('');
      setExpRecipient('');
      setExpReceiptUrl('');
      return;
    }

    // Create new expense
    const newExp: FinancialExpense = {
      id: `exp-${Date.now()}`,
      bendaharaType: expBendaharaType,
      bendaharaName: expBendaharaName.trim() || (expBendaharaType === 'putra' ? 'Bendahara Putra' : 'Bendahara Putri'),
      date: expDate || new Date().toISOString().split('T')[0],
      category: expCategory,
      amount: Number(expAmount),
      description: expDescription.trim(),
      recipient: expRecipient.trim() || undefined,
      receiptUrl: expReceiptUrl || undefined,
      createdAt: new Date().toISOString()
    };

    setExpenses(prev => {
      const next = [newExp, ...prev];
      try {
        localStorage.setItem('pesantren_financial_expenses', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    pushExpenseToSupabase(newExp).catch(console.error);

    logAdminActivity(
      'PENGELUARAN_KAS',
      `Mencatat pengeluaran ${newExp.bendaharaType === 'putra' ? 'Bendahara Putra' : 'Bendahara Putri'} sebesar Rp ${newExp.amount.toLocaleString('id-ID')} (${newExp.category}): ${newExp.description}`
    );

    showAlert('success', `Pengeluaran ${newExp.bendaharaType === 'putra' ? 'Bendahara Putra' : 'Bendahara Putri'} berhasil dicatat & disinkronkan!`);

    // Reset Form
    setIsAddExpenseModalOpen(false);
    setEditingExpense(null);
    setExpAmount(0);
    setExpDescription('');
    setExpRecipient('');
    setExpReceiptUrl('');
  };

  // Handle Delete Expense with Confirmation and Instant Multi-tab/Supabase Sync
  const handleDeleteExpense = (id: string, description: string) => {
    if (!window.confirm(`Hapus catatan pengeluaran: "${description}"? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }
    setExpenses(prev => {
      const next = prev.filter(e => e.id !== id);
      try {
        localStorage.setItem('pesantren_financial_expenses', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
    deleteExpenseFromSupabase(id).catch(console.error);
    logAdminActivity(
      'PENGELUARAN_KAS',
      `Menghapus catatan pengeluaran kas: ${description}`
    );
    showAlert('success', 'Catatan pengeluaran kas berhasil dihapus secara permanen.');
  };

  // Handle Receipt Upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingReceipt(true);
    try {
      const compressed = await compressImage(file, 900, 1200, 0.8);
      setExpReceiptUrl(compressed);
    } catch (err) {
      alert('Gagal memproses gambar bukti.');
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  // Helpers for category colors
  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'Konsumsi & Dapur':
        return 'bg-amber-100 text-amber-900 border-amber-200';
      case 'Operasional Listrik & Air':
        return 'bg-blue-100 text-blue-900 border-blue-200';
      case 'Sarana & Prasarana':
        return 'bg-emerald-100 text-emerald-900 border-emerald-200';
      case 'Kitab & Pendidikan':
        return 'bg-purple-100 text-purple-900 border-purple-200';
      case 'Honor Pengajar/Asatidz':
        return 'bg-indigo-100 text-indigo-900 border-indigo-200';
      case 'Medis & Kesehatan':
        return 'bg-rose-100 text-rose-900 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const isImageUrl = (url?: string) => {
    if (!url) return false;
    return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image/') || url.startsWith('/');
  };

  return (
    <div className="space-y-6 text-left font-sans">
      {/* HEADER SECTION */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-700 text-white shadow-xs">
              <Landmark className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-black text-slate-900 text-lg uppercase tracking-tight">
                Laporan Keuangan & Kas Pesantren
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Pemisahan arus pemasukan SPP santri putra & putri, serta kontrol pencairan kas bendahara putra & putri.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsAddExpenseModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-emerald-800 to-teal-900 hover:from-emerald-700 hover:to-teal-850 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Plus className="h-4 w-4 text-amber-300" />
            <span>Catat Pengeluaran Kas</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPrintModalOpen(true)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Printer className="h-4 w-4 text-emerald-300" />
            <span>Cetak Laporan Resmi ⎙</span>
          </button>
        </div>
      </div>

      {/* FILTER PERIODE & PENCARIAN */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
          {/* Periode Selector */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-600 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-emerald-700" />
              Periode:
            </span>

            <button
              type="button"
              onClick={() => setSelectedPeriod('semua')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                selectedPeriod === 'semua'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Semua Waktu
            </button>

            <button
              type="button"
              onClick={() => setSelectedPeriod('bulan_ini')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                selectedPeriod === 'bulan_ini'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Per Bulan
            </button>

            <button
              type="button"
              onClick={() => setSelectedPeriod('custom')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                selectedPeriod === 'custom'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Rentang Tanggal
            </button>

            {/* Month Picker */}
            {selectedPeriod === 'bulan_ini' && (
              <input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="px-2.5 py-1 text-xs border border-emerald-300 rounded-lg bg-emerald-50 text-emerald-950 font-bold focus:outline-none"
              />
            )}

            {/* Date Range Picker */}
            {selectedPeriod === 'custom' && (
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-2 py-1 text-xs border border-emerald-300 rounded-lg bg-emerald-50 text-emerald-950 font-medium"
                />
                <span className="text-slate-400 font-bold">s/d</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-2 py-1 text-xs border border-emerald-300 rounded-lg bg-emerald-50 text-emerald-950 font-medium"
                />
              </div>
            )}
          </div>

          {/* Quick Search */}
          <div className="relative min-w-[240px]">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari transaksi, santri, atau keterangan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </div>
        </div>
      </div>

      {/* SUMMARY DASHBOARD CARDS (PUTRA vs PUTRI) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Kas Santri Putra */}
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-5 rounded-2xl shadow-sm space-y-3 relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/5 rounded-full pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-black tracking-widest text-indigo-200 flex items-center gap-1">
              <span>🔵</span> Sektor Kas Putra
            </span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-500/30 text-indigo-100 border border-indigo-400/30">
              Bendahara Putra
            </span>
          </div>

          <div>
            <span className="text-xs text-indigo-200 block">Sisa Saldo Kas Putra</span>
            <div className="text-2xl font-black text-white tracking-tight mt-0.5">
              Rp {stats.balancePutra.toLocaleString('id-ID')}
            </div>
          </div>

          <div className="pt-2 border-t border-indigo-800/80 grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-indigo-300 block text-[9.5px]">Pemasukan SPP ({stats.countPutra})</span>
              <strong className="text-emerald-300 font-extrabold">+Rp {stats.incomePutra.toLocaleString('id-ID')}</strong>
            </div>
            <div>
              <span className="text-indigo-300 block text-[9.5px]">Pengeluaran ({stats.countExpPutra})</span>
              <strong className="text-rose-300 font-extrabold">-Rp {stats.expensePutra.toLocaleString('id-ID')}</strong>
            </div>
          </div>
        </div>

        {/* Card 2: Kas Santri Putri */}
        <div className="bg-gradient-to-br from-rose-900 to-slate-900 text-white p-5 rounded-2xl shadow-sm space-y-3 relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/5 rounded-full pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-black tracking-widest text-rose-200 flex items-center gap-1">
              <span>🌸</span> Sektor Kas Putri
            </span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-500/30 text-rose-100 border border-rose-400/30">
              Bendahara Putri
            </span>
          </div>

          <div>
            <span className="text-xs text-rose-200 block">Sisa Saldo Kas Putri</span>
            <div className="text-2xl font-black text-white tracking-tight mt-0.5">
              Rp {stats.balancePutri.toLocaleString('id-ID')}
            </div>
          </div>

          <div className="pt-2 border-t border-rose-800/80 grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-rose-300 block text-[9.5px]">Pemasukan SPP ({stats.countPutri})</span>
              <strong className="text-emerald-300 font-extrabold">+Rp {stats.incomePutri.toLocaleString('id-ID')}</strong>
            </div>
            <div>
              <span className="text-rose-300 block text-[9.5px]">Pengeluaran ({stats.countExpPutri})</span>
              <strong className="text-rose-300 font-extrabold">-Rp {stats.expensePutri.toLocaleString('id-ID')}</strong>
            </div>
          </div>
        </div>

        {/* Card 3: Total Akumulasi Pesantren */}
        <div className="bg-gradient-to-br from-emerald-900 to-teal-950 text-white p-5 rounded-2xl shadow-sm space-y-3 relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/5 rounded-full pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-black tracking-widest text-emerald-200 flex items-center gap-1">
              <span>🏛️</span> Total Kas Gabungan Pesantren
            </span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/30 text-emerald-100 border border-emerald-400/30">
              Putra + Putri
            </span>
          </div>

          <div>
            <span className="text-xs text-emerald-200 block">Total Saldo Bersih Pesantren</span>
            <div className="text-2xl font-black text-amber-300 tracking-tight mt-0.5">
              Rp {stats.netBalance.toLocaleString('id-ID')}
            </div>
          </div>

          <div className="pt-2 border-t border-emerald-800/80 grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-emerald-300 block text-[9.5px]">Total Pemasukan</span>
              <strong className="text-white font-extrabold">Rp {stats.totalIncome.toLocaleString('id-ID')}</strong>
            </div>
            <div>
              <span className="text-emerald-300 block text-[9.5px]">Total Pengeluaran</span>
              <strong className="text-rose-300 font-extrabold">Rp {stats.totalExpense.toLocaleString('id-ID')}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* SUB-TABS NAVIGATION: REKAP ARUS KAS / PEMASUKAN / PENGELUARAN */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('rekap')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'rekap'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Wallet className="h-4 w-4" />
            <span>Rekap Arus Kas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('pemasukan')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'pemasukan'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ArrowDownRight className="h-4 w-4 text-emerald-400" />
            <span>Pemasukan Santri ({paidBillsWithGender.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('pengeluaran')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'pengeluaran'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ArrowUpRight className="h-4 w-4 text-rose-400" />
            <span>Pengeluaran Bendahara ({filteredExpenses.length})</span>
          </button>
        </div>
      </div>

      {/* CONTENT: SUB-TAB 1: REKAP ARUS KAS (KOMPARASI SEKTOR PUTRA & PUTRI) */}
      {activeSubTab === 'rekap' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Kolom Kiri: Rincian Sektor Putra */}
          <div className="bg-white rounded-2xl border border-indigo-100 p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-indigo-50 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-indigo-600" />
                <h3 className="font-extrabold text-sm text-slate-900 uppercase">
                  Arus Kas Santri & Bendahara Putra
                </h3>
              </div>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                PIC: Ustadz M. Fauzan
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 bg-indigo-50/60 rounded-xl flex justify-between items-center">
                <span className="font-semibold text-slate-700">Total Pemasukan Tagihan/SPP Putra:</span>
                <span className="font-extrabold text-indigo-950 text-sm">
                  +Rp {stats.incomePutra.toLocaleString('id-ID')}
                </span>
              </div>

              <div className="p-3 bg-rose-50/60 rounded-xl flex justify-between items-center">
                <span className="font-semibold text-slate-700">Dana Dicairkan Bendahara Putra:</span>
                <span className="font-extrabold text-rose-900 text-sm">
                  -Rp {stats.expensePutra.toLocaleString('id-ID')}
                </span>
              </div>

              <div className="p-3 bg-slate-900 text-white rounded-xl flex justify-between items-center">
                <span className="font-bold text-indigo-200">Sisa Kas Tersedia (Putra):</span>
                <span className="font-black text-amber-300 text-base">
                  Rp {stats.balancePutra.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* Pengeluaran Terakhir Putra */}
            <div className="pt-2">
              <h4 className="text-[11px] font-bold uppercase text-slate-500 mb-2">3 Pengeluaran Terakhir Bendahara Putra:</h4>
              <div className="space-y-1.5">
                {expenses.filter(e => e.bendaharaType === 'putra').slice(0, 3).map(e => (
                  <div key={e.id} className="p-2 bg-slate-50 rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <strong className="text-slate-900 block">{e.description}</strong>
                      <span className="text-[10px] text-slate-500">{e.date} • {e.category}</span>
                    </div>
                    <span className="font-bold text-rose-700">Rp {e.amount.toLocaleString('id-ID')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Rincian Sektor Putri */}
          <div className="bg-white rounded-2xl border border-rose-100 p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-rose-50 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500" />
                <h3 className="font-extrabold text-sm text-slate-900 uppercase">
                  Arus Kas Santri & Bendahara Putri
                </h3>
              </div>
              <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                PIC: {settings.namaBendahara || 'Ustadzah Siti Aminah'}
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 bg-rose-50/60 rounded-xl flex justify-between items-center">
                <span className="font-semibold text-slate-700">Total Pemasukan Tagihan/SPP Putri:</span>
                <span className="font-extrabold text-rose-950 text-sm">
                  +Rp {stats.incomePutri.toLocaleString('id-ID')}
                </span>
              </div>

              <div className="p-3 bg-rose-50/60 rounded-xl flex justify-between items-center">
                <span className="font-semibold text-slate-700">Dana Dicairkan Bendahara Putri:</span>
                <span className="font-extrabold text-rose-900 text-sm">
                  -Rp {stats.expensePutri.toLocaleString('id-ID')}
                </span>
              </div>

              <div className="p-3 bg-slate-900 text-white rounded-xl flex justify-between items-center">
                <span className="font-bold text-rose-200">Sisa Kas Tersedia (Putri):</span>
                <span className="font-black text-amber-300 text-base">
                  Rp {stats.balancePutri.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* Pengeluaran Terakhir Putri */}
            <div className="pt-2">
              <h4 className="text-[11px] font-bold uppercase text-slate-500 mb-2">3 Pengeluaran Terakhir Bendahara Putri:</h4>
              <div className="space-y-1.5">
                {expenses.filter(e => e.bendaharaType === 'putri').slice(0, 3).map(e => (
                  <div key={e.id} className="p-2 bg-slate-50 rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <strong className="text-slate-900 block">{e.description}</strong>
                      <span className="text-[10px] text-slate-500">{e.date} • {e.category}</span>
                    </div>
                    <span className="font-bold text-rose-700">Rp {e.amount.toLocaleString('id-ID')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTENT: SUB-TAB 2: TABEL PEMASUKAN SPP (PUTRA & PUTRI TERPISAH) */}
      {activeSubTab === 'pemasukan' && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4 shadow-xs">
          {/* Controls: Filter Putra vs Putri */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Filter Sektor Santri:</span>
              <button
                type="button"
                onClick={() => setGenderFilter('semua')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  genderFilter === 'semua' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Semua ({bills.filter(b => b.status === 'Lunas').length})
              </button>
              <button
                type="button"
                onClick={() => setGenderFilter('putra')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  genderFilter === 'putra' ? 'bg-indigo-800 text-white' : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
                }`}
              >
                <span>🔵</span> Santri Putra ({bills.filter(b => b.status === 'Lunas' && studentMap.get(String(b.studentId))?.gender !== 'Perempuan').length})
              </button>
              <button
                type="button"
                onClick={() => setGenderFilter('putri')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  genderFilter === 'putri' ? 'bg-rose-800 text-white' : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                }`}
              >
                <span>🌸</span> Santri Putri ({bills.filter(b => b.status === 'Lunas' && studentMap.get(String(b.studentId))?.gender === 'Perempuan').length})
              </button>
            </div>

            <div className="text-xs font-bold text-emerald-900 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
              Subtotal Pemasukan: Rp {paidBillsWithGender.reduce((acc, curr) => acc + Number(curr.amount || 0), 0).toLocaleString('id-ID')}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">No</th>
                  <th className="py-2.5 px-3">Tanggal Bayar</th>
                  <th className="py-2.5 px-3">Nama Santri & NIS</th>
                  <th className="py-2.5 px-3 text-center">Sektor</th>
                  <th className="py-2.5 px-3">Kelas & Kamar</th>
                  <th className="py-2.5 px-3">Kategori Tagihan</th>
                  <th className="py-2.5 px-3">Metode Bayar</th>
                  <th className="py-2.5 px-3 text-right">Nominal (Rp)</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paidBillsWithGender.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400 italic">
                      Tidak ada data pemasukan SPP/tagihan yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  paidBillsWithGender.map((b, idx) => (
                    <tr key={b.id || idx} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 px-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                        {b.paidDate || b.paymentDate || '-'}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-extrabold text-slate-900">{b.studentName || '-'}</div>
                        <div className="text-[10px] text-slate-500 font-mono">NIS: {b.nis || '-'}</div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider ${
                          b.santriType === 'putri'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                        }`}>
                          {b.santriType === 'putri' ? 'Santri Putri' : 'Santri Putra'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-800">
                          {b.studentObj?.classFormal || b.studentObj?.classMadrasah || b.studentObj?.class || '-'}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {b.studentObj?.kamar || '-'}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {b.title}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-600">
                        {b.paymentMethod || 'Transfer'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-emerald-800 font-mono">
                        Rp {Number(b.amount || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-800">
                          LUNAS
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTENT: SUB-TAB 3: TABEL PENGELUARAN (BENDAHARA PUTRA & PUTRI DIBEDAKAN) */}
      {activeSubTab === 'pengeluaran' && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4 shadow-xs">
          {/* Controls: Filter Bendahara Putra vs Putri */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Filter Bendahara Pengambil Uang:</span>
              <button
                type="button"
                onClick={() => setExpenseBendaharaFilter('semua')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  expenseBendaharaFilter === 'semua' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Semua Bendahara
              </button>
              <button
                type="button"
                onClick={() => setExpenseBendaharaFilter('putra')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  expenseBendaharaFilter === 'putra' ? 'bg-indigo-800 text-white' : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
                }`}
              >
                <span>🔵</span> Bendahara Putra (Rp {stats.expensePutra.toLocaleString('id-ID')})
              </button>
              <button
                type="button"
                onClick={() => setExpenseBendaharaFilter('putri')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  expenseBendaharaFilter === 'putri' ? 'bg-rose-800 text-white' : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                }`}
              >
                <span>🌸</span> Bendahara Putri (Rp {stats.expensePutri.toLocaleString('id-ID')})
              </button>
            </div>

            <button
              type="button"
              onClick={handleOpenAddExpense}
              className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer self-start sm:self-auto shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ Tambah Pengeluaran</span>
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">No</th>
                  <th className="py-2.5 px-3">Tanggal</th>
                  <th className="py-2.5 px-3 text-center">Penarik Dana</th>
                  <th className="py-2.5 px-3">Nama Bendahara</th>
                  <th className="py-2.5 px-3">Kategori</th>
                  <th className="py-2.5 px-4">Keterangan / Keperluan</th>
                  <th className="py-2.5 px-3">Penerima/Toko</th>
                  <th className="py-2.5 px-3 text-right">Nominal (Rp)</th>
                  <th className="py-2.5 px-3 text-center">Bukti</th>
                  <th className="py-2.5 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400 italic">
                      Belum ada catatan pengeluaran kas pada filter ini.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp, idx) => (
                    <tr key={exp.id || idx} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 px-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">{exp.date}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider ${
                          exp.bendaharaType === 'putri'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                        }`}>
                          {exp.bendaharaType === 'putri' ? 'Bendahara Putri' : 'Bendahara Putra'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-extrabold text-slate-900">
                        {exp.bendaharaName}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getCategoryBadgeClass(exp.category)}`}>
                          {exp.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 max-w-[280px]">
                        <span className="font-semibold text-slate-800 block">{exp.description}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-medium">
                        {exp.recipient || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-rose-700 font-mono">
                        Rp {Number(exp.amount || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {exp.receiptUrl ? (
                          <button
                            type="button"
                            onClick={() => setViewReceiptModalUrl(exp.receiptUrl!)}
                            className="p-1 hover:bg-emerald-50 text-emerald-700 rounded transition cursor-pointer"
                            title="Lihat Foto Struk / Kwitansi"
                          >
                            <ImageIcon className="h-4 w-4" />
                          </button>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditExpense(exp)}
                            className="p-1.5 hover:bg-blue-50 text-blue-600 hover:text-blue-800 rounded-lg transition cursor-pointer border border-transparent hover:border-blue-200"
                            title="Edit Catatan Pengeluaran"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(exp.id, exp.description)}
                            className="p-1.5 hover:bg-rose-50 text-rose-600 hover:text-rose-800 rounded-lg transition cursor-pointer border border-transparent hover:border-rose-200"
                            title="Hapus Catatan Pengeluaran"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: FORM PENCATATAN PENGELUARAN BENDAHARA */}
      {isAddExpenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden text-left font-sans">
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-emerald-850 to-teal-950 text-white flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  {editingExpense ? (
                    <>
                      <Pencil className="h-4 w-4" />
                      Edit Catatan Pengeluaran Kas
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Catat Pengeluaran Kas Bendahara
                    </>
                  )}
                </h3>
                <p className="text-[11px] text-emerald-100 mt-0.5">
                  {editingExpense 
                    ? 'Perbarui rincian, tanggal, nominal, atau bukti nota pengeluaran kas pesantren.'
                    : 'Catat dana yang diambil oleh bendahara putra atau putri secara akurat.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddExpenseModalOpen(false);
                  setEditingExpense(null);
                }}
                className="p-1 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveExpense} className="p-5 space-y-4 overflow-y-auto text-xs">
              {/* Sektor Penarik Dana: Bendahara Putra vs Bendahara Putri */}
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-700 mb-1">
                  Pihak / Bendahara yang Mengambil Dana:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleBendaharaTypeChange('putra')}
                    className={`py-2 px-3 rounded-xl border text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      expBendaharaType === 'putra'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-950 ring-2 ring-indigo-500/20'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>🔵</span>
                    <span>Bendahara Putra</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleBendaharaTypeChange('putri')}
                    className={`py-2 px-3 rounded-xl border text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      expBendaharaType === 'putri'
                        ? 'bg-rose-50 border-rose-500 text-rose-950 ring-2 ring-rose-500/20'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>🌸</span>
                    <span>Bendahara Putri</span>
                  </button>
                </div>
              </div>

              {/* Nama PIC Bendahara */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-600 mb-0.5">Nama Bendahara / PIC</label>
                <input
                  type="text"
                  required
                  value={expBendaharaName}
                  onChange={(e) => setExpBendaharaName(e.target.value)}
                  placeholder="Contoh: Ustadz M. Fauzan / Ustadzah Siti Aminah"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700 font-bold text-slate-900"
                />
              </div>

              {/* Tanggal & Kategori */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-600 mb-0.5">Tanggal Pengeluaran</label>
                  <input
                    type="date"
                    required
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-600 mb-0.5">Kategori Keperluan</label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700 font-bold bg-white"
                  >
                    <option value="Konsumsi & Dapur">Konsumsi & Dapur Santri</option>
                    <option value="Operasional Listrik & Air">Operasional Listrik, Air & Wifi</option>
                    <option value="Sarana & Prasarana">Sarana & Kamar Asrama</option>
                    <option value="Kitab & Pendidikan">Kitab & Pendidikan Santri</option>
                    <option value="Honor Pengajar/Asatidz">Honor Pengajar / Asatidz</option>
                    <option value="Medis & Kesehatan">Medis & Kesehatan Poskestren</option>
                    <option value="Kegiatan & Ekstrakurikuler">Kegiatan & Ekstrakurikuler</option>
                    <option value="Lain-lain">Lain-lain / Keperluan Darurat</option>
                  </select>
                </div>
              </div>

              {/* Nominal Pengeluaran (Rp) */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-600 mb-0.5">Nominal Uang yang Diambil (Rupiah)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 font-black text-slate-400">Rp</span>
                  <input
                    type="number"
                    min={1000}
                    step={1000}
                    required
                    value={expAmount || ''}
                    onChange={(e) => setExpAmount(Number(e.target.value))}
                    placeholder="0"
                    className="w-full pl-10 pr-3 py-2 text-sm font-black text-rose-700 font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-600"
                  />
                </div>
              </div>

              {/* Deskripsi Keperluan */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-600 mb-0.5">Keterangan / Rincian Pengeluaran</label>
                <textarea
                  rows={2}
                  required
                  value={expDescription}
                  onChange={(e) => setExpDescription(e.target.value)}
                  placeholder="Tuliskan rincian pembelian, unit barang, atau peruntukan kas..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700 font-medium"
                />
              </div>

              {/* Penerima / Toko */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-600 mb-0.5">Penerima Dana / Nama Toko / Vendor (Opsional)</label>
                <input
                  type="text"
                  value={expRecipient}
                  onChange={(e) => setExpRecipient(e.target.value)}
                  placeholder="Contoh: Toko Barokah / PLN Persero"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              {/* Upload Foto Struk / Bukti Kwitansi */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-600 mb-0.5">Foto Struk / Kwitansi (Opsional)</label>
                <div className="flex items-center gap-3">
                  <label className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer transition flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5" />
                    <span>Pilih Foto Bukti</span>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                  {isUploadingReceipt && <span className="text-[10px] text-emerald-700 font-semibold animate-pulse">Memproses foto...</span>}
                  {expReceiptUrl && <span className="text-[10px] text-emerald-800 font-bold">✓ Foto terunggah</span>}
                </div>
                {expReceiptUrl && (
                  <div className="mt-2 relative w-24 h-24 rounded-lg overflow-hidden border border-slate-200">
                    <img src={expReceiptUrl} alt="Preview Bukti" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setExpReceiptUrl('')}
                      className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-0.5 hover:bg-rose-700"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddExpenseModalOpen(false);
                    setEditingExpense(null);
                  }}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-emerald-800 to-teal-900 hover:from-emerald-700 hover:to-teal-850 text-white font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  {editingExpense ? 'Simpan Perubahan Pengeluaran' : 'Simpan Catatan Pengeluaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: PREVIEW RECEIPT IMAGE */}
      {viewReceiptModalUrl && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 space-y-3 relative text-left">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h4 className="font-extrabold text-sm text-slate-900">Bukti Nota / Kwitansi Pengeluaran</h4>
              <button
                type="button"
                onClick={() => setViewReceiptModalUrl(null)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto flex items-center justify-center bg-slate-100 rounded-xl p-2">
              <img src={viewReceiptModalUrl} alt="Bukti Kwitansi" className="max-w-full max-h-[65vh] object-contain rounded-lg" />
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CETAK DOKUMEN LAPORAN KEUANGAN RESMI (A4 STANDAR PESANTREN) */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden text-left font-sans">
            {/* Header Dialog */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="h-4 w-4 text-emerald-400" />
                <h3 className="font-extrabold text-sm uppercase">Pratinjau Cetak Laporan Keuangan Resmi</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-lg shadow-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Cetak Dokumen Sekarang</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-1 hover:bg-white/10 rounded-lg text-white/80 transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Body (A4 Style) */}
            <div className="p-8 sm:p-10 space-y-6 overflow-y-auto bg-white text-slate-900 text-xs print:p-0 print:m-0 print:overflow-visible">
              {/* KOP RESMI PESANTREN */}
              <div className="flex items-center gap-4 border-b-2 border-slate-900 pb-3">
                {settings.logoUrl && isImageUrl(settings.logoUrl) ? (
                  <img src={settings.logoUrl} alt="Logo" className="h-16 w-16 object-contain shrink-0" />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-emerald-900 text-white flex items-center justify-center font-bold text-xl shrink-0">
                    PA
                  </div>
                )}
                <div className="text-center flex-1">
                  <h2 className="font-serif font-black text-lg tracking-wide uppercase text-slate-950">
                    {settings.schoolName || "PONDOK PESANTREN AL-ASY'ARIYAH"}
                  </h2>
                  <p className="text-[10px] text-slate-600 mt-0.5 font-medium">
                    {settings.address || "Semarang, Jawa Tengah"} • Telp/WA: {settings.phone || "-"}
                  </p>
                  <p className="text-[9px] text-slate-500 font-mono">
                    Email: {settings.email || "info@alasyariyah.sch.id"} • Website Resmi Pesantren
                  </p>
                </div>
              </div>

              {/* JUDUL DOKUMEN */}
              <div className="text-center space-y-1">
                <h3 className="font-extrabold text-sm uppercase underline tracking-wider text-slate-950">
                  LAPORAN REKAPITULASI KEUANGAN & ARUS KAS
                </h3>
                <p className="text-[10px] text-slate-600 font-semibold">
                  Periode: {selectedPeriod === 'semua' ? 'Seluruh Transaksi Terdata' : selectedPeriod === 'bulan_ini' ? `Bulan ${filterMonth}` : `${startDate} s/d ${endDate}`}
                </p>
              </div>

              {/* TABEL REKAP ARUS KAS PUTRA VS PUTRI */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-xs uppercase text-slate-900 border-b border-slate-300 pb-1">
                  I. REKAPITULASI ARUS KAS SEKTORAL
                </h4>
                <table className="w-full border-collapse border border-slate-300 text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-extrabold">
                      <th className="border border-slate-300 p-2 text-left">Sektor Kas</th>
                      <th className="border border-slate-300 p-2 text-right">Total Pemasukan (SPP)</th>
                      <th className="border border-slate-300 p-2 text-right">Total Pengeluaran Kas</th>
                      <th className="border border-slate-300 p-2 text-right">Sisa Saldo Kas</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-300 p-2 font-bold text-indigo-950">
                        Sektor Putra (Santri & Bendahara Putra)
                      </td>
                      <td className="border border-slate-300 p-2 text-right font-mono font-bold text-emerald-800">
                        Rp {stats.incomePutra.toLocaleString('id-ID')}
                      </td>
                      <td className="border border-slate-300 p-2 text-right font-mono font-bold text-rose-800">
                        Rp {stats.expensePutra.toLocaleString('id-ID')}
                      </td>
                      <td className="border border-slate-300 p-2 text-right font-mono font-black text-slate-950">
                        Rp {stats.balancePutra.toLocaleString('id-ID')}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 p-2 font-bold text-rose-950">
                        Sektor Putri (Santri & Bendahara Putri)
                      </td>
                      <td className="border border-slate-300 p-2 text-right font-mono font-bold text-emerald-800">
                        Rp {stats.incomePutri.toLocaleString('id-ID')}
                      </td>
                      <td className="border border-slate-300 p-2 text-right font-mono font-bold text-rose-800">
                        Rp {stats.expensePutri.toLocaleString('id-ID')}
                      </td>
                      <td className="border border-slate-300 p-2 text-right font-mono font-black text-slate-950">
                        Rp {stats.balancePutri.toLocaleString('id-ID')}
                      </td>
                    </tr>
                    <tr className="bg-slate-100/80 font-black">
                      <td className="border border-slate-300 p-2 uppercase">
                        TOTAL AKUMULASI PESANTREN
                      </td>
                      <td className="border border-slate-300 p-2 text-right font-mono text-emerald-900">
                        Rp {stats.totalIncome.toLocaleString('id-ID')}
                      </td>
                      <td className="border border-slate-300 p-2 text-right font-mono text-rose-900">
                        Rp {stats.totalExpense.toLocaleString('id-ID')}
                      </td>
                      <td className="border border-slate-300 p-2 text-right font-mono text-emerald-950 text-xs">
                        Rp {stats.netBalance.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* TABEL RINCIAN PENGELUARAN BENDAHARA */}
              <div className="space-y-2 pt-2">
                <h4 className="font-extrabold text-xs uppercase text-slate-900 border-b border-slate-300 pb-1">
                  II. RINCIAN PENGELUARAN KAS BENDAHARA PUTRA & PUTRI
                </h4>
                <table className="w-full border-collapse border border-slate-300 text-[10px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-extrabold">
                      <th className="border border-slate-300 p-1.5 text-center w-8">No</th>
                      <th className="border border-slate-300 p-1.5">Tanggal</th>
                      <th className="border border-slate-300 p-1.5">Penarik Dana</th>
                      <th className="border border-slate-300 p-1.5">Kategori</th>
                      <th className="border border-slate-300 p-1.5">Keperluan & Keterangan</th>
                      <th className="border border-slate-300 p-1.5 text-right">Nominal (Rp)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.map((e, idx) => (
                      <tr key={e.id || idx}>
                        <td className="border border-slate-300 p-1.5 text-center font-mono">{idx + 1}</td>
                        <td className="border border-slate-300 p-1.5 font-mono whitespace-nowrap">{e.date}</td>
                        <td className="border border-slate-300 p-1.5 font-bold">
                          {e.bendaharaType === 'putri' ? 'Bendahara Putri' : 'Bendahara Putra'}
                        </td>
                        <td className="border border-slate-300 p-1.5">{e.category}</td>
                        <td className="border border-slate-300 p-1.5">{e.description}</td>
                        <td className="border border-slate-300 p-1.5 text-right font-mono font-bold">
                          Rp {Number(e.amount).toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* TANDA TANGAN RESMI: STEMPEL DI SEBELAH KANAN TTD TUMPANG TINDIH, 4 SPASI KE BAWAH */}
              <div className="pt-6 border-t border-dashed border-slate-300">
                <p className="text-right text-[10px] text-slate-600 mb-4 font-medium">
                  {getCityFromAddress(settings.address)}, {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>

                <div className="grid grid-cols-3 gap-4 text-left">
                  {/* Tanda Tangan 1: Bendahara Putra */}
                  <div className="space-y-1 relative font-sans">
                    <p className="text-[10px] text-slate-900 font-bold uppercase tracking-wider">Bendahara Putra</p>
                    
                    {/* Area Tanda Tangan: 4 Spasi Kebawah (h-16), Stempel di KANAN model tumpang tindih */}
                    <div className="h-16 w-full relative flex items-center justify-start select-none my-2">
                      <div className="z-10 relative flex items-center justify-start">
                        {isImageUrl(settings.ttdBendaharaUrl) ? (
                          <img src={settings.ttdBendaharaUrl} alt="TTD Bendahara Putra" className="h-16 max-w-[150px] object-contain mix-blend-multiply" />
                        ) : (
                          <span className="text-xs font-serif italic font-bold tracking-wide underline text-slate-900">
                            Ustadz M. Fauzan
                          </span>
                        )}
                      </div>

                      {/* Stempel di sebelah KANAN tanda tangan, model tumpang tindih */}
                      {settings.stempelBendaharaUrl && (
                        <div className="z-20 absolute left-[70px] sm:left-[80px] -top-2 pointer-events-none opacity-85">
                          {isImageUrl(settings.stempelBendaharaUrl) ? (
                            <img src={settings.stempelBendaharaUrl} alt="Stempel Bendahara" className="h-18 w-18 object-contain rotate-[-8deg] mix-blend-multiply" />
                          ) : (
                            <div className="border border-double border-emerald-600/70 text-emerald-800 rounded-full h-14 w-14 flex items-center justify-center text-[6px] font-extrabold uppercase rotate-[-8deg] leading-tight text-center bg-white/70">
                              {settings.stempelBendaharaUrl}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <p className="text-xs font-black text-slate-950 underline leading-none uppercase">Ustadz M. Fauzan</p>
                    <p className="text-[9px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">Bendahara Kampus Putra</p>
                  </div>

                  {/* Tanda Tangan 2: Mengetahui Pengasuh Pesantren (Tengah) */}
                  <div className="space-y-1 relative font-sans">
                    <p className="text-[10px] text-slate-900 font-bold uppercase tracking-wider">Mengetahui, Pengasuh</p>
                    
                    {/* Area Tanda Tangan: 4 Spasi Kebawah (h-16), Stempel di KANAN model tumpang tindih */}
                    <div className="h-16 w-full relative flex items-center justify-start select-none my-2">
                      <div className="z-10 relative flex items-center justify-start">
                        {isImageUrl(settings.ttdPengasuhUrl) ? (
                          <img src={settings.ttdPengasuhUrl} alt="TTD Pengasuh" className="h-16 max-w-[150px] object-contain mix-blend-multiply" />
                        ) : (
                          <span className="text-xs font-serif italic font-bold tracking-wide underline text-slate-900">
                            {settings.namaPengasuh || "KH. Ahmad Wildan"}
                          </span>
                        )}
                      </div>

                      {/* Stempel di sebelah KANAN tanda tangan, model tumpang tindih */}
                      {settings.stempelPengasuhUrl && (
                        <div className="z-20 absolute left-[70px] sm:left-[80px] -top-2 pointer-events-none opacity-85">
                          {isImageUrl(settings.stempelPengasuhUrl) ? (
                            <img src={settings.stempelPengasuhUrl} alt="Stempel Pengasuh" className="h-18 w-18 object-contain rotate-[-8deg] mix-blend-multiply" />
                          ) : (
                            <div className="border border-double border-red-600/70 text-red-800 rounded-full h-14 w-14 flex items-center justify-center text-[6px] font-extrabold uppercase rotate-[-8deg] leading-tight text-center bg-white/70">
                              {settings.stempelPengasuhUrl}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <p className="text-xs font-black text-slate-950 underline leading-none uppercase">{settings.namaPengasuh || "KH. Ahmad Wildan Asy'ari"}</p>
                    <p className="text-[9px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">Pengasuh Pondok Pesantren</p>
                  </div>

                  {/* Tanda Tangan 3: Bendahara Putri */}
                  <div className="space-y-1 relative font-sans">
                    <p className="text-[10px] text-slate-900 font-bold uppercase tracking-wider">Bendahara Putri</p>
                    
                    {/* Area Tanda Tangan: 4 Spasi Kebawah (h-16), Stempel di KANAN model tumpang tindih */}
                    <div className="h-16 w-full relative flex items-center justify-start select-none my-2">
                      <div className="z-10 relative flex items-center justify-start">
                        {isImageUrl(settings.ttdBendaharaUrl) ? (
                          <img src={settings.ttdBendaharaUrl} alt="TTD Bendahara Putri" className="h-16 max-w-[150px] object-contain mix-blend-multiply" />
                        ) : (
                          <span className="text-sm font-serif italic font-bold tracking-wide underline text-slate-900">
                            {settings.namaBendahara || 'Ustadzah Siti Aminah'}
                          </span>
                        )}
                      </div>

                      {/* Stempel di sebelah KANAN tanda tangan, model tumpang tindih */}
                      {(settings.stempelBendaharaUrl || settings.stempelPesantrenUrl) && (
                        <div className="z-20 absolute left-[70px] sm:left-[80px] -top-2 pointer-events-none opacity-85">
                          {isImageUrl(settings.stempelBendaharaUrl || settings.stempelPesantrenUrl) ? (
                            <img src={settings.stempelBendaharaUrl || settings.stempelPesantrenUrl} alt="Stempel Putri" className="h-18 w-18 object-contain rotate-[-8deg] mix-blend-multiply" />
                          ) : (
                            <div className="border border-double border-emerald-600/70 text-emerald-800 rounded-full h-14 w-14 flex items-center justify-center text-[6px] font-extrabold uppercase rotate-[-8deg] leading-tight text-center bg-white/70">
                              {settings.stempelBendaharaUrl || settings.stempelPesantrenUrl}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <p className="text-xs font-black text-slate-950 underline leading-none uppercase">{settings.namaBendahara || "Ustadzah Siti Aminah"}</p>
                    <p className="text-[9px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">Bendahara Kampus Putri</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
