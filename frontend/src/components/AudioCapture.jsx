import React from 'react';
import { Activity, Stethoscope } from 'lucide-react';
import { motion } from 'framer-motion';
import { AudioRecorder } from 'react-audio-voice-recorder';

export default function AudioCapture({ isProcessing, handleAudio, audioRef }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.1 }}
      className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm relative overflow-hidden"
    >
      {isProcessing && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 z-20 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center"
        >
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-sky-100 border-t-sky-500 animate-spin" />
            <Activity className="w-6 h-6 text-sky-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="mt-4 text-slate-700 font-medium tracking-wide animate-pulse">Analyzing Consultation...</p>
        </motion.div>
      )}

      <div className="text-center mb-8">
        <div className="w-12 h-12 bg-sky-50 text-sky-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Stethoscope className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-semibold text-slate-800 mb-2">Capture Session</h2>
        <p className="text-sm text-slate-500">Record the consultation to generate an automated clinical note.</p>
      </div>
      
      <div className="flex justify-center my-8">
        <div className="relative group">
          <div className="absolute -inset-4 bg-sky-200 rounded-full opacity-0 group-hover:opacity-40 blur-lg transition duration-500"></div>
          <div className="relative bg-white border border-slate-200 p-2 rounded-full shadow-sm transform hover:scale-105 transition-transform duration-300">
            <AudioRecorder
              onRecordingComplete={handleAudio}
              audioTrackConstraints={{ noiseSuppression: true, echoCancellation: true }}
              downloadOnSavePress={false}
              classes={{
                AudioRecorderClass: "scribe-recorder",
              }}
            />
          </div>
        </div>
      </div>

      {/* Hidden audio player for TTS */}
      <audio ref={audioRef} className="hidden" />
      
    </motion.div>
  );
}
