import React from 'react';
import { motion } from 'motion/react';
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.18,
        delayChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 28 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] as const }
    }
  };

  return (
    <div className="relative bg-gradient-to-br from-emerald-900 via-teal-950 to-emerald-950 text-white overflow-hidden py-16 px-4 sm:px-6 lg:px-8 shadow-inner">
      {/* Decorative animated background orbs */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.15, 0.25, 0.15],
          x: [0, 20, 0],
          y: [0, -20, 0]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-0 right-0 w-96 h-96 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" 
      />
      <motion.div 
        animate={{ 
          scale: [1.2, 1, 1.2],
          opacity: [0.2, 0.1, 0.2],
          x: [0, -25, 0],
          y: [0, 25, 0]
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" 
      />

      <div className="max-w-7xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Texts with animated entrance */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.2 }}
          className="lg:col-span-7 space-y-6 text-center lg:text-left"
        >
          {ppdbStatus.isActive && (
            <motion.div 
              variants={itemVariants}
              whileHover={{ scale: 1.03 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-400 text-emerald-950 rounded-xl text-xs sm:text-sm font-extrabold tracking-wide shadow-md uppercase cursor-default"
            >
              <Sparkles className="h-4 w-4 shrink-0 text-emerald-950 animate-pulse" />
              <span>{ppdbStatus.unifiedNoticeText}</span>
            </motion.div>
          )}

          <motion.h1 
            variants={itemVariants}
            className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight"
          >
            Selamat Datang di <br />
            <motion.span 
              initial={{ backgroundPosition: '0% 50%' }}
              animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
              className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-100 to-amber-400 bg-[length:200%_auto] inline-block"
            >
              {schoolName}
            </motion.span>
          </motion.h1>

          <motion.p 
            variants={itemVariants}
            className="text-emerald-100 text-sm sm:text-md leading-relaxed font-medium max-w-2xl mx-auto lg:mx-0"
          >
            {tagline}
          </motion.p>

          <motion.div 
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start pt-2"
          >
            {ppdbStatus.isActive ? (
              <motion.button
                whileHover={{ scale: 1.04, boxShadow: "0 10px 25px -5px rgba(251, 191, 36, 0.4)" }}
                whileTap={{ scale: 0.96 }}
                onClick={onJoinPCSB}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-amber-400 hover:bg-amber-300 text-emerald-950 rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer"
              >
                <span>Pendaftaran Calon Santri Baru (PCSB)</span>
                <ArrowRight className="h-4 w-4" />
              </motion.button>
            ) : (
              <button
                disabled
                className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-800/90 border border-slate-700 text-slate-400 rounded-xl font-bold text-sm cursor-not-allowed opacity-90 select-none shadow-sm"
              >
                <span>🚫</span> {ppdbStatus.badgeText}
              </button>
            )}
            <motion.div 
              whileHover={{ scale: 1.02, backgroundColor: "rgba(6, 78, 59, 0.7)" }}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-800/40 border border-emerald-600/40 rounded-xl font-semibold text-sm cursor-default transition"
            >
              <GraduationCap className="h-4 w-4 text-amber-400" /> Kurikulum Salaf & Modern
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Visual Pesantren Photography & Highlights */}
        <motion.div 
          initial={{ opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: false, amount: 0.2 }}
          transition={{ duration: 1.0, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="lg:col-span-5 relative"
        >
          {/* Main Photo Showcase Card */}
          <div className="relative rounded-3xl overflow-hidden shadow-2xl border-2 border-emerald-400/30 group bg-emerald-950/60 backdrop-blur-md">
            {/* Pesantren Architecture & Learning Atmosphere Photo */}
            <div className="relative h-64 sm:h-72 w-full overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=1200&q=80" 
                alt="Pondok Pesantren Al-Asy'ariyah" 
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 brightness-90 contrast-105"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/40 to-transparent" />
              
              {/* Floating Top Badge */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 bg-emerald-950/80 backdrop-blur-md border border-emerald-500/40 rounded-full text-[11px] font-extrabold text-amber-300 shadow-md">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                <span>Pusat Pendidikan Salaf & Modern</span>
              </div>

              {/* Floating Bottom Metric Badge */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between p-2.5 bg-emerald-900/80 backdrop-blur-md border border-emerald-400/30 rounded-2xl text-xs text-white shadow-lg">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-amber-400 text-emerald-950 flex items-center justify-center font-black shrink-0 shadow-sm">
                    <Award className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-black text-amber-200 uppercase tracking-wider">Ahlussunnah wal Jama'ah</div>
                    <div className="text-[10px] text-emerald-100 font-medium">Bimbingan Intensif Kitab & Tahfidz</div>
                  </div>
                </div>
                <div className="text-right pl-2 border-l border-emerald-700/60 shrink-0">
                  <div className="text-xs font-black text-amber-300 font-mono">1000+</div>
                  <div className="text-[9px] text-emerald-200">Santri Aktif</div>
                </div>
              </div>
            </div>

            {/* Feature Highlights beneath image */}
            <div className="p-4 sm:p-5 space-y-3 bg-gradient-to-b from-emerald-950/90 to-teal-950 text-xs font-medium">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition">
                  <Shield className="h-4 w-4 text-amber-400 shrink-0" />
                  <span className="text-[11px] font-bold text-white leading-tight">Aqidah & Akhlakul Karimah</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition">
                  <GraduationCap className="h-4 w-4 text-emerald-300 shrink-0" />
                  <span className="text-[11px] font-bold text-white leading-tight">Kurikulum Berjenjang</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
