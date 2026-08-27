import React, { useState } from 'react';
import { PhoneCall, Mic, MicOff, PhoneOff, Send } from 'lucide-react';
import '../index.css';

const WebDialer = () => {
    const [isCalling, setIsCalling] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [status, setStatus] = useState("Ready to Call AI Receptionist");
    
    // Text Simulator State
    const [chatInput, setChatInput] = useState("");
    const [chatHistory, setChatHistory] = useState([]);
    const [isSending, setIsSending] = useState(false);

    // This is a UI stub for Amazon Chime SDK.
    const handleCall = async () => {
        setIsCalling(true);
        setStatus("Connecting to Amazon Chime SIP / Lex Webhook...");
        setChatHistory([{ role: 'ai', content: "Hello! I am the City Care AI Receptionist. How can I help you today?" }]);
        
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
            const response = await fetch(`${apiUrl}/api/chime/meeting`, { method: 'POST' });
            await response.json();
            
            setStatus("Connected! Speak or use the Text Simulator below.");
        } catch (error) {
            console.error("Failed to initialize Chime meeting", error);
            setStatus("Connected (Mock). Speak or use the Text Simulator below.");
        }
    };

    const handleEndCall = () => {
        setIsCalling(false);
        setStatus("Call ended.");
        setChatHistory([]);
        setTimeout(() => setStatus("Ready to Call AI Receptionist"), 3000);
    };

    const toggleMute = () => {
        setIsMuted(!isMuted);
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!chatInput.trim()) return;

        const userMsg = chatInput;
        setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
        setChatInput("");
        setIsSending(true);

        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
            const response = await fetch(`${apiUrl}/api/lex-webhook`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    inputTranscript: userMsg,
                    sessionState: { intent: { name: "DemoIntent" } }
                })
            });
            const data = await response.json();
            const aiMsg = data.messages?.[0]?.content || "No response received.";
            setChatHistory(prev => [...prev, { role: 'ai', content: aiMsg }]);
        } catch (error) {
            console.error("Chat error:", error);
            setChatHistory(prev => [...prev, { role: 'ai', content: "Error connecting to AI backend." }]);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--background)' }} className="animate-fade-in">
            <div className="glass-panel" style={{ width: '450px', padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column' }}>
                <div style={{
                    width: '80px', height: '80px', borderRadius: '50%', background: isCalling ? 'var(--success)' : 'var(--border)',
                    margin: '0 auto 1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: 'background 0.3s'
                }}>
                    <PhoneCall size={32} color={isCalling ? 'white' : 'var(--text-secondary)'} />
                </div>
                
                <h2 style={{ margin: '0 0 0.5rem 0' }}>City Care Support</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>{status}</p>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: isCalling ? '2rem' : '0' }}>
                    {!isCalling ? (
                        <button className="primary" onClick={handleCall} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', justifyContent: 'center', padding: '12px' }}>
                            <PhoneCall size={18} /> Start Call / Text Simulator
                        </button>
                    ) : (
                        <>
                            <button onClick={toggleMute} style={{ background: isMuted ? 'var(--danger)' : 'var(--border)', color: isMuted ? 'white' : 'var(--text-primary)', padding: '12px 20px' }}>
                                {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                            </button>
                            <button className="danger" onClick={handleEndCall} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, justifyContent: 'center' }}>
                                <PhoneOff size={18} /> End Call
                            </button>
                        </>
                    )}
                </div>

                {/* Text Simulator UI */}
                {isCalling && (
                    <div style={{ textAlign: 'left', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                        <h4 style={{ margin: '0 0 1rem 0', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            Demo Text Simulator
                        </h4>
                        
                        <div style={{ height: '250px', overflowY: 'auto', background: 'var(--background)', borderRadius: '8px', padding: '1rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            {chatHistory.map((msg, idx) => (
                                <div key={idx} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', background: msg.role === 'user' ? 'var(--primary)' : 'var(--surface)', color: msg.role === 'user' ? 'white' : 'var(--text-primary)', padding: '10px 14px', borderRadius: '12px', border: msg.role === 'ai' ? '1px solid var(--border)' : 'none', maxWidth: '85%', fontSize: '0.9rem' }}>
                                    {msg.content}
                                </div>
                            ))}
                            {isSending && (
                                <div style={{ alignSelf: 'flex-start', color: 'var(--text-secondary)', fontSize: '0.8rem', fontStyle: 'italic' }}>AI is typing...</div>
                            )}
                        </div>

                        <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem' }}>
                            <input 
                                type="text" 
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder="Type to interact with the backend..." 
                                style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }}
                                disabled={isSending}
                            />
                            <button type="submit" className="primary" disabled={isSending || !chatInput.trim()} style={{ padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Send size={18} />
                            </button>
                        </form>
                    </div>
                )}

                <p style={{ marginTop: '2rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    *Powered by Amazon Chime SDK & LangChain LLM
                </p>
            </div>
        </div>
    );
};

export default WebDialer;
