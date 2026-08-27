"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HeartPulse, ClipboardList } from "lucide-react";
import AudioCapture from "@/components/AudioCapture";
import PatientAssignment from "@/components/PatientAssignment";
import TTSPlayerCard from "@/components/TTSPlayerCard";
import SOAPNoteCard from "@/components/SOAPNoteCard";

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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await fetch(`${apiUrl}/api/scribe`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      
      if (!response.ok) {
        alert(data.error || "Something broke. Click OK to download your recording manually as a backup.");
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = `recording-backup-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
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
      alert("Error contacting API. We are downloading your recording as a backup.");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `recording-backup-error-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsProcessing(false);
    }
  };

  const generateTTS = async (summary) => {
    const textToRead = `Here is the summary. Assessment: ${summary.assessment}. Plan: ${summary.lifestyle_advice}.`;
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const ttsResponse = await fetch(`${apiUrl}/api/tts`, {
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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await fetch(`${apiUrl}/api/notes/save`, {
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

  const handleUpdateSummary = (newSummary) => {
    setResult({ ...result, summary: newSummary });
  };

  const handleDiscard = () => {
    setResult(null);
    setTtsAudioUrl(null);
    setPatientId("");
    setSaveSuccess(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
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
          <AudioCapture 
            isProcessing={isProcessing} 
            handleAudio={handleAudio} 
            audioRef={audioRef} 
          />

          <PatientAssignment 
            result={result}
            isProcessing={isProcessing}
            patientId={patientId}
            setPatientId={setPatientId}
            handleSave={handleSave}
            handleDiscard={handleDiscard}
            isSaving={isSaving}
            saveSuccess={saveSuccess}
          />
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
                <TTSPlayerCard ttsAudioUrl={ttsAudioUrl} audioRef={audioRef} />
                <SOAPNoteCard result={result} onUpdateSummary={handleUpdateSummary} />

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
