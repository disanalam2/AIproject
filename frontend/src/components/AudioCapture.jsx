"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Activity, Stethoscope, Mic, Square, Pause, Play, ChevronDown, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePurify } from 'purify-voice/react';

// --- IDB Helpers for Audio Backup ---
const DB_NAME = "ClinicalScriberDB";
const STORE_NAME = "audioBackup";

const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const saveChunkToDB = async (blob) => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).add(blob);
  } catch (e) {
    console.error("IDB save error", e);
  }
};

const getSavedChunks = async () => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result);
    });
  } catch (e) {
    return [];
  }
};

const clearSavedChunks = async () => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
  } catch (e) {
    console.error("IDB clear error", e);
  }
};

export default function AudioCapture({ isProcessing, handleAudio, audioRef }) {
  const { isReady, processStream } = usePurify();
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [volume, setVolume] = useState(0);
  const [hasBackup, setHasBackup] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const rafRef = useRef(null);
  const isRecordingRef = useRef(false);
  
  const chunksRef = useRef([]); 
  const silenceStartRef = useRef(null); 

  const SILENCE_THRESHOLD = 5; 
  const SILENCE_DURATION_TO_PAUSE = 10000; // 10 seconds

  // Fetch devices & check backup
  useEffect(() => {
    const getDevices = async () => {
      try {
        const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true }); 
        const devs = await navigator.mediaDevices.enumerateDevices();
        const audioDevs = devs.filter(d => d.kind === 'audioinput');
        
        // Release the temporary stream so the mic doesn't stay "on"
        tempStream.getTracks().forEach(track => track.stop());

        // Remove duplicates if the OS lists the same mic twice (e.g. 'Default' and 'Internal')
        const uniqueDevs = Array.from(new Map(audioDevs.map(item => [item.label || item.deviceId, item])).values());
        
        setDevices(uniqueDevs);
        
        setDevices((prev) => {
          // If we haven't selected one yet, pick the first
          if (uniqueDevs.length > 0) {
            setSelectedDeviceId(prevId => prevId ? prevId : uniqueDevs[0].deviceId);
          }
          return uniqueDevs;
        });

      } catch (err) {
        console.error("Error fetching devices", err);
      }
    };
    
    getDevices();
    
    // Auto-detect if user plugs in a USB/External mic while page is open
    navigator.mediaDevices.addEventListener('devicechange', getDevices);

    getSavedChunks().then(chunks => {
      if (chunks && chunks.length > 0) {
        setHasBackup(true);
      }
    });

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', getDevices);
      cleanup();
    };
  }, []);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const cleanup = () => {
    isRecordingRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    clearInterval(timerRef.current);
    cancelAnimationFrame(rafRef.current);
  };

  const startRecording = async () => {
    try {
      chunksRef.current = [];
      await clearSavedChunks();
      setHasBackup(false);

      const constraints = {
        audio: {
          deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
          noiseSuppression: true,
          echoCancellation: true,
          autoGainControl: true,
          channelCount: 1
        }
      };

      const rawStream = await navigator.mediaDevices.getUserMedia(constraints);
      let stream = rawStream;

      if (isReady && processStream) {
        try {
          const denoisedStream = await processStream(rawStream);
          if (denoisedStream) {
            stream = denoisedStream;
          }
        } catch (err) {
          console.error("Purify processStream error, falling back to raw stream:", err);
        }
      }

      streamRef.current = stream;

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
          saveChunkToDB(e.data); // Save chunk to IndexedDB
        }
      };

      mediaRecorder.start(1000); 
      
      setIsRecording(true);
      isRecordingRef.current = true;
      setIsPaused(false);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      monitorAudio();

    } catch (err) {
      console.error("Start recording error", err);
      alert("Microphone access denied or error occurred.");
    }
  };

  const monitorAudio = () => {
    if (!analyserRef.current) return;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const update = () => {
      if (!isRecordingRef.current) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length;
      setVolume(avg);

      if (mediaRecorderRef.current) {
        if (mediaRecorderRef.current.state === 'recording') {
          if (avg < SILENCE_THRESHOLD) {
            if (!silenceStartRef.current) silenceStartRef.current = Date.now();
            else if (Date.now() - silenceStartRef.current > SILENCE_DURATION_TO_PAUSE) {
              pauseRecording();
            }
          } else {
            silenceStartRef.current = null;
          }
        } else if (mediaRecorderRef.current.state === 'paused') {
           if (avg > SILENCE_THRESHOLD + 10) {
             resumeRecording();
           }
        }
      }

      rafRef.current = requestAnimationFrame(update);
    };
    update();
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      clearInterval(timerRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      silenceStartRef.current = null;
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = async () => {
        const mimeType = mediaRecorderRef.current.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        await clearSavedChunks();
        setHasBackup(false);
        handleAudio(blob);
      };
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    isRecordingRef.current = false;
    setIsPaused(false);
    cleanup();
  };

  const recoverBackup = async () => {
    const chunks = await getSavedChunks();
    if (chunks.length > 0) {
      const blob = new Blob(chunks);
      await clearSavedChunks();
      setHasBackup(false);
      handleAudio(blob);
    }
  };

  const discardBackup = async () => {
    await clearSavedChunks();
    setHasBackup(false);
  };

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

      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-sky-50 text-sky-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Stethoscope className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-semibold text-slate-800 mb-2">Capture Session</h2>
        <p className="text-sm text-slate-500">Record the consultation to generate an automated clinical note.</p>
      </div>

      {hasBackup && !isRecording && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-amber-800 font-medium">Unsaved recording found!</p>
          <div className="flex gap-2">
            <button onClick={discardBackup} className="px-3 py-1.5 text-xs font-semibold text-amber-600 bg-amber-100 hover:bg-amber-200 rounded-lg transition">Discard</button>
            <button onClick={recoverBackup} className="px-3 py-1.5 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition flex items-center gap-1">
              <RotateCcw className="w-3 h-3" /> Recover
            </button>
          </div>
        </div>
      )}
      
      {!isRecording && (
        <div className="mb-6 max-w-xs mx-auto relative z-10">
          <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1">Microphone</label>
          <div className="relative">
            <select 
              className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all cursor-pointer"
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
            >
              {devices.length === 0 && <option>Default Microphone</option>}
              {devices.map(d => (
                <option key={d.deviceId} value={d.deviceId}>{d.label || `Microphone ${d.deviceId.slice(0,5)}...`}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      )}

      <div className="flex flex-col items-center justify-center my-4">
        
        {/* Visualizer & Timer */}
        <AnimatePresence>
          {isRecording && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full flex flex-col items-center mb-8 overflow-hidden"
            >
              <div className="text-3xl font-mono font-light text-slate-700 mb-6">
                {formatTime(recordingTime)}
              </div>
              
              <div className="flex items-center justify-center gap-1 h-16 w-full max-w-xs">
                {[...Array(24)].map((_, i) => {
                  // Generate a fake waveform effect driven by the volume
                  const multiplier = Math.sin((i / 24) * Math.PI); 
                  const height = isPaused ? 4 : Math.max(4, Math.min(60, volume * multiplier * 0.8));
                  return (
                    <motion.div
                      key={i}
                      className={`w-1.5 rounded-full ${isPaused ? 'bg-amber-300' : 'bg-sky-400'}`}
                      animate={{ height: `${height}px` }}
                      transition={{ type: "tween", duration: 0.1 }}
                    />
                  )
                })}
              </div>
              {isPaused && (
                 <motion.p 
                   initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                   className="text-xs text-amber-500 font-medium mt-4 animate-pulse"
                 >
                   Auto-paused due to silence
                 </motion.p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 z-10">
          {!isRecording ? (
            <div className="relative group">
              <div className="absolute -inset-4 bg-sky-200 rounded-full opacity-0 group-hover:opacity-40 blur-lg transition duration-500"></div>
              <button 
                onClick={startRecording}
                className="relative bg-sky-500 hover:bg-sky-600 text-white p-4 rounded-full shadow-lg shadow-sky-500/30 transform hover:scale-105 transition-all duration-300 flex items-center justify-center h-16 w-16"
              >
                <Mic className="w-7 h-7" />
              </button>
            </div>
          ) : (
            <>
              {isPaused ? (
                <button 
                  onClick={resumeRecording}
                  className="bg-amber-100 hover:bg-amber-200 text-amber-600 p-3 rounded-full transition-colors flex items-center justify-center h-12 w-12"
                  title="Resume Recording"
                >
                  <Play className="w-5 h-5 fill-current ml-1" />
                </button>
              ) : (
                <button 
                  onClick={pauseRecording}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-3 rounded-full transition-colors flex items-center justify-center h-12 w-12"
                  title="Pause Recording"
                >
                  <Pause className="w-5 h-5 fill-current" />
                </button>
              )}
              
              <button 
                onClick={stopRecording}
                className="bg-rose-500 hover:bg-rose-600 text-white p-4 rounded-full shadow-lg shadow-rose-500/30 transform hover:scale-105 transition-all duration-300 flex items-center justify-center h-16 w-16"
                title="Stop & Save"
              >
                <Square className="w-6 h-6 fill-current" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Hidden audio player for TTS */}
      <audio ref={audioRef} className="hidden" />
      
    </motion.div>
  );
}
