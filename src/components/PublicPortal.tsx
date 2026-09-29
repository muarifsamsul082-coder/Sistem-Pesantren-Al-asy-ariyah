import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, Landmark, Calendar, Phone, Mail, MapPin, Newspaper, Bell, 
  HelpCircle, ArrowUpRight, GraduationCap, ArrowRight, UserSquare, Sparkles,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { News, Announcement, PortalSettings } from '../types';
import AcademicCalendar from './AcademicCalendar';
import { isPpdbCurrentlyActive } from '../lib/dateUtils';

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
    <div className={`flex flex-col min-h-full ${className}`}>
      {/* Content wrapper with spacing */}
      <div className="space-y-12 pb-12 flex-grow">
        {/* 1. PROFIL SECTION */}
      {(currentView === 'home' || currentView === 'profile') && (
        <section id="profile" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch w-full">
          
          {/* Left Card: Visi Misi */}
          <motion.div 
            initial={{ opacity: 0, y: 35 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.15 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-7 bg-emerald-900/40 backdrop-blur-md rounded-2xl shadow-xl border border-emerald-700/50 p-6 sm:p-8 space-y-6 text-white"
          >
            <div>
              <span className="inline-block px-3 py-1 bg-amber-400 text-emerald-950 rounded-full text-[10px] uppercase font-bold font-mono tracking-widest shadow-xs">
                Identitas Khidmat
              </span>
              <h2 className="text-2xl font-black text-white mt-2.5 font-sans tracking-wide">
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
              className="p-4 bg-emerald-950/60 rounded-xl border-l-4 border-amber-400 text-xs text-emerald-100 leading-relaxed font-medium transition shadow-inner"
            >
              <span className="font-extrabold uppercase text-[10px] text-amber-300 block tracking-widest mb-1 font-sans">Visi Pesantren:</span>
              "{settings.vision}"
            </motion.div>

            <div className="space-y-3">
              <span className="font-extrabold uppercase text-[10px] text-amber-300 block tracking-widest">Misi Pesantren:</span>
              <ul className="space-y-2 text-xs text-emerald-100/90 leading-relaxed list-disc pl-4 font-sans">
                {settings.mission.map((m, idx) => (
                  <motion.li 
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: false }}
                    transition={{ duration: 0.6, delay: 0.12 * idx }}
                    className="hover:text-amber-200 transition-all font-sans"
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
            className="lg:col-span-5 bg-emerald-900/40 backdrop-blur-md rounded-2xl shadow-xl border border-emerald-700/50 p-6 sm:p-8 flex flex-col justify-between space-y-6 text-white"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <motion.div 
                  whileHover={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 0.5 }}
                  className="inline-flex p-3 bg-emerald-850 text-amber-300 border border-emerald-600/60 rounded-xl shadow-xs"
                >
                  <Landmark className="h-6 w-6 text-amber-300" />
                </motion.div>
                <span className="text-[10px] uppercase font-bold text-emerald-950 font-mono tracking-widest bg-amber-400 px-3 py-1 rounded-full shadow-xs">
                  Sekilas Info
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-black text-white font-sans">Sekilas Tentang Kami</h3>
                <motion.div 
                  initial={{ width: 0 }}
                  whileInView={{ width: 48 }}
                  viewport={{ once: false }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="border-b-2 border-amber-400 mt-2 mb-3" 
                />
                <p className="text-emerald-100/90 text-xs sm:text-sm leading-relaxed font-sans font-medium whitespace-pre-line">
                  {settings.aboutUs}
                </p>
              </div>
            </div>

            {(ppdbStatus.isActive || session) && (
              <div className="pt-4 border-t border-emerald-700/40 flex flex-wrap gap-2">
                {ppdbStatus.isActive && (
                  <motion.button 
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setView('ppdb')} 
                    className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 font-extrabold text-emerald-950 rounded-xl text-xs tracking-wide shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    Daftar Santri Baru <ArrowRight className="h-3.5 w-3.5" />
                  </motion.button>
                )}
                {session && (
                  <motion.button 
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setView(session.role === 'admin' ? 'admin-dashboard' : 'santri-dashboard')}
                    className="px-4 py-2.5 bg-emerald-800/80 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold border border-emerald-600/50 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
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
            <div className="text-center space-y-2">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-400 text-emerald-950 font-mono font-black text-xs uppercase tracking-widest rounded-full shadow-lg border border-amber-300">
                <Newspaper className="h-4 w-4 text-emerald-950" /> Kabar Pesantren
              </span>
              <h3 className="text-2xl md:text-3xl font-black text-white font-sans tracking-tight pt-1 drop-shadow-md">
                Berita & Kegiatan Terbaru
              </h3>
              <p className="text-xs text-amber-200/90 font-medium max-w-md mx-auto">
                Kabar terkini seputar aktivitas pendidikan, kajian kitab, dan agenda santri
              </p>
              <div className="w-16 h-1 bg-amber-400 mx-auto mt-2 rounded-full shadow-sm" />
            </div>

            {news.length > 0 ? (
              <div className="space-y-8">
                {/* Carousel with AnimatePresence image & text transitions */}
                <div className="relative overflow-hidden bg-emerald-900/40 backdrop-blur-md rounded-3xl border border-emerald-700/50 shadow-xl max-w-5xl mx-auto text-white">
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
                      <span className="absolute top-4 left-4 bg-amber-400 text-emerald-950 font-black text-[9px] uppercase px-3 py-1 rounded-full tracking-wider shadow-sm z-10">
                        {news[currentSlide].category}
                      </span>
                    </div>

                    {/* Animated Text Container */}
                    <div className="p-8 md:p-12 flex-1 flex flex-col justify-between space-y-4 text-left bg-gradient-to-br from-emerald-950/70 to-emerald-900/40">
                      <AnimatePresence mode="wait">
                        <motion.div 
                          key={`info-${currentSlide}-${news[currentSlide]?.id}`}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -15 }}
                          transition={{ duration: 0.55, ease: "easeOut" }}
                          className="space-y-3"
                        >
                          <div className="text-[10px] text-amber-300 font-mono font-bold tracking-wider">{news[currentSlide].date}</div>
                          <h4 className="text-white text-xl md:text-2xl font-black font-sans leading-tight">
                            {news[currentSlide].title}
                          </h4>
                          <p className="text-emerald-100/90 font-sans text-xs md:text-sm leading-relaxed line-clamp-3 md:line-clamp-4">
                            {news[currentSlide].excerpt}
                          </p>
                        </motion.div>
                      </AnimatePresence>

                      <div className="flex items-center justify-between pt-6 border-t border-emerald-700/40">
                        <motion.button
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => setSelectedArticle(news[currentSlide])}
                          className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-emerald-950 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm hover:shadow cursor-pointer"
                        >
                          Baca Selengkapnya
                          <ArrowUpRight className="h-4 w-4" />
                        </motion.button>

                        <div className="flex items-center gap-1.5">
                          <motion.button 
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={handlePrevSlide}
                            className="p-2 rounded-full border border-emerald-700/60 bg-emerald-950/70 hover:bg-emerald-800 text-amber-300 transition shadow-sm cursor-pointer"
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
                    <h4 className="text-sm font-bold text-amber-200 uppercase tracking-wider mb-4">Arsip Berita & Kegiatan</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {news.map((item, idx) => (
                        <motion.div 
                          key={item.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: idx * 0.08 }}
                          whileHover={{ y: -6, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)" }}
                          className="bg-emerald-900/40 backdrop-blur-md rounded-2xl border border-emerald-700/50 overflow-hidden shadow-lg flex flex-col justify-between transition-all text-white"
                        >
                          <div>
                            <div className="relative h-44 w-full bg-slate-900 overflow-hidden">
                              <img src={item.image} alt={item.title} className="w-full h-full object-cover hover:scale-105 transition duration-500" referrerPolicy="no-referrer" />
                              <span className="absolute top-2.5 left-2.5 bg-amber-400 text-emerald-950 text-[8px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider shadow-xs">
                                {item.category}
                              </span>
                            </div>
                            <div className="p-4 space-y-2 text-left">
                              <span className="text-[9px] font-mono font-semibold text-emerald-300">{item.date}</span>
                              <h5 className="font-extrabold text-sm text-white leading-snug line-clamp-2 hover:text-amber-300 transition-colors cursor-pointer" onClick={() => setSelectedArticle(item)}>
                                {item.title}
                              </h5>
                              <p className="text-emerald-150/90 text-xs leading-relaxed line-clamp-3 font-sans">
                                {item.excerpt}
                              </p>
                            </div>
                          </div>
                          <div className="p-4 pt-0">
                            <button 
                              onClick={() => setSelectedArticle(item)}
                              className="w-full py-1.5 bg-emerald-800/60 hover:bg-emerald-700 text-amber-200 hover:text-white border border-emerald-600/50 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
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
              <div className="bg-emerald-900/30 backdrop-blur-md rounded-2xl p-12 text-center border border-emerald-700/50 text-emerald-200 text-xs font-semibold max-w-5xl mx-auto">
                Belum ada berita atau kegiatan terbaru.
              </div>
            )}
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
            <div className="text-center space-y-2">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-400 text-emerald-950 font-mono font-black text-xs uppercase tracking-widest rounded-full shadow-lg border border-amber-300">
                <Bell className="h-4 w-4 text-emerald-950" /> Informasi Penting
              </span>
              <h3 className="text-2xl md:text-3xl font-black text-white font-sans tracking-tight pt-1 drop-shadow-md">
                Pengumuman & Maklumat Resmi
              </h3>
              <p className="text-xs text-amber-200/90 font-medium max-w-md mx-auto">
                Pemberitahuan resmi dari Pengasuh dan Pengurus Pondok Pesantren
              </p>
              <div className="w-16 h-1 bg-amber-400 mx-auto mt-2 rounded-full shadow-sm" />
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
                            ? 'bg-amber-400 text-emerald-950 shadow-xs font-black' 
                            : 'bg-emerald-950/70 border border-emerald-700/60 text-emerald-100 hover:bg-emerald-900/60'
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
                        className={`p-5 rounded-2xl border bg-emerald-900/35 backdrop-blur-md shadow-xs transition-all flex gap-4 items-start text-white ${
                          ann.priority === 'high' 
                            ? 'border-rose-400/50 bg-rose-950/30' 
                            : ann.priority === 'medium'
                            ? 'border-amber-400/50 bg-amber-950/30'
                            : 'border-emerald-700/50 bg-emerald-950/40'
                        }`}
                      >
                        <div className={`p-2.5 rounded-xl shrink-0 ${
                          ann.priority === 'high' 
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' 
                            : ann.priority === 'medium'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}>
                          <Bell className="h-5 w-5" />
                        </div>
                        <div className="space-y-1.5 flex-1 min-w-0 text-left">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-full tracking-wider ${
                              ann.priority === 'high' 
                                ? 'bg-rose-600 text-white' 
                                : ann.priority === 'medium'
                                ? 'bg-amber-500 text-emerald-950 font-black' 
                                : 'bg-emerald-600 text-white'
                            }`}>
                              {ann.priority === 'high' ? 'Penting' : ann.priority === 'medium' ? 'Sedang' : 'Informasi'}
                            </span>
                            <span className="text-[10px] font-mono text-emerald-200/70 font-semibold">{ann.date}</span>
                          </div>
                          <h4 className="font-extrabold text-sm text-white leading-snug">{ann.title}</h4>
                          <p className="text-xs text-emerald-100/90 leading-relaxed whitespace-pre-line">{ann.content}</p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {filteredAnnouncements.length === 0 && (
                    <div className="bg-emerald-950/60 rounded-2xl p-12 text-center border border-emerald-800 text-emerald-300/60 text-xs font-semibold">
                      Tidak ada pengumuman dengan kriteria filter ini.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-emerald-950/60 rounded-2xl p-12 text-center border border-emerald-800 text-emerald-300/60 text-xs font-semibold max-w-4xl mx-auto">
                Belum ada pengumuman resmi terbaru saat ini.
              </div>
            )}
          </motion.div>
        </section>
      )}
      </div>

      {/* FOOTER */}
      <footer className="bg-gradient-to-r from-emerald-900 via-teal-950 to-emerald-950 text-white pt-10 pb-6 px-4 shadow-inner mt-auto w-full">
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
        <div className="border-t border-emerald-800/80 mt-8 pt-4 text-center text-emerald-300 text-[10px] pb-1">
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

    </div>
  );
}
