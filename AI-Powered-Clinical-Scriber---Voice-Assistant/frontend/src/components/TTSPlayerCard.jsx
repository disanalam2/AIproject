import React from 'react';
import { Play } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TTSPlayerCard({ ttsAudioUrl, audioRef }) {
  if (!ttsAudioUrl) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-200 shadow-sm p-4 rounded-2xl flex items-center justify-between"
    >
      <div className="flex items-center gap-4">
        <div className="bg-sky-50 p-3 rounded-xl border border-sky-100">
          <Play className="w-5 h-5 text-sky-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">AI Audio Briefing</p>
          <p className="text-xs text-slate-500">Summary has been narrated successfully.</p>
        </div>
      </div>
      <button 
        onClick={() => audioRef.current?.play()}
        className="px-4 py-2 bg-sky-50 hover:bg-sky-100 border border-sky-100 rounded-xl text-sm font-semibold text-sky-600 transition-colors"
      >
        Listen Again
      </button>
    </motion.div>
  );
}
