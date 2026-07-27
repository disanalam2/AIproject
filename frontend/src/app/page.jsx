"use client";

import React, { useState, useRef } from "react";
import { AudioRecorder } from "react-audio-voice-recorder";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Activity, CheckCircle2, Save, Play, FileText, User, HeartPulse, Stethoscope, ClipboardList } from "lucide-react";

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
    <div className="min-h-screen text-slate-800 flex flex-col p-4 md:p-8 font-sans selection:bg-sky-200">
      
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-sky-50 to-transparent -z-10" />

      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-6xl mx-auto flex items-center justify-between mb-12 z-10"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center relative overflow-hidden group">
             <div className="absolute inset-0 bg-sky-50 opacity-0 group-hover:opacity-100 transition-opacity" />
            <HeartPulse className="w-7 h-7 text-sky-500 relative z-10" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              Clinical<span className="text-sky-500">Scriber</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium tracking-wide uppercase mt-0.5">AI Medical Assistant</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 bg-white border border-slate-200 shadow-sm px-4 py-2 rounded-full">
           <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
           <span className="text-sm text-slate-600 font-medium">System Online</span>
        </div>
      </motion.header>

      <main className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 z-10 flex-grow">
        
        {/* Left Column - Recording & Input */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
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

          {/* Patient Info Card (Only shows if result exists) */}
          <AnimatePresence>
            {result && !isProcessing && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm"
              >
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <User className="w-4 h-4 text-sky-500" /> Patient Assignment
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-slate-500 ml-1 mb-1 block">Patient ID</label>
                    <input 
                      type="text" 
                      value={patientId}
                      onChange={(e) => setPatientId(e.target.value)}
                      placeholder="e.g. PT-1042"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all"
                    />
                  </div>
                  
                  <button
                    onClick={handleSave}
                    disabled={isSaving || saveSuccess}
                    className={`w-full py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                      saveSuccess 
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-200" 
                        : "bg-sky-500 hover:bg-sky-600 text-white shadow-md shadow-sky-500/20"
                    }`}
                  >
                    {saveSuccess ? (
                      <><CheckCircle2 className="w-5 h-5" /> Saved to EHR</>
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
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {!result ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full min-h-[500px] border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center p-12 text-center bg-white/50 backdrop-blur-sm"
              >
                <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 border border-slate-100 shadow-sm">
                   <ClipboardList className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-xl font-semibold text-slate-600 mb-2">No Active Session</h3>
                <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
                  Start a recording on the left. The AI will automatically generate a structured SOAP note and a full transcript.
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
                )}

                {/* SOAP Note Card */}
                <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm relative overflow-hidden">
                  {/* Subtle top color bar */}
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-sky-400 to-indigo-500" />
                  
                  <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                       <FileText className="w-5 h-5 text-sky-500" /> Clinical Note
                    </h3>
                    <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 rounded-md text-slate-600 tracking-wide">SOAP FORMAT</span>
                  </div>
                  
                  {result.summary && !result.summary.error ? (
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <Section title="Subjective" content={result.summary.subjective_complaints} />
                         <Section title="Objective" content={result.summary.objective_symptoms} />
                      </div>
                      
                      <div className="h-px w-full bg-slate-100" />
                      
                      <Section title="Assessment" content={result.summary.assessment} />
                      <Section title="Plan & Lifestyle" content={result.summary.lifestyle_advice} />
                      
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-sky-500" /> Medications
                        </h4>
                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                          <ul className="list-none space-y-2">
                            {result.summary.medications?.length > 0 ? (
                              result.summary.medications.map((m, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-slate-700 font-medium">
                                  <span className="text-sky-500 mt-0.5">•</span> {m}
                                </li>
                              ))
                            ) : (
                              <li className="text-slate-500 text-sm">None prescribed.</li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium flex items-center gap-2">
                      <Activity className="w-4 h-4" /> Failed to generate structured note. Please try again.
                    </div>
                  )}
                </div>

                {/* Raw Transcript */}
                <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
                  <h3 className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-wider flex items-center justify-between">
                    Raw Transcript
                    <button className="text-xs text-sky-500 font-semibold hover:text-sky-600">Copy text</button>
                  </h3>
                  <div className="h-32 overflow-y-auto pr-2 custom-scrollbar">
                    <p className="text-sm text-slate-600 leading-relaxed font-mono">
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col">
      <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-sky-500" /> {title}
      </h4>
      <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm text-slate-700 leading-relaxed font-medium flex-grow">
        {content}
      </div>
    </motion.div>
  );
}
