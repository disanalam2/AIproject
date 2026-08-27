import React, { useState, useEffect } from 'react';
import { FileText, Activity, Edit3, Check } from 'lucide-react';
import { motion } from 'framer-motion';

function Section({ title, content, isEditing, onChange }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col">
      <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-sky-500" /> {title}
      </h4>
      {isEditing ? (
        <textarea
          className="bg-white border border-sky-300 p-4 rounded-2xl text-sm text-slate-700 leading-relaxed font-medium flex-grow outline-none focus:ring-2 focus:ring-sky-200 transition-all resize-none min-h-[100px]"
          value={content || ""}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm text-slate-700 leading-relaxed font-medium flex-grow min-h-[100px]">
          {content || <span className="text-slate-400 italic">None</span>}
        </div>
      )}
    </motion.div>
  );
}

export default function SOAPNoteCard({ result, onUpdateSummary }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedSummary, setEditedSummary] = useState({});

  useEffect(() => {
    if (result && result.summary) {
      setEditedSummary(result.summary);
      setIsEditing(false);
    }
  }, [result]);

  if (!result || !result.summary) return null;

  const handleSaveEdit = () => {
    setIsEditing(false);
    if (onUpdateSummary) {
      onUpdateSummary(editedSummary);
    }
  };

  const handleMedicationsChange = (text) => {
    // split by newlines
    const meds = text.split('\n').filter(m => m.trim() !== '');
    setEditedSummary({ ...editedSummary, medications: meds });
  };

  return (
    <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm relative overflow-hidden transition-all">
      {/* Subtle top color bar */}
      <div className={`absolute top-0 left-0 w-full h-1.5 ${isEditing ? 'bg-amber-400' : 'bg-gradient-to-r from-sky-400 to-indigo-500'}`} />
      
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-500" /> Clinical Note
        </h3>
        
        <div className="flex items-center gap-3">
          {isEditing ? (
            <button 
              onClick={handleSaveEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-xs font-bold tracking-wide transition-colors"
            >
              <Check className="w-3.5 h-3.5" /> DONE EDITING
            </button>
          ) : (
            <button 
              onClick={() => setIsEditing(true)}
              disabled={result.summary.error}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 text-sky-600 hover:bg-sky-100 rounded-lg text-xs font-bold tracking-wide transition-colors disabled:opacity-50"
            >
              <Edit3 className="w-3.5 h-3.5" /> EDIT NOTE
            </button>
          )}
          <span className="text-xs font-semibold px-2.5 py-1.5 bg-slate-100 rounded-lg text-slate-600 tracking-wide">SOAP FORMAT</span>
        </div>
      </div>
      
      {!result.summary.error ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Section 
                title="Subjective" 
                content={isEditing ? editedSummary.subjective_complaints : result.summary.subjective_complaints} 
                isEditing={isEditing}
                onChange={(val) => setEditedSummary({...editedSummary, subjective_complaints: val})}
              />
              <Section 
                title="Objective" 
                content={isEditing ? editedSummary.objective_symptoms : result.summary.objective_symptoms} 
                isEditing={isEditing}
                onChange={(val) => setEditedSummary({...editedSummary, objective_symptoms: val})}
              />
          </div>
          
          <div className="h-px w-full bg-slate-100" />
          
          <Section 
            title="Assessment" 
            content={isEditing ? editedSummary.assessment : result.summary.assessment} 
            isEditing={isEditing}
            onChange={(val) => setEditedSummary({...editedSummary, assessment: val})}
          />
          <Section 
            title="Plan & Lifestyle" 
            content={isEditing ? editedSummary.lifestyle_advice : result.summary.lifestyle_advice} 
            isEditing={isEditing}
            onChange={(val) => setEditedSummary({...editedSummary, lifestyle_advice: val})}
          />
          
          <div>
            <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-sky-500" /> Medications
            </h4>
            {isEditing ? (
               <textarea
                  className="bg-white border border-sky-300 p-4 rounded-2xl text-sm text-slate-700 leading-relaxed font-medium w-full outline-none focus:ring-2 focus:ring-sky-200 transition-all resize-none min-h-[100px]"
                  value={(editedSummary.medications || []).join('\n')}
                  onChange={(e) => handleMedicationsChange(e.target.value)}
                  placeholder="Enter one medication per line..."
               />
            ) : (
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl min-h-[100px]">
                <ul className="list-none space-y-2">
                  {result.summary.medications?.length > 0 ? (
                    result.summary.medications.map((m, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700 font-medium">
                        <span className="text-sky-500 mt-0.5">•</span> {m}
                      </li>
                    ))
                  ) : (
                    <li className="text-slate-500 text-sm italic">None prescribed.</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium flex items-center gap-2">
          <Activity className="w-4 h-4" /> Failed to generate structured note. Please try again.
        </div>
      )}
    </div>
  );
}
