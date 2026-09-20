import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, Landmark, Calendar, Phone, Mail, MapPin, Newspaper, Bell, 
  HelpCircle, ArrowUpRight, GraduationCap, ArrowRight, UserSquare, Sparkles,
  ChevronLeft, ChevronRight, Images, Maximize2, X
} from 'lucide-react';
import { News, Announcement, PortalSettings } from '../types';
import AcademicCalendar from './AcademicCalendar';
import { isPpdbCurrentlyActive } from '../lib/dateUtils';

interface GalleryItem {
  id: string;
  title: string;
  category: 'kegiatan' | 'fasilitas' | 'kajian' | 'ekskul';
  categoryLabel: string;
  imageUrl: string;
  description: string;
}

const DEFAULT_GALLERY: GalleryItem[] = [
  {
    id: 'gal-1',
    title: 'Halaqah Pengajian Kitab Kuning Bersama Pengasuh',
    category: 'kajian',
    categoryLabel: 'Kajian Kitab',
    imageUrl: 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?auto=format&fit=crop&w=800&q=80',
    description: 'Santri tekun menyimak bandongan dan sorogan kitab klasik bersama para masyaikh di serambi masjid.'
  },
  {
    id: 'gal-2',
    title: 'Masjid Utama & Kompleks Keasramaan Pesantren',
    category: 'fasilitas',
    categoryLabel: 'Fasilitas Pesantren',
    imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
    description: 'Pusat peribadatan dan kegiatan harian seluruh santri yang asri, nyaman, dan berdaya tampung ribuan jamaah.'
  },
  {
    id: 'gal-3',
    title: 'Sholat Berjamaah & Wirid Rutin Santri',
    category: 'kegiatan',
    categoryLabel: 'Kegiatan Santri',
    imageUrl: 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?auto=format&fit=crop&w=800&q=80',
    description: 'Rutinitas sholat fardhu lima waktu berjamaah dilanjutkan ratib dan istighotsah demi membentuk akhlak santri.'
  },
  {
    id: 'gal-4',
    title: 'Perpustakaan Turats & Ruang Baca Ilmiah',
    category: 'fasilitas',
    categoryLabel: 'Fasilitas Pesantren',
    imageUrl: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=800&q=80',
    description: 'Koleksi ribuan judul kitab kuning, ensiklopedia Islam, jurnal, serta referensi ilmu pengetahuan umum.'
  },
  {
    id: 'gal-5',
    title: 'Setoran Hafalan & Murojaah Tahfidz Al-Qur\'an',
    category: 'kajian',
    categoryLabel: 'Kajian Kitab',
    imageUrl: 'https://images.unsplash.com/photo-1585036156171-384164a8c675?auto=format&fit=crop&w=800&q=80',
    description: 'Program akselerasi tahfidz Al-Qur\'an 30 Juz dengan bimbingan ustadz pembina mutqin secara istiqomah.'
  },
  {
    id: 'gal-6',
    title: 'Gedung Asrama Santri & Kamar Nyaman',
    category: 'fasilitas',
    categoryLabel: 'Fasilitas Pesantren',
    imageUrl: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=800&q=80',
    description: 'Tata ruang asrama bersih dengan sirkulasi udara baik dan pengawasan ketat dari pembina kamar 24 jam.'
  },
  {
    id: 'gal-7',
    title: 'Latihan Seni Hadrah & Shalawat Rebana',
    category: 'ekskul',
    categoryLabel: 'Ekstrakurikuler',
    imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
    description: 'Pengembangan minat bakat seni musik religi untuk memupuk kecintaan kepada Baginda Nabi Muhammad SAW.'
  },
  {
    id: 'gal-8',
    title: 'Laboratorium Komputer & Multimedia Santri',
    category: 'fasilitas',
    categoryLabel: 'Fasilitas Pesantren',
    imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80',
    description: 'Akses teknologi informasi terarah untuk penunjang riset madrasah dan literasi digital generasi Islam masa kini.'
  },
  {
    id: 'gal-9',
    title: 'Muhadharah / Khitobah Tiga Bahasa Santri',
    category: 'ekskul',
    categoryLabel: 'Ekstrakurikuler',
    imageUrl: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=800&q=80',
    description: 'Melatih kepemimpinan, keberanian mental, dan kecakapan pidato dalam bahasa Arab, Inggris, dan Indonesia.'
  },
  {
    id: 'gal-10',
    title: 'Poskestren (Pos Kesehatan Pesantren)',
    category: 'fasilitas',
    categoryLabel: 'Fasilitas Pesantren',
    imageUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80',
    description: 'Layanan medis pertama dan pemantauan kesehatan berkala bagi seluruh santri oleh tenaga medis profesional.'
  },
  {
    id: 'gal-11',
    title: 'Latihan Seni Bela Diri & Olahraga Kebugaran',
    category: 'ekskul',
    categoryLabel: 'Ekstrakurikuler',
    imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80',
    description: 'Pembinaan fisik tangguh dan kemandirian melalui bela diri pencak silat serta turnamen olahraga santri.'
  },
  {
    id: 'gal-12',
    title: 'Ro\'an Akbar & Khidmah Lingkungan Asri',
    category: 'kegiatan',
    categoryLabel: 'Kegiatan Santri',
    imageUrl: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=800&q=80',
    description: 'Budaya gotong royong menjaga kebersihan lingkungan pesantren sebagai manifestasi iman dan kebersamaan.'
  }
];

interface PublicPortalProps {
  news: News[];
  announcements: Announcement[];
  settings: PortalSettings;
  setView: (view: string) => void;
  onOpenLogin: () => void;
  session?: any;
  currentView?: string;
}

export default function PublicPortal({ 
  news, 
  announcements, 
  settings, 
  setView, 
  onOpenLogin, 
  session, 
  className = "",
  currentView = "home"
}: PublicPortalProps & { className?: string }) {
  const [selectedArticle, setSelectedArticle] = React.useState<News | null>(null);
  const [currentSlide, setCurrentSlide] = React.useState(0);
  const [currentAnnIndex, setCurrentAnnIndex] = React.useState(0);
  const [annFilter, setAnnFilter] = React.useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [galleryCategory, setGalleryCategory] = React.useState<'all' | 'kegiatan' | 'fasilitas' | 'kajian' | 'ekskul'>('all');
  const [selectedGalleryItem, setSelectedGalleryItem] = React.useState<GalleryItem | null>(null);

  const filteredGallery = React.useMemo(() => {
    if (galleryCategory === 'all') return DEFAULT_GALLERY;
    return DEFAULT_GALLERY.filter(item => item.category === galleryCategory);
  }, [galleryCategory]);

  const ppdbStatus = isPpdbCurrentlyActive(settings);

  const publicAnnouncements = announcements.filter(a => a.targetRole === 'all' || !a.targetRole);

  // Auto slide news every 5 seconds
  React.useEffect(() => {
    if (news.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % news.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [news.length]);

  // Auto slide announcements every 6 seconds
  React.useEffect(() => {
    if (publicAnnouncements.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentAnnIndex((prev) => (prev + 1) % publicAnnouncements.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [publicAnnouncements.length]);

  const handlePrevSlide = () => {
    if (news.length <= 1) return;
    setCurrentSlide((prev) => (prev - 1 + news.length) % news.length);
  };

  const handleNextSlide = () => {
    if (news.length <= 1) return;
    setCurrentSlide((prev) => (prev + 1) % news.length);
  };

  const filteredAnnouncements = annFilter === 'all' 
    ? publicAnnouncements 
    : publicAnnouncements.filter(a => a.priority === annFilter);

  return (
    <div className={`space-y-12 pb-16 flex flex-col ${className}`}>
      
      {/* 1. PROFIL SECTION */}
      {(currentView === 'home' || currentView === 'profile') && (
        <section id="profile" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch w-full">
          
          {/* Left Card: Visi Misi */}
          <motion.div 
            initial={{ opacity: 0, y: 35 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.15 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-emerald-50 p-6 sm:p-8 space-y-6"
          >
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-800 font-mono tracking-widest block">Identitas Khidmat</span>
              <h2 className="text-2xl font-black text-emerald-950 mt-1 font-sans">
                Visi & Misi {settings.schoolName}
              </h2>
              <motion.div 
                initial={{ width: 0 }}
                whileInView={{ width: 64 }}
                viewport={{ once: false }}
                transition={{ duration: 1.0, delay: 0.2 }}
                className="border-b-2 border-amber-400 mt-2" 
              />
            </div>

            <motion.div 
              whileHover={{ scale: 1.01 }}
              className="p-4 bg-emerald-50 rounded-xl border-l-4 border-emerald-800 text-xs text-emerald-900 leading-relaxed font-medium transition"
            >
              <span className="font-extrabold uppercase text-[10px] text-emerald-950 block tracking-widest mb-1 font-sans">Visi Pesantren:</span>
              "{settings.vision}"
            </motion.div>

            <div className="space-y-3">
              <span className="font-extrabold uppercase text-[10px] text-emerald-950 block tracking-widest">Misi Pesantren:</span>
              <ul className="space-y-2 text-xs text-gray-600 leading-relaxed list-disc pl-4 font-sans">
                {settings.mission.map((m, idx) => (
                  <motion.li 
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: false }}
                    transition={{ duration: 0.6, delay: 0.12 * idx }}
                    className="hover:text-emerald-950 transition-all font-sans"
                  >
                    {m}
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* Right Card: Sekilas Sejarah & Info */}
          <motion.div 
            initial={{ opacity: 0, y: 35 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.15 }}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-5 bg-white rounded-2xl shadow-sm border border-emerald-100 p-6 sm:p-8 flex flex-col justify-between space-y-6"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <motion.div 
                  whileHover={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 0.5 }}
                  className="inline-flex p-3 bg-emerald-50 text-emerald-800 border border-emerald-200/70 rounded-xl shadow-2xs"
                >
                  <Landmark className="h-6 w-6" />
                </motion.div>
                <span className="text-[10px] uppercase font-bold text-emerald-800 font-mono tracking-widest bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-150">
                  Sekilas Info
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-black text-emerald-950 font-sans">Sekilas Tentang Kami</h3>
                <motion.div 
                  initial={{ width: 0 }}
                  whileInView={{ width: 48 }}
                  viewport={{ once: false }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="border-b-2 border-amber-400 mt-2 mb-3" 
                />
                <p className="text-slate-700 text-xs sm:text-sm leading-relaxed font-sans font-medium whitespace-pre-line">
                  {settings.aboutUs}
                </p>
              </div>
            </div>

            {(ppdbStatus.isActive || session) && (
              <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-2">
                {ppdbStatus.isActive && (
                  <motion.button 
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setView('ppdb')} 
                    className="px-4 py-2.5 bg-emerald-800 font-bold hover:bg-emerald-700 text-white rounded-xl text-xs tracking-wide shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    Daftar Santri Baru <ArrowRight className="h-3.5 w-3.5" />
                  </motion.button>
                )}
                {session && (
                  <motion.button 
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setView(session.role === 'admin' ? 'admin-dashboard' : 'santri-dashboard')}
                    className="px-4 py-2.5 bg-amber-500 font-bold text-slate-950 rounded-xl text-xs hover:bg-amber-400 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    Kembali ke Dashboard Anda ➡️
                  </motion.button>
                )}
              </div>
            )}
          </motion.div>
        </section>
      )}

      {/* 2. CALENDAR SECTION */}
      {(currentView === 'home' || currentView === 'profile') && (
        <section id="calendar" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <AcademicCalendar settings={settings} />
        </section>
      )}

      {/* 3. NEWS SECTION */}
      {(currentView === 'home' || currentView === 'news') && (
        <section id="news" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.12 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-6"
          >
            <div className="text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-800 font-mono tracking-widest block">Kabar Pesantren</span>
              <h3 className="text-xl md:text-2xl font-black text-emerald-950 font-sans">Berita & Kegiatan Terbaru</h3>
              <motion.div 
                initial={{ width: 0 }}
                whileInView={{ width: 48 }}
                viewport={{ once: false }}
                transition={{ duration: 0.9, delay: 0.2 }}
                className="border-b-2 border-amber-400 mx-auto mt-1" 
              />
            </div>

            {news.length > 0 ? (
              <div className="space-y-8">
                {/* Carousel with AnimatePresence image & text transitions */}
                <div className="relative overflow-hidden bg-white rounded-3xl border border-emerald-100 shadow-lg max-w-5xl mx-auto">
                  <div className="relative min-h-[360px] md:min-h-[300px] flex flex-col md:flex-row items-stretch">
                    
                    {/* Animated Image Container */}
                    <div className="relative w-full md:w-1/2 h-64 md:h-auto overflow-hidden shrink-0 bg-slate-900">
                      <AnimatePresence mode="wait">
                        <motion.img 
                          key={`img-${currentSlide}-${news[currentSlide]?.id}`}
                          src={news[currentSlide].image} 
                          alt={news[currentSlide].title} 
                          initial={{ opacity: 0, scale: 1.1 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 1.05 }}
                          transition={{ duration: 0.85, ease: "easeOut" }}
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      </AnimatePresence>
                      <span className="absolute top-4 left-4 bg-emerald-800 text-white font-extrabold text-[9px] uppercase px-3 py-1 rounded-full tracking-wider shadow-sm z-10">
                        {news[currentSlide].category}
                      </span>
                    </div>

                    {/* Animated Text Container */}
                    <div className="p-8 md:p-12 flex-1 flex flex-col justify-between space-y-4 text-left bg-gradient-to-br from-white to-emerald-50/10">
                      <AnimatePresence mode="wait">
                        <motion.div 
                          key={`info-${currentSlide}-${news[currentSlide]?.id}`}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -15 }}
                          transition={{ duration: 0.55, ease: "easeOut" }}
                          className="space-y-3"
                        >
                          <div className="text-[10px] text-emerald-800 font-mono font-bold tracking-wider">{news[currentSlide].date}</div>
                          <h4 className="text-emerald-950 text-xl md:text-2xl font-black font-sans leading-tight">
                            {news[currentSlide].title}
                          </h4>
                          <p className="text-gray-500 font-sans text-xs md:text-sm leading-relaxed line-clamp-3 md:line-clamp-4">
                            {news[currentSlide].excerpt}
                          </p>
                        </motion.div>
                      </AnimatePresence>

                      <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                        <motion.button
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => setSelectedArticle(news[currentSlide])}
                          className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm hover:shadow cursor-pointer"
                        >
                          Baca Selengkapnya
                          <ArrowUpRight className="h-4 w-4" />
                        </motion.button>

                        <div className="flex items-center gap-1.5">
                          <motion.button 
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={handlePrevSlide}
                            className="p-2 rounded-full border border-gray-200 bg-white hover:bg-emerald-50 text-emerald-800 transition shadow-sm cursor-pointer"
                            title="Sebelumnya"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </motion.button>
                          <motion.button 
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={handleNextSlide}
                            className="p-2 rounded-full border border-gray-200 bg-white hover:bg-emerald-50 text-emerald-800 transition shadow-sm cursor-pointer"
                            title="Selanjutnya"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {news.length > 1 && (
                    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-1.5 z-20 md:left-auto md:right-12 md:transform-none">
                      {news.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentSlide(idx)}
                          className={`h-2.5 rounded-full transition-all cursor-pointer ${
                            idx === currentSlide ? 'w-6 bg-emerald-800' : 'w-2.5 bg-gray-300 hover:bg-gray-400'
                          }`}
                          title={`Slide ${idx + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Grid for all other articles when inside News Tab specifically */}
                {currentView === 'news' && (
                  <div className="max-w-6xl mx-auto pt-8">
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Arsip Berita & Kegiatan</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {news.map((item, idx) => (
                        <motion.div 
                          key={item.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: idx * 0.08 }}
                          whileHover={{ y: -6, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
                          className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs flex flex-col justify-between transition-all"
                        >
                          <div>
                            <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                              <img src={item.image} alt={item.title} className="w-full h-full object-cover hover:scale-105 transition duration-500" referrerPolicy="no-referrer" />
                              <span className="absolute top-2.5 left-2.5 bg-emerald-800 text-white text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-full tracking-wider">
                                {item.category}
                              </span>
                            </div>
                            <div className="p-4 space-y-2 text-left">
                              <span className="text-[9px] font-mono font-semibold text-slate-400">{item.date}</span>
                              <h5 className="font-extrabold text-sm text-slate-900 leading-snug line-clamp-2 hover:text-emerald-800 transition-colors cursor-pointer" onClick={() => setSelectedArticle(item)}>
                                {item.title}
                              </h5>
                              <p className="text-slate-500 text-xs leading-relaxed line-clamp-3">
                                {item.excerpt}
                              </p>
                            </div>
                          </div>
                          <div className="p-4 pt-0">
                            <button 
                              onClick={() => setSelectedArticle(item)}
                              className="w-full py-1.5 bg-slate-50 hover:bg-emerald-50 text-emerald-850 hover:text-emerald-900 border border-slate-100 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                            >
                              Baca Artikel <ArrowRight className="h-3 w-3" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-12 text-center border border-emerald-50 text-gray-400 text-xs font-semibold max-w-5xl mx-auto">
                Belum ada berita atau kegiatan terbaru.
              </div>
            )}
          </motion.div>
        </section>
      )}

      {/* 4. PHOTO GALLERY SECTION */}
      {(currentView === 'home' || currentView === 'gallery') && (
        <section id="gallery" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.12 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-6"
          >
            <div className="text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-800 font-mono tracking-widest block">Dokumentasi Pesantren</span>
              <h3 className="text-xl md:text-2xl font-black text-emerald-950 font-sans">Galeri Foto Kegiatan & Fasilitas</h3>
              <p className="text-xs text-slate-500 max-w-xl mx-auto mt-1">
                Menyaksikan potret aktivitas harian santri dalam menuntut ilmu, beribadah, mengasah bakat, serta sarana prasarana penunjang kenyamanan di pondok pesantren.
              </p>
              <motion.div 
                initial={{ width: 0 }}
                whileInView={{ width: 48 }}
                viewport={{ once: false }}
                transition={{ duration: 0.9, delay: 0.2 }}
                className="border-b-2 border-amber-400 mx-auto mt-2" 
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 pt-1 pb-2">
              {[
                { id: 'all', label: 'Semua Foto', count: DEFAULT_GALLERY.length },
                { id: 'kegiatan', label: 'Kegiatan Santri', count: DEFAULT_GALLERY.filter(g => g.category === 'kegiatan').length },
                { id: 'fasilitas', label: 'Fasilitas Pesantren', count: DEFAULT_GALLERY.filter(g => g.category === 'fasilitas').length },
                { id: 'kajian', label: 'Kajian & Tahfidz', count: DEFAULT_GALLERY.filter(g => g.category === 'kajian').length },
                { id: 'ekskul', label: 'Ekstrakurikuler & Seni', count: DEFAULT_GALLERY.filter(g => g.category === 'ekskul').length },
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setGalleryCategory(cat.id as any)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    galleryCategory === cat.id
                      ? 'bg-emerald-800 text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-emerald-300'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    galleryCategory === cat.id ? 'bg-emerald-950/60 text-emerald-200' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {cat.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Responsive Grid Layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
              {filteredGallery.map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.35, delay: idx * 0.04 }}
                  whileHover={{ y: -4 }}
                  onClick={() => setSelectedGalleryItem(item)}
                  className="group bg-white rounded-2xl overflow-hidden border border-slate-150 shadow-xs hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col text-left"
                >
                  {/* Photo Container */}
                  <div className="relative aspect-4/3 overflow-hidden bg-slate-100">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3.5">
                      <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                        <Maximize2 className="h-3.5 w-3.5 text-amber-300" /> Lihat Detail
                      </span>
                    </div>
                    <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-emerald-900/85 text-emerald-100 backdrop-blur-xs border border-emerald-700/50">
                      {item.categoryLabel}
                    </span>
                  </div>

                  {/* Caption & Description */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 line-clamp-2 leading-snug group-hover:text-emerald-850 transition">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mt-1">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>
      )}

      {/* 5. ANNOUNCEMENTS SECTION */}
      {(currentView === 'home' || currentView === 'announcements') && (
        <section id="announcements" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.12 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-6"
          >
            <div className="text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-800 font-mono tracking-widest block">Informasi Resmi</span>
              <h3 className="text-xl md:text-2xl font-black text-emerald-950 font-sans">Pengumuman & Maklumat</h3>
              <motion.div 
                initial={{ width: 0 }}
                whileInView={{ width: 48 }}
                viewport={{ once: false }}
                transition={{ duration: 0.9, delay: 0.2 }}
                className="border-b-2 border-amber-400 mx-auto mt-1" 
              />
            </div>

            {publicAnnouncements.length > 0 ? (
              <div className="max-w-4xl mx-auto space-y-4">
                {/* Filters when on announcements tab */}
                {currentView === 'announcements' && (
                  <div className="flex flex-wrap items-center justify-center gap-1.5 pb-2">
                    {(['all', 'high', 'medium', 'low'] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setAnnFilter(filter)}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition cursor-pointer ${
                          annFilter === filter 
                            ? 'bg-emerald-800 text-white shadow-xs' 
                            : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        {filter === 'all' ? 'Semua Prioritas' : filter === 'high' ? '🔴 Penting / High' : filter === 'medium' ? '🟡 Sedang / Medium' : '🟢 Biasa / Low'}
                      </button>
                    ))}
                  </div>
                )}

                {/* Announcement cards with entry animation */}
                <div className="space-y-3.5">
                  <AnimatePresence>
                    {filteredAnnouncements.map((ann, idx) => (
                      <motion.div 
                        key={ann.id} 
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.35, delay: idx * 0.05 }}
                        whileHover={{ x: 4, transition: { duration: 0.15 } }}
                        className={`p-5 rounded-2xl border bg-white shadow-xs transition-all flex gap-4 items-start ${
                          ann.priority === 'high' 
                            ? 'border-rose-100 bg-rose-50/10' 
                            : ann.priority === 'medium'
                            ? 'border-amber-100 bg-amber-50/10'
                            : 'border-emerald-100 bg-emerald-50/10'
                        }`}
                      >
                        <div className={`p-2.5 rounded-xl shrink-0 ${
                          ann.priority === 'high' 
                            ? 'bg-rose-100 text-rose-700' 
                            : ann.priority === 'medium'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          <Bell className="h-5 w-5" />
                        </div>
                        <div className="space-y-1.5 flex-1 min-w-0 text-left">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-full tracking-wider ${
                              ann.priority === 'high' 
                                ? 'bg-rose-600 text-white' 
                                : ann.priority === 'medium'
                                ? 'bg-amber-500 text-white'
                                : 'bg-emerald-650 text-white'
                            }`}>
                              {ann.priority === 'high' ? 'Penting' : ann.priority === 'medium' ? 'Sedang' : 'Informasi'}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 font-semibold">{ann.date}</span>
                          </div>
                          <h4 className="font-extrabold text-sm text-slate-900 leading-snug">{ann.title}</h4>
                          <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{ann.content}</p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {filteredAnnouncements.length === 0 && (
                    <div className="bg-white rounded-2xl p-12 text-center border border-slate-150 text-gray-400 text-xs font-semibold">
                      Tidak ada pengumuman dengan kriteria filter ini.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-12 text-center border border-emerald-50 text-gray-400 text-xs font-semibold max-w-4xl mx-auto">
                Belum ada pengumuman resmi terbaru saat ini.
              </div>
            )}
          </motion.div>
        </section>
      )}

      {/* FOOTER */}
      <footer className="bg-gradient-to-r from-emerald-900 to-teal-950 text-white py-12 px-4 shadow-inner mt-auto w-full">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-xs font-sans">
          
          <div className="space-y-3">
            <span className="font-sans font-bold text-sm tracking-widest uppercase text-amber-400 block">
              {settings.schoolName}
            </span>
            <p className="text-emerald-150 leading-relaxed font-sans">
              Menghubungkan khidmat kepesantrenan berasaskan nilai-nilai luhur dan tantangan peradaban modern.
            </p>
          </div>

          <div className="space-y-3">
            <span className="font-serif font-semibold text-xs tracking-widest uppercase text-amber-200 block">
              Kontak Kantor Sektretariat
            </span>
            <div className="space-y-2 text-emerald-100 font-sans">
              <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-amber-400 shrink-0" /> {settings.address}</p>
              <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-amber-400" /> {settings.phone}</p>
              <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-amber-400" /> {settings.email}</p>
            </div>
          </div>

          <div className="space-y-3">
            <span className="font-serif font-semibold text-xs tracking-widest uppercase text-amber-200 block">
              Layanan Administrasi
            </span>
            <div className="space-y-2 text-emerald-100 font-sans">
              <p>• Pendaftaran Santri Baru (Online PCSB)</p>
              <p>• Layanan Tagihan Madrasah & Buku</p>
              <p>• Konfirmasi Setoran Syahriyah/SPP</p>
            </div>
          </div>

        </div>
        <div className="border-t border-emerald-800/80 mt-8 pt-4 text-center text-emerald-300 text-[10px]">
          © 2026 {settings.schoolName}. Hak Cipta Dilindungi.
        </div>
      </footer>

      {/* ARTICLE DETAIL DIALOG */}
      <AnimatePresence>
        {selectedArticle && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/70 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white rounded-2xl overflow-hidden max-w-lg w-full shadow-2xl relative border border-emerald-100 flex flex-col max-h-[90vh]"
            >
              <div className="relative h-48 w-full overflow-hidden shrink-0 bg-slate-900">
                <motion.img 
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5 }}
                  src={selectedArticle.image} 
                  alt={selectedArticle.title} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              
              <div className="p-6 overflow-y-auto space-y-4 text-left">
                <span className="text-[9px] font-bold text-white bg-emerald-800 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {selectedArticle.category}
                </span>
                <h4 className="font-bold text-lg text-emerald-950 leading-snug">{selectedArticle.title}</h4>
                <p className="text-gray-400 text-[10px] font-mono">Penulis: {selectedArticle.author} • {selectedArticle.date}</p>
                <p className="text-gray-700 text-xs leading-relaxed max-w-prose whitespace-pre-line">{selectedArticle.content}</p>
              </div>

              <div className="p-4 bg-emerald-50/50 border-t border-emerald-150 flex justify-end shrink-0">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedArticle(null)}
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-lg text-xs cursor-pointer shadow-sm"
                >
                  Tutup Bacaan
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GALLERY PHOTO LIGHTBOX MODAL */}
      <AnimatePresence>
        {selectedGalleryItem && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-55 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md"
            onClick={() => setSelectedGalleryItem(null)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl overflow-hidden max-w-2xl w-full shadow-2xl border border-slate-800 relative flex flex-col max-h-[92vh]"
            >
              <div className="relative aspect-16/10 w-full overflow-hidden bg-slate-950 flex items-center justify-center">
                <img 
                  src={selectedGalleryItem.imageUrl} 
                  alt={selectedGalleryItem.title} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <button
                  type="button"
                  onClick={() => setSelectedGalleryItem(null)}
                  className="absolute top-3 right-3 p-2 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white backdrop-blur-xs transition cursor-pointer"
                  title="Tutup Galeri"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5 sm:p-6 text-left space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wider bg-emerald-800 text-white">
                    {selectedGalleryItem.categoryLabel}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Dokumentasi Resmi Pesantren</span>
                </div>
                <h3 className="font-extrabold text-base sm:text-lg text-slate-900 leading-snug">
                  {selectedGalleryItem.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {selectedGalleryItem.description}
                </p>
              </div>

              <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="font-medium text-[11px] truncate max-w-[200px]">{settings.schoolName || "Pondok Pesantren Al-Asy'ariyah"}</span>
                <button
                  type="button"
                  onClick={() => setSelectedGalleryItem(null)}
                  className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-xs"
                >
                  Tutup Foto
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
