import React from 'react';
import { User, CheckCircle2, Save, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PatientAssignment({ 
  result, 
  isProcessing, 
  patientId, 
  setPatientId, 
  handleSave, 
  handleDiscard,
  isSaving, 
  saveSuccess 
}) {
  return (
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
            
            <div className="flex flex-col gap-2">
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
              
              {!saveSuccess && (
                <button
                  onClick={handleDiscard}
                  disabled={isSaving}
                  className="w-full py-2.5 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 text-slate-500 hover:text-red-500 hover:bg-red-50 transition-all"
                >
                  <Trash2 className="w-4 h-4" /> Discard
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
