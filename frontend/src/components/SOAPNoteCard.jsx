import React from 'react';
import { FileText, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

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

export default function SOAPNoteCard({ result }) {
  if (!result || !result.summary) return null;

  return (
    <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm relative overflow-hidden">
      {/* Subtle top color bar */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-sky-400 to-indigo-500" />
      
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-500" /> Clinical Note
        </h3>
        <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 rounded-md text-slate-600 tracking-wide">SOAP FORMAT</span>
      </div>
      
      {!result.summary.error ? (
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
  );
}
