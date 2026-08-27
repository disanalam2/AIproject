import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings, Save, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MasterSettings = () => {
    const [config, setConfig] = useState({
        active_telephony: 'chime',
        active_builder: 'lex',
        active_stt: 'transcribe',
        active_llm: 'groq',
        active_nlp: 'comprehend',
        active_tts: 'polly',
        active_calendar: 'workmail'
    });
    
    // Storing secrets securely. In a real app we might not pull them to frontend.
    const [secrets, setSecrets] = useState({});
    
    const [status, setStatus] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchSettings = async () => {
            const token = localStorage.getItem('adminToken');
            if (!token) {
                navigate('/login');
                return;
            }
            try {
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
                const res = await axios.get(`${apiUrl}/api/settings`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (Object.keys(res.data).length > 0) {
                    setConfig(prev => ({ ...prev, ...res.data }));
                }
            } catch (err) {
                if (err.response?.status === 401) navigate('/login');
            }
        };
        fetchSettings();
    }, [navigate]);

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
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
            await axios.post(`${apiUrl}/api/settings`, 
                { config, secrets },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setStatus('Saved Successfully!');
            setTimeout(() => setStatus(''), 3000);
        } catch (err) {
            setStatus('Failed to save settings.');
        }
    };

    const renderCredentialsInput = (layerKey, activeProvider) => {
        const isAws = ['lex', 'transcribe', 'comprehend', 'polly', 'workmail', 'chime', 'bedrock'].includes(activeProvider);
        
        if (isAws) {
            return (
                <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <input type="text" placeholder="AWS_REGION (e.g. us-east-1)" onChange={e => handleSecretChange(`${layerKey.toUpperCase()}_AWS_REGION`, e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }} />
                    <input type="text" placeholder="AWS_ACCESS_KEY_ID" onChange={e => handleSecretChange(`${layerKey.toUpperCase()}_AWS_ACCESS_KEY_ID`, e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }} />
                    <input type="password" placeholder="AWS_SECRET_ACCESS_KEY" onChange={e => handleSecretChange(`${layerKey.toUpperCase()}_AWS_SECRET_ACCESS_KEY`, e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }} />
                </div>
            );
        }
        
        return (
            <input type="password" placeholder={`${activeProvider.toUpperCase()} API Key`} onChange={e => handleSecretChange(`${layerKey.toUpperCase()}_API_KEY`, e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', marginTop: '0.5rem' }} />
        );
    };

    return (
        <div style={{ padding: '2rem' }} className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '1rem', margin: 0 }}>
                    <Settings size={28} /> Master Admin Settings
                </h1>
                <button className="primary" onClick={saveSettings} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {status === 'Saved Successfully!' ? <Check size={18} /> : <Save size={18} />}
                    {status || 'Save Changes'}
                </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
                
                {/* Telephony Layer */}
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginTop: 0, borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Telephony Layer</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                        <label>Active Provider</label>
                        <select value={config.active_telephony} onChange={e => handleConfigChange('active_telephony', e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                            <option value="chime">Amazon Chime SDK</option>
                            <option value="twilio">Twilio Voice</option>
                            <option value="vapi">Vapi.ai</option>
                            <option value="retell">Retell AI</option>
                            <option value="bland">Bland AI</option>
                            <option value="google">Google Voice API</option>
                        </select>
                        {renderCredentialsInput('telephony', config.active_telephony)}
                    </div>
                </div>

                {/* LLM Layer */}
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginTop: 0, borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Cognitive Brain (LLM)</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                        <label>Active Provider</label>
                        <select value={config.active_llm} onChange={e => handleConfigChange('active_llm', e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                            <option value="groq">Groq (Llama 3)</option>
                            <option value="bedrock">AWS Bedrock (Claude)</option>
                            <option value="gemini">Google Gemini</option>
                            <option value="openai">OpenAI (ChatGPT)</option>
                        </select>
                        {renderCredentialsInput('llm', config.active_llm)}
                    </div>
                </div>

                {/* Other Layers (Simplified for demo) */}
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginTop: 0, borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Other Stack Components</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Builder / Orchestrator</label>
                            <select value={config.active_builder} onChange={e => handleConfigChange('active_builder', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                                <option value="lex">Amazon Lex</option>
                                <option value="voiceflow">Voiceflow</option>
                                <option value="twilio_studio">Twilio Studio</option>
                            </select>
                            {renderCredentialsInput('builder', config.active_builder)}
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Speech-to-Text (STT)</label>
                            <select value={config.active_stt} onChange={e => handleConfigChange('active_stt', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                                <option value="transcribe">AWS Transcribe Medical</option>
                                <option value="deepgram">Deepgram Nova-2</option>
                                <option value="google_stt">Google Medical STT</option>
                            </select>
                            {renderCredentialsInput('stt', config.active_stt)}
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>NLP / Extraction</label>
                            <select value={config.active_nlp} onChange={e => handleConfigChange('active_nlp', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                                <option value="comprehend">AWS Comprehend Medical</option>
                                <option value="google_healthcare">Google Healthcare API</option>
                            </select>
                            {renderCredentialsInput('nlp', config.active_nlp)}
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Text-to-Speech (TTS)</label>
                            <select value={config.active_tts} onChange={e => handleConfigChange('active_tts', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                                <option value="polly">AWS Polly Neural</option>
                                <option value="google_tts">Google TTS</option>
                            </select>
                            {renderCredentialsInput('tts', config.active_tts)}
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Calendar / Reminders</label>
                            <select value={config.active_calendar} onChange={e => handleConfigChange('active_calendar', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                                <option value="workmail">Amazon WorkMail</option>
                                <option value="google_cal">Google Calendar API</option>
                                <option value="whatsapp">Meta WhatsApp API</option>
                            </select>
                            {renderCredentialsInput('calendar', config.active_calendar)}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default MasterSettings;
