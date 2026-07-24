"use client";

import React, { useState, useRef } from "react";
import { AudioRecorder } from "react-audio-voice-recorder";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Activity, CheckCircle2, Save, Play, FileText, User } from "lucide-react";

export default function App() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [ttsAudioUrl, setTtsAudioUrl] = useState(null);
  const [patientId, setPatientId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const audioRef = useRef(null);

  const handleAudio = async (blob) => {
    setIsProcessing(true);
    setResult(null);
    setTtsAudioUrl(null);
    setSaveSuccess(false);

    const formData = new FormData();
    formData.append("audio", blob, "recording.webm");

    try {
      const response = await fetch("/api/scribe", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      
      if (!response.ok) {
        alert(data.error || "Something broke");
        setIsProcessing(false);
        return;
      }

      setResult(data);
      
      // Auto-trigger TTS Generation
      if (data.summary && !data.summary.error) {
        generateTTS(data.summary);
      }

    } catch (err) {
      console.error(err);
      alert("Error contacting API. Check console.");
    } finally {
      setIsProcessing(false);
    }
  };

  const generateTTS = async (summary) => {
    const textToRead = `Here is the summary. Assessment: ${summary.assessment}. Plan: ${summary.lifestyle_advice}.`;
    
    try {
      const ttsResponse = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToRead })
      });
      
      const ttsData = await ttsResponse.json();
      
      if (ttsData.audioBase64) {
        const audioSrc = `data:audio/mp3;base64,${ttsData.audioBase64}`;
        setTtsAudioUrl(audioSrc);
        // Autoplay
        if (audioRef.current) {
          audioRef.current.src = audioSrc;
          audioRef.current.play().catch(e => console.log("Autoplay blocked", e));
        }
      }
    } catch (err) {
      console.error("TTS Error:", err);
    }
  };

  const handleSave = async () => {
    if (!patientId) {
      alert("Please enter a Patient ID");
      return;
    }
    
    setIsSaving(true);
    
    try {
      const response = await fetch("/api/notes/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          transcript: result.transcript,
          summary: result.summary
        })
      });
      
      const data = await response.json();
      if (response.ok) {
        setSaveSuccess(true);
      } else {
        alert("Failed to save: " + data.error);
      }
    } catch (err) {
      alert("Error saving note");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#0f172a] text-white flex flex-col p-4 md:p-8 font-sans selection:bg-indigo-500/30">
      
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-violet-600/20 blur-[120px] pointer-events-none" />

      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-5xl mx-auto flex items-center justify-between mb-12 z-10"
      >
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/20 rounded-xl border border-indigo-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(99,102,241,0.2)]">
            <Activity className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 to-white">
              Scribe AI
            </h1>
            <p className="text-xs text-indigo-200/60 font-medium tracking-wide uppercase">Clinical Assistant</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-4 py-2 rounded-full backdrop-blur-md">
           <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
           <span className="text-sm text-indigo-100/80 font-medium">System Online</span>
        </div>
      </motion.header>

      <main className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 z-10 flex-grow">
        
        {/* Left Column - Recording & Input */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white/5 border border-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl relative overflow-hidden"
          >
            {isProcessing && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 z-20 bg-[#0f172a]/80 backdrop-blur-sm flex flex-col items-center justify-center"
              >
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-2 border-indigo-500/30 border-t-indigo-400 animate-spin" />
                  <Activity className="w-6 h-6 text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <p className="mt-4 text-indigo-200 font-medium tracking-wide animate-pulse">Processing Audio...</p>
              </motion.div>
            )}

            <div className="text-center mb-8">
              <h2 className="text-xl font-semibold text-white mb-2">Capture Session</h2>
              <p className="text-sm text-indigo-200/60">Press the microphone to begin recording the consultation.</p>
            </div>
            
            <div className="flex justify-center my-8">
              <div className="relative group">
                <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full opacity-20 group-hover:opacity-40 blur-lg transition duration-500"></div>
                <div className="relative bg-[#0f172a] border border-white/10 p-2 rounded-full transform hover:scale-105 transition-transform duration-300">
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

          {/* Patient Info Card (Only shows if result exists) */}
          <AnimatePresence>
            {result && !isProcessing && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 border border-white/10 backdrop-blur-xl p-6 rounded-3xl shadow-2xl"
              >
                <h3 className="text-sm font-medium text-indigo-200/80 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <User className="w-4 h-4" /> Patient Assignment
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-indigo-200/60 ml-1 mb-1 block">Patient ID</label>
                    <input 
                      type="text" 
                      value={patientId}
                      onChange={(e) => setPatientId(e.target.value)}
                      placeholder="e.g. 1042"
                      className="w-full bg-[#0f172a]/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-indigo-200/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    />
                  </div>
                  
                  <button
                    onClick={handleSave}
                    disabled={isSaving || saveSuccess}
                    className={`w-full py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                      saveSuccess 
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                        : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)]"
                    }`}
                  >
                    {saveSuccess ? (
                      <><CheckCircle2 className="w-5 h-5" /> Saved to Database</>
                    ) : isSaving ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <><Save className="w-5 h-5" /> Approve & Save Note</>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* Right Column - Results */}
        <div className="lg:col-span-7">
          <AnimatePresence mode="wait">
            {!result ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center p-12 text-center bg-white/5 backdrop-blur-sm"
              >
                <FileText className="w-12 h-12 text-indigo-200/20 mb-4" />
                <h3 className="text-xl font-medium text-indigo-200/40 mb-2">No Active Session</h3>
                <p className="text-sm text-indigo-200/30 max-w-md">
                  Record a consultation to generate an AI-powered SOAP note and automated transcript.
                </p>
              </motion.div>
            ) : (
              <motion.div 
                key="results"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                {/* TTS Player Card */}
                {ttsAudioUrl && (
                   <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-indigo-900/40 border border-indigo-500/30 p-4 rounded-2xl flex items-center justify-between backdrop-blur-md"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-500/20 p-2 rounded-lg">
                        <Play className="w-5 h-5 text-indigo-300" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-indigo-100">AI Audio Summary generated</p>
                        <p className="text-xs text-indigo-300/70">Ready for review</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => audioRef.current?.play()}
                      className="px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/50 rounded-xl text-sm font-medium text-indigo-200 transition-colors"
                    >
                      Replay
                    </button>
                  </motion.div>
                )}

                {/* SOAP Note Card */}
                <div className="bg-white/5 border border-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl">
                  <h3 className="text-lg font-semibold text-white mb-6 pb-4 border-b border-white/10 flex items-center justify-between">
                    Structured Clinical Note
                    <span className="text-xs font-normal px-2 py-1 bg-white/10 rounded-md text-indigo-200">SOAP Format</span>
                  </h3>
                  
                  {result.summary && !result.summary.error ? (
                    <div className="space-y-6">
                      <Section title="Subjective" content={result.summary.subjective_complaints} />
                      <Section title="Objective" content={result.summary.objective_symptoms} />
                      <Section title="Assessment" content={result.summary.assessment} />
                      <Section title="Plan & Lifestyle" content={result.summary.lifestyle_advice} />
                      
                      <div>
                        <h4 className="text-sm font-medium text-indigo-300 mb-2 uppercase tracking-wide">Medications</h4>
                        <div className="bg-[#0f172a]/50 border border-white/5 p-4 rounded-xl">
                          <ul className="list-disc pl-5 text-sm text-indigo-100/90 space-y-1">
                            {result.summary.medications?.length > 0 ? (
                              result.summary.medications.map((m, i) => <li key={i}>{m}</li>)
                            ) : (
                              <li className="text-indigo-200/50 list-none -ml-5">None prescribed.</li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                      Failed to generate structured note from AI.
                    </div>
                  )}
                </div>

                {/* Raw Transcript */}
                <div className="bg-white/5 border border-white/10 backdrop-blur-xl p-6 rounded-3xl">
                  <h3 className="text-sm font-medium text-indigo-300 mb-4 uppercase tracking-wide flex items-center justify-between">
                    Raw Transcript
                    <button className="text-xs text-indigo-200/50 hover:text-indigo-200 underline">Edit</button>
                  </h3>
                  <div className="h-32 overflow-y-auto pr-2 custom-scrollbar">
                    <p className="text-sm text-indigo-100/70 leading-relaxed font-mono">
                      {result.transcript || "No transcript returned."}
                    </p>
                  </div>
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </main>
    </div>
  );
}

// Helper component for SOAP sections
function Section({ title, content }) {
  if (!content) return null;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h4 className="text-sm font-medium text-indigo-300 mb-2 uppercase tracking-wide">{title}</h4>
      <div className="bg-[#0f172a]/50 border border-white/5 p-4 rounded-xl text-sm text-indigo-100/90 leading-relaxed">
        {content}
      </div>
    </motion.div>
  );
}
