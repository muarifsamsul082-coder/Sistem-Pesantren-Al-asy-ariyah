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
    <div className={`space-y-12 pb-16 flex flex-col ${className}`}>
      
      {/* 1. PROFIL SECTION */}
      {(currentView === 'home' || currentView === 'profile') && (
        <section id="profile" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch w-full">
          
          {/* Left Card: Visi Misi */}
          <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-emerald-50 p-6 sm:p-8 space-y-6">
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-800 font-mono tracking-widest block">Identitas Khidmat</span>
              <h2 className="text-2xl font-black text-emerald-950 mt-1 font-sans">
                Visi & Misi {settings.schoolName}
              </h2>
              <div className="border-b-2 border-amber-400 w-16 mt-2" />
            </div>

            <div className="p-4 bg-emerald-50 rounded-xl border-l-4 border-emerald-800 text-xs text-emerald-900 leading-relaxed font-medium">
              <span className="font-extrabold uppercase text-[10px] text-emerald-950 block tracking-widest mb-1 font-sans">Visi Pesantren:</span>
              "{settings.vision}"
            </div>

            <div className="space-y-3">
              <span className="font-extrabold uppercase text-[10px] text-emerald-950 block tracking-widest">Misi Pesantren:</span>
              <ul className="space-y-2 text-xs text-gray-600 leading-relaxed list-disc pl-4 font-sans">
                {settings.mission.map((m, idx) => (
                  <li key={idx} className="hover:text-emerald-950 transition-all font-sans">{m}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right Card: Sekilas Sejarah & Info */}
          <div className="lg:col-span-5 bg-gradient-to-br from-emerald-850 to-teal-900 text-white rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-md">
            <div className="space-y-3">
              <div className="inline-flex p-3 bg-amber-400 text-emerald-950 rounded-xl">
                <Landmark className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold font-sans">Sekilas Tentang Kami</h3>
              <p className="text-emerald-100 text-xs leading-relaxed font-sans font-medium">
                {settings.aboutUs}
              </p>
            </div>

            <div className="pt-4 border-t border-emerald-700/50 flex flex-wrap gap-2">
              {ppdbStatus.isActive ? (
                <button 
                  onClick={() => setView('ppdb')} 
                  className="px-4 py-2 bg-amber-400 font-bold hover:bg-amber-300 text-emerald-950 rounded-lg text-xs tracking-wide shadow flex items-center gap-1 cursor-pointer"
                >
                  Daftar Santri Baru <ArrowRight className="h-3 w-3" />
                </button>
              ) : (
                <div className="px-3 py-1.5 bg-emerald-950/60 border border-emerald-700/60 text-emerald-200/90 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                  <span>🚫</span> Pendaftaran Ditutup
                </div>
              )}
              {session && (
                <button 
                  onClick={() => setView(session.role === 'admin' ? 'admin-dashboard' : 'santri-dashboard')}
                  className="px-4 py-2 bg-amber-500 font-bold text-emerald-950 rounded-lg text-xs hover:bg-amber-400 shadow flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  Kembali ke Dashboard Anda ➡️
                </button>
              )}
            </div>
          </div>
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
          <div className="space-y-6">
            <div className="text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-800 font-mono tracking-widest block">Kabar Pesantren</span>
              <h3 className="text-xl md:text-2xl font-black text-emerald-950 font-sans">Berita & Kegiatan Terbaru</h3>
              <div className="border-b-2 border-amber-400 w-12 mx-auto mt-1" />
            </div>

            {news.length > 0 ? (
              <div className="space-y-8">
                {/* Carousel */}
                <div className="relative overflow-hidden bg-white rounded-3xl border border-emerald-100 shadow-lg animate-fade-in max-w-5xl mx-auto">
                  <div className="relative min-h-[360px] md:min-h-[300px] flex flex-col md:flex-row items-stretch">
                    <div className="relative w-full md:w-1/2 h-64 md:h-auto overflow-hidden shrink-0">
                      <img 
                        src={news[currentSlide].image} 
                        alt={news[currentSlide].title} 
                        className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" 
                        referrerPolicy="no-referrer"
                        key={`img-${currentSlide}`}
                      />
                      <span className="absolute top-4 left-4 bg-emerald-800 text-white font-extrabold text-[9px] uppercase px-3 py-1 rounded-full tracking-wider shadow-sm z-10">
                        {news[currentSlide].category}
                      </span>
                    </div>

                    <div className="p-8 md:p-12 flex-1 flex flex-col justify-between space-y-4 text-left bg-gradient-to-br from-white to-emerald-50/10">
                      <div className="space-y-3 animate-fade-in" key={`info-${currentSlide}`}>
                        <div className="text-[10px] text-emerald-800 font-mono font-bold tracking-wider">{news[currentSlide].date}</div>
                        <h4 className="text-emerald-950 text-xl md:text-2xl font-black font-sans leading-tight">
                          {news[currentSlide].title}
                        </h4>
                        <p className="text-gray-500 font-sans text-xs md:text-sm leading-relaxed line-clamp-3 md:line-clamp-4">
                          {news[currentSlide].excerpt}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                        <button
                          onClick={() => setSelectedArticle(news[currentSlide])}
                          className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm hover:shadow cursor-pointer"
                        >
                          Baca Selengkapnya
                          <ArrowUpRight className="h-4 w-4" />
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button 
                            onClick={handlePrevSlide}
                            className="p-2 rounded-full border border-gray-200 bg-white hover:bg-emerald-50 text-emerald-800 transition shadow-sm cursor-pointer"
                            title="Sebelumnya"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={handleNextSlide}
                            className="p-2 rounded-full border border-gray-200 bg-white hover:bg-emerald-50 text-emerald-800 transition shadow-sm cursor-pointer"
                            title="Selanjutnya"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
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
                      {news.map((item) => (
                        <div key={item.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs hover:shadow transition-all flex flex-col justify-between">
                          <div>
                            <div className="relative h-44 w-full bg-slate-100">
                              <img src={item.image} alt={item.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              <span className="absolute top-2.5 left-2.5 bg-emerald-800 text-white text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-full tracking-wider">
                                {item.category}
                              </span>
                            </div>
                            <div className="p-4 space-y-2">
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
                        </div>
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
          </div>
        </section>
      )}

      {/* 4. ANNOUNCEMENTS SECTION (Fully implemented for announcements tab) */}
      {(currentView === 'home' || currentView === 'announcements') && (
        <section id="announcements" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="space-y-6">
            <div className="text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-800 font-mono tracking-widest block">Informasi Resmi</span>
              <h3 className="text-xl md:text-2xl font-black text-emerald-950 font-sans">Pengumuman & Maklumat</h3>
              <div className="border-b-2 border-amber-400 w-12 mx-auto mt-1" />
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

                {/* Announcement cards */}
                <div className="space-y-3.5">
                  {filteredAnnouncements.map((ann) => (
                    <div 
                      key={ann.id} 
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
                    </div>
                  ))}

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
          </div>
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
      {selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl overflow-hidden max-w-lg w-full shadow-2xl relative border border-emerald-100 flex flex-col max-h-[90vh]">
            <img 
              src={selectedArticle.image} 
              alt={selectedArticle.title} 
              className="w-full h-44 object-cover shrink-0"
              referrerPolicy="no-referrer"
            />
            
            <div className="p-6 overflow-y-auto space-y-4">
              <span className="text-[9px] font-bold text-white bg-emerald-800 px-2 py-0.5 rounded-full uppercase tracking-wider">
                {selectedArticle.category}
              </span>
              <h4 className="font-bold text-lg text-emerald-950 leading-snug">{selectedArticle.title}</h4>
              <p className="text-gray-400 text-[10px] font-mono">Penulis: {selectedArticle.author} • {selectedArticle.date}</p>
              <p className="text-gray-700 text-xs leading-relaxed max-w-prose whitespace-pre-line">{selectedArticle.content}</p>
            </div>

            <div className="p-4 bg-emerald-50/50 border-t border-emerald-150 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedArticle(null)}
                className="px-5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-lg text-xs cursor-pointer"
              >
                Tutup Bacaan
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
