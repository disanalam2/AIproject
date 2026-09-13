"use client";
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings, Save, Check, Key, Server, Cpu, MessageSquare, Mic, Volume2, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const MasterSettings = () => {
    const [config, setConfig] = useState({
        active_telephony: 'chime',
        active_builder: 'lex',
        active_stt: 'deepgram',
        active_llm: 'groq',
        active_nlp: 'comprehend',
        active_tts: 'polly',
        active_calendar: 'workmail'
    });
    
    const [secrets, setSecrets] = useState({});
    const [status, setStatus] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Settings'); // 'Settings', 'Tenants', 'AI Tester'
    const [tenants, setTenants] = useState([]);
    const router = useRouter();

    useEffect(() => {
        const fetchSettingsAndTenants = async () => {
            const token = localStorage.getItem('adminToken');
            if (!token) {
                router.push('/login');
                return;
            }
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
                const res = await axios.get(`${apiUrl}/api/settings`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (Object.keys(res.data).length > 0) {
                    setConfig(prev => ({ ...prev, ...res.data }));
                }

                const tenantsRes = await axios.get(`${apiUrl}/api/admin/tenants`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setTenants(tenantsRes.data);

            } catch (err) {
                if (err.response?.status === 401) router.push('/login');
            } finally {
                setIsLoading(false);
            }
        };
        fetchSettingsAndTenants();
    }, [router]);

    const handleConfigChange = (key, value) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    const handleSecretChange = (key, value) => {
        setSecrets(prev => ({ ...prev, [key]: value }));
    };

    const saveSettings = async () => {
        setStatus('Saving...');
        const token = localStorage.getItem('adminToken');
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
            await axios.post(`${apiUrl}/api/settings`, 
                { config, secrets },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setStatus('Saved Successfully!');
            setTimeout(() => setStatus(''), 3000);
        } catch (err) {
            setStatus('Failed to save settings.');
            setTimeout(() => setStatus(''), 3000);
        }
    };

    const renderCredentialsInput = (layerKey, activeProvider) => {
        const isAws = ['lex', 'transcribe', 'comprehend', 'polly', 'workmail', 'chime', 'bedrock'].includes(activeProvider);
        
        if (isAws) {
            return (
                <div className="mt-4 space-y-3">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                            <Server size={16} />
                        </div>
                        <input type="text" placeholder="AWS_REGION (e.g. us-east-1)" onChange={e => handleSecretChange(`${layerKey.toUpperCase()}_AWS_REGION`, e.target.value)} className="w-full pl-10 pr-3 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm text-slate-200 placeholder:text-slate-600" />
                    </div>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                            <Key size={16} />
                        </div>
                        <input type="text" placeholder="AWS_ACCESS_KEY_ID" onChange={e => handleSecretChange(`${layerKey.toUpperCase()}_AWS_ACCESS_KEY_ID`, e.target.value)} className="w-full pl-10 pr-3 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm text-slate-200 placeholder:text-slate-600" />
                    </div>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                            <Key size={16} />
                        </div>
                        <input type="password" placeholder="AWS_SECRET_ACCESS_KEY" onChange={e => handleSecretChange(`${layerKey.toUpperCase()}_AWS_SECRET_ACCESS_KEY`, e.target.value)} className="w-full pl-10 pr-3 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm text-slate-200 placeholder:text-slate-600" />
                    </div>
                </div>
            );
        }
        
        return (
            <div className="mt-4 relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Key size={16} />
                </div>
                <input type="password" placeholder={`${activeProvider.toUpperCase()} API Key`} onChange={e => handleSecretChange(`${layerKey.toUpperCase()}_API_KEY`, e.target.value)} className="w-full pl-10 pr-3 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm text-slate-200 placeholder:text-slate-600" />
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-6 md:p-12 relative overflow-hidden">
            {/* Background Effects */}
            <div className="fixed top-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-indigo-600/10 rounded-full blur-[120px] mix-blend-screen pointer-events-none" />
            <div className="fixed bottom-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-blue-600/10 rounded-full blur-[120px] mix-blend-screen pointer-events-none" />

            <div className="max-w-6xl mx-auto relative z-10">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent flex items-center gap-3">
                            <Settings className="text-indigo-400" size={32} />
                            Master Admin Dashboard
                        </h1>
                        <p className="text-slate-400 mt-2">Manage the entire Multi-Tenant Healthcare Platform.</p>
                    </div>

                    <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-700/50">
                        {['Settings', 'Tenants', 'AI Tester'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'Settings' && (
                        <button 
                            onClick={saveSettings} 
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all shadow-lg active:scale-95 ${status.includes('Failed') ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30' : status === 'Saved Successfully!' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-indigo-900/50 border border-transparent'}`}
                        >
                            {status === 'Saving...' ? (
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : status === 'Saved Successfully!' ? (
                                <Check size={18} />
                            ) : (
                                <Save size={18} />
                            )}
                            {status || 'Save Settings'}
                        </button>
                    )}
                </div>

                {activeTab === 'Settings' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Telephony Layer */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="backdrop-blur-xl bg-slate-900/40 border border-slate-700/50 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/50 group-hover:bg-indigo-400 transition-colors" />
                        <h3 className="text-xl font-semibold flex items-center gap-2 mb-6 text-slate-100">
                            <Server className="text-indigo-400" size={20} /> Telephony Layer
                        </h3>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Active Provider</label>
                            <select value={config.active_telephony} onChange={e => handleConfigChange('active_telephony', e.target.value)} className="w-full bg-slate-800/80 border border-slate-700 rounded-lg p-3 text-slate-200 outline-none focus:border-indigo-500 transition-colors appearance-none">
                                <option value="chime">Amazon Chime SDK</option>
                                <option value="twilio">Twilio Voice</option>
                                <option value="vapi">Vapi.ai</option>
                                <option value="retell">Retell AI</option>
                                <option value="bland">Bland AI</option>
                                <option value="plivo">Plivo</option>
                                <option value="google">Google Voice API</option>
                            </select>
                            {renderCredentialsInput('telephony', config.active_telephony)}
                        </div>
                    </motion.div>

                    {/* LLM Layer */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="backdrop-blur-xl bg-slate-900/40 border border-slate-700/50 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-purple-500/50 group-hover:bg-purple-400 transition-colors" />
                        <h3 className="text-xl font-semibold flex items-center gap-2 mb-6 text-slate-100">
                            <Cpu className="text-purple-400" size={20} /> Cognitive Brain (LLM)
                        </h3>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Active Provider</label>
                            <select value={config.active_llm} onChange={e => handleConfigChange('active_llm', e.target.value)} className="w-full bg-slate-800/80 border border-slate-700 rounded-lg p-3 text-slate-200 outline-none focus:border-purple-500 transition-colors appearance-none">
                                <option value="groq">Groq (Llama 3)</option>
                                <option value="bedrock">AWS Bedrock (Claude)</option>
                                <option value="gemini">Google Gemini</option>
                                <option value="openai">OpenAI (ChatGPT)</option>
                                <option value="azure">Azure OpenAI Service</option>
                                <option value="ibm">IBM watsonx.ai</option>
                            </select>
                            {renderCredentialsInput('llm', config.active_llm)}
                        </div>
                    </motion.div>

                    {/* Orchestrator & STT */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="backdrop-blur-xl bg-slate-900/40 border border-slate-700/50 rounded-2xl p-6 shadow-xl relative overflow-hidden group lg:col-span-2">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/50 group-hover:bg-blue-400 transition-colors" />
                        <h3 className="text-xl font-semibold flex items-center gap-2 mb-6 text-slate-100">
                            <Settings className="text-blue-400" size={20} /> Core Modules
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                                    <MessageSquare size={16} /> Builder / Orchestrator
                                </label>
                                <select value={config.active_builder} onChange={e => handleConfigChange('active_builder', e.target.value)} className="w-full bg-slate-800/80 border border-slate-700 rounded-lg p-3 text-slate-200 outline-none focus:border-blue-500 transition-colors appearance-none">
                                    <option value="lex">Amazon Lex</option>
                                    <option value="dialogflow">Google Dialogflow</option>
                                    <option value="voiceflow">Voiceflow</option>
                                    <option value="twilio_studio">Twilio Studio</option>
                                </select>
                                {renderCredentialsInput('builder', config.active_builder)}
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                                    <Mic size={16} /> Speech-to-Text (STT)
                                </label>
                                <select value={config.active_stt} onChange={e => handleConfigChange('active_stt', e.target.value)} className="w-full bg-slate-800/80 border border-slate-700 rounded-lg p-3 text-slate-200 outline-none focus:border-blue-500 transition-colors appearance-none">
                                    <option value="deepgram">Deepgram Nova-2</option>
                                    <option value="groq_whisper">Groq Whisper API</option>
                                    <option value="transcribe">AWS Transcribe Medical</option>
                                    <option value="google_stt">Google Medical STT</option>
                                    <option value="azure_stt">Azure AI Speech</option>
                                    <option value="assemblyai">AssemblyAI Universal-1</option>
                                    <option value="ibm_stt">IBM Watson Speech to Text</option>
                                </select>
                                {renderCredentialsInput('stt', config.active_stt)}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                                    <Volume2 size={16} /> Text-to-Speech (TTS)
                                </label>
                                <select value={config.active_tts} onChange={e => handleConfigChange('active_tts', e.target.value)} className="w-full bg-slate-800/80 border border-slate-700 rounded-lg p-3 text-slate-200 outline-none focus:border-blue-500 transition-colors appearance-none">
                                    <option value="polly">AWS Polly Neural</option>
                                    <option value="google_tts">Google TTS</option>
                                    <option value="azure_tts">Azure AI Neural Voices</option>
                                    <option value="elevenlabs">ElevenLabs API</option>
                                    <option value="ibm_tts">IBM Watson TTS</option>
                                    <option value="openai_tts">OpenAI TTS (HD)</option>
                                </select>
                                {renderCredentialsInput('tts', config.active_tts)}
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                                    <Server size={16} /> NLP / Extraction
                                </label>
                                <select value={config.active_nlp} onChange={e => handleConfigChange('active_nlp', e.target.value)} className="w-full bg-slate-800/80 border border-slate-700 rounded-lg p-3 text-slate-200 outline-none focus:border-blue-500 transition-colors appearance-none">
                                    <option value="comprehend">AWS Comprehend Medical</option>
                                    <option value="google_healthcare">Google Healthcare API</option>
                                    <option value="azure_text_analytics">Azure Text Analytics for Health</option>
                                    <option value="spark_nlp">John Snow Labs (Spark NLP)</option>
                                    <option value="ibm_nlp">IBM Watson NLP</option>
                                </select>
                                {renderCredentialsInput('nlp', config.active_nlp)}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                                    <Calendar size={16} /> Calendar / Reminders
                                </label>
                                <select value={config.active_calendar} onChange={e => handleConfigChange('active_calendar', e.target.value)} className="w-full bg-slate-800/80 border border-slate-700 rounded-lg p-3 text-slate-200 outline-none focus:border-blue-500 transition-colors appearance-none">
                                    <option value="workmail">Amazon WorkMail</option>
                                    <option value="google_cal">Google Calendar API</option>
                                    <option value="whatsapp">Meta WhatsApp API</option>
                                </select>
                                {renderCredentialsInput('calendar', config.active_calendar)}
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'Tenants' && (
                    <div className="backdrop-blur-xl bg-slate-900/40 border border-slate-700/50 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                        <h3 className="text-xl font-semibold flex items-center gap-2 mb-6 text-slate-100">
                            Registered Hospitals / Tenants
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-300">
                                <thead className="bg-slate-800/50 text-slate-400 border-b border-slate-700">
                                    <tr>
                                        <th className="p-4 font-semibold rounded-tl-lg">ID</th>
                                        <th className="p-4 font-semibold">Name</th>
                                        <th className="p-4 font-semibold">Domain</th>
                                        <th className="p-4 font-semibold">Patients</th>
                                        <th className="p-4 font-semibold rounded-tr-lg">Created</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tenants.map(t => (
                                        <tr key={t.id} className="border-b border-slate-700/50 hover:bg-slate-800/30 transition-colors">
                                            <td className="p-4">{t.id}</td>
                                            <td className="p-4 font-medium text-slate-200">{t.name}</td>
                                            <td className="p-4"><span className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-xs border border-slate-700">{t.domain}</span></td>
                                            <td className="p-4">{t.patients?.length || 0}</td>
                                            <td className="p-4">{new Date(t.createdAt).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                    {tenants.length === 0 && (
                                        <tr><td colSpan="5" className="p-8 text-center text-slate-500">No tenants registered yet.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'AI Tester' && (
                    <div className="backdrop-blur-xl bg-slate-900/40 border border-slate-700/50 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                        <h3 className="text-xl font-semibold flex items-center gap-2 mb-6 text-slate-100">
                            <MessageSquare className="text-teal-400" size={20} /> AI Module Tester
                        </h3>
                        <div className="p-8 text-center">
                            <p className="text-slate-400 mb-6">Test the AI modules (e.g., Receptionist AI, Scriber AI) globally across all tenants here.</p>
                            <button 
                                onClick={() => router.push('/chat')}
                                className="bg-teal-500/20 text-teal-400 border border-teal-500/50 hover:bg-teal-500/30 px-6 py-3 rounded-xl transition-all font-medium inline-flex items-center gap-2"
                            >
                                <MessageSquare size={18} /> Launch Receptionist Chat UI
                            </button>
                        </div>
                    </div>
                )}
                
            </div>
        </div>
    );
};

export default MasterSettings;
