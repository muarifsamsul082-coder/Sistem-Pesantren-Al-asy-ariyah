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
      transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] }
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

        {/* Highlight Stats / Core features panel with animations */}
        <motion.div 
          initial={{ opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: false, amount: 0.2 }}
          transition={{ duration: 1.0, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="lg:col-span-5 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6 space-y-4 shadow-xl"
        >
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
            <span className="text-[10px] text-amber-300 font-bold uppercase tracking-widest">Kenapa Memilih Al-Asy'ariyah?</span>
          </div>
          
          <div className="space-y-4 text-xs font-medium">
            <motion.div 
              whileHover={{ x: 5 }}
              transition={{ duration: 0.2 }}
              className="flex gap-3 p-2 rounded-xl hover:bg-white/5 transition"
            >
              <div className="bg-emerald-850 p-2 rounded-lg text-amber-400 shrink-0 h-10 w-10 flex items-center justify-center shadow-inner">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Ahlussunnah wal Jama'ah</h4>
                <p className="text-emerald-200/80 mt-0.5 leading-relaxed">Penanaman aqidah sahihah, akhlakul karimah, dan pembiasaan ibadah istiqomah.</p>
              </div>
            </motion.div>

            <motion.div 
              whileHover={{ x: 5 }}
              transition={{ duration: 0.2 }}
              className="flex gap-3 p-2 rounded-xl hover:bg-white/5 transition"
            >
              <div className="bg-emerald-850 p-2 rounded-lg text-amber-400 shrink-0 h-10 w-10 flex items-center justify-center shadow-inner">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Kurikulum Integratif</h4>
                <p className="text-emerald-200/80 mt-0.5 leading-relaxed">Dual kurikulum: pendidikan keagamaan terpadu seiring dengan sains modern.</p>
              </div>
            </motion.div>

            <motion.div 
              whileHover={{ x: 5 }}
              transition={{ duration: 0.2 }}
              className="flex gap-3 p-2 rounded-xl hover:bg-white/5 transition"
            >
              <div className="bg-emerald-850 p-2 rounded-lg text-amber-400 shrink-0 h-10 w-10 flex items-center justify-center shadow-inner">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Program Pendidikan Unggulan</h4>
                <p className="text-emerald-200/80 mt-0.5 leading-relaxed">Bimbingan intensif serta pendalaman ilmu agama dan pengetahuan umum demi mencetak lulusan berkarakter unggul.</p>
              </div>
            </motion.div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
