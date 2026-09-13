import React from 'react';
import { Sparkles, Calendar, Award, Shield, ArrowRight, GraduationCap } from 'lucide-react';
import { isPpdbCurrentlyActive } from '../lib/dateUtils';

interface HeroProps {
  onJoinPCSB: () => void;
  schoolName: string;
  tagline: string;
  ppdbOpen?: boolean;
  ppdbStartDate?: string;
  ppdbEndDate?: string;
}

export default function Hero({ onJoinPCSB, schoolName, tagline, ppdbOpen, ppdbStartDate, ppdbEndDate }: HeroProps) {
  const ppdbStatus = isPpdbCurrentlyActive({ ppdbOpen, ppdbStartDate, ppdbEndDate });

  return (
    <div className="relative bg-gradient-to-br from-emerald-900 via-teal-950 to-emerald-950 text-white overflow-hidden py-16 px-4 sm:px-6 lg:px-8 shadow-inner">
      {/* Decorative vectors */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Texts */}
        <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
          {ppdbStatus.isActive && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-400 text-emerald-950 rounded-xl text-xs sm:text-sm font-extrabold tracking-wide shadow-md uppercase">
              <Sparkles className="h-4 w-4 shrink-0 text-emerald-950 animate-pulse" />
              <span>{ppdbStatus.unifiedNoticeText}</span>
            </div>
          )}

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            Selamat Datang di <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-200 to-amber-300">
              {schoolName}
            </span>
          </h1>

          <p className="text-emerald-100 text-sm sm:text-md leading-relaxed font-medium max-w-2xl mx-auto lg:mx-0">
            {tagline}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
            {ppdbStatus.isActive ? (
              <button
                onClick={onJoinPCSB}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-amber-400 hover:bg-amber-300 text-emerald-950 rounded-xl font-bold text-sm shadow-md transition-all active:scale-95 cursor-pointer"
              >
                Pendaftaran Calon Santri Baru (PCSB)
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                disabled
                className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-800/90 border border-slate-700 text-slate-400 rounded-xl font-bold text-sm cursor-not-allowed opacity-90 select-none shadow-sm"
              >
                <span>🚫</span> {ppdbStatus.badgeText}
              </button>
            )}
            <div className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-800/40 border border-emerald-600/40 hover:bg-emerald-800/80 rounded-xl font-semibold text-sm cursor-pointer transition">
              <GraduationCap className="h-4 w-4 text-amber-400" /> Kurikulum Salaf & Modern
            </div>
          </div>
        </div>

        {/* Highlight Stats / Core features panel */}
        <div className="lg:col-span-5 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6 space-y-4">
          <span className="text-[10px] text-amber-300 font-bold uppercase tracking-widest">Kenapa Memilih Al-Asy'ariyah?</span>
          
          <div className="space-y-4 text-xs font-medium">
            <div className="flex gap-3">
              <div className="bg-emerald-850 p-2 rounded-lg text-amber-400 shrink-0 h-10 w-10 flex items-center justify-center">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Ahlussunnah wal Jama'ah</h4>
                <p className="text-emerald-200/80 mt-0.5">Penanaman aqidah sahihah, akhlakul karimah, dan pembiasaan ibadah istiqomah.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="bg-emerald-850 p-2 rounded-lg text-amber-400 shrink-0 h-10 w-10 flex items-center justify-center">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Kurikulum Integratif</h4>
                <p className="text-emerald-200/80 mt-0.5">Dual kurikulum: pendidikan keagamaan terpadu seiring dengan sains modern.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="bg-emerald-850 p-2 rounded-lg text-amber-400 shrink-0 h-10 w-10 flex items-center justify-center">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Program Pendidikan Unggulan</h4>
                <p className="text-emerald-200/80 mt-0.5">Bimbingan intensif serta pendalaman ilmu agama dan pengetahuan umum demi mencetak lulusan berkarakter unggul.</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
