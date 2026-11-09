import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  X,
  Sparkles,
  Send,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  RotateCcw,
  Mic,
  MicOff,
  Globe,
  Plus,
  ThumbsUp,
  ThumbsDown,
  Trash2,
  Database,
  ArrowRight,
  Volume2,
  VolumeX,
  Square,
  Radio,
  SlidersHorizontal,
  AlertCircle,
  HelpCircle,
  Tag
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  sendAIChatMessage,
  sendAIFeedback,
  AIChatResponsePayload
} from '@/lib/forecastStore';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  voiceText?: string;
  timestamp: string;
  language?: string;
  feedback?: 'like' | 'dislike';
  feedbackReason?: string;
  intent?: string;
  toolsUsed?: string[];
  suggestedActions?: Array<{id: string; label: string; query: string; isAction?: boolean}>;
}

export type SupportedLanguage =
  | 'auto'
  | 'en'
  | 'mr'
  | 'hi'
  | 'kn'
  | 'ta'
  | 'te'
  | 'ml'
  | 'bn'
  | 'gu'
  | 'pa'
  | 'or'
  | 'ur';

const LANGUAGE_LABELS: Record<SupportedLanguage, { label: string; bcp47: string; voiceLang: string }> = {
  auto: { label: '🌐 Auto Detect', bcp47: 'en-IN', voiceLang: 'en' },
  en: { label: 'English', bcp47: 'en-IN', voiceLang: 'en' },
  mr: { label: 'मराठी (Marathi)', bcp47: 'mr-IN', voiceLang: 'mr' },
  hi: { label: 'हिन्दी (Hindi)', bcp47: 'hi-IN', voiceLang: 'hi' },
  kn: { label: 'ಕನ್ನಡ (Kannada)', bcp47: 'kn-IN', voiceLang: 'kn' },
  ta: { label: 'தமிழ் (Tamil)', bcp47: 'ta-IN', voiceLang: 'ta' },
  te: { label: 'తెలుగు (Telugu)', bcp47: 'te-IN', voiceLang: 'te' },
  ml: { label: 'മലയാളം (Malayalam)', bcp47: 'ml-IN', voiceLang: 'ml' },
  bn: { label: 'বাংলা (Bengali)', bcp47: 'bn-IN', voiceLang: 'bn' },
  gu: { label: 'ગુજરાતી (Gujarati)', bcp47: 'gu-IN', voiceLang: 'gu' },
  pa: { label: 'ਪੰਜਾਬੀ (Punjabi)', bcp47: 'pa-IN', voiceLang: 'pa' },
  or: { label: 'ଓଡ଼ିଆ (Odia)', bcp47: 'or-IN', voiceLang: 'or' },
  ur: { label: 'اردو (Urdu)', bcp47: 'ur-IN', voiceLang: 'ur' }
};

const STARTER_SUGGESTIONS = [
  { icon: '💰', text: 'How much revenue will we generate next month?' },
  { icon: '📦', text: 'Which product is going to run out of stock first?' },
  { icon: '⚡', text: 'What if product demand increases by 20%?' },
  { icon: '🏆', text: 'Top 5 products by projected revenue' },
  { icon: '📈', text: 'Which products should I worry about right now?' },
  { icon: '🔬', text: 'Explain XGBoost and LSTM hybrid architecture' }
];

type VoiceStatus = 'idle' | 'listening' | 'transcribing' | 'thinking' | 'speaking' | 'error';

export function GenAIAssistant() {
  const { session } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('auto');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Voice State Management
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [voiceDiagnosticMsg, setVoiceDiagnosticMsg] = useState<string | null>(null);
  const [voiceResponsesEnabled, setVoiceResponsesEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('sv_voice_responses_enabled') !== 'false';
  });
  const [speechRate, setSpeechRate] = useState<number>(() => {
    if (typeof window === 'undefined') return 1.0;
    const r = localStorage.getItem('sv_speech_rate');
    return r ? parseFloat(r) : 1.0;
  });
  const [handsFree, setHandsFree] = useState(false);

  // Feedback Modal State
  const [feedbackActiveMsgId, setFeedbackActiveMsgId] = useState<string | null>(null);
  const [feedbackReason, setFeedbackReason] = useState<string>('wrong_answer');

  // Multi-turn context
  const [conversationContext, setConversationContext] = useState<AIChatResponsePayload['context']>({
    currentProduct: null,
    horizonDays: 30,
    scenario: { demandMultiplier: 1.0 }
  });

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Check Secure Context for Microphone / Web Speech API
  const isSecureContextActive = () => {
    if (typeof window === 'undefined') return true;
    if (window.isSecureContext) return true;
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1';
  };

  // Scroll to bottom on updates
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, loading, interimTranscript]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Stop TTS speech helper
  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      if (voiceStatus === 'speaking') {
        setVoiceStatus('idle');
      }
    }
  };

  // Text-To-Speech (TTS) Execution
  const speakResponse = (textToSpeak: string, langCode: SupportedLanguage) => {
    if (!voiceResponsesEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    stopSpeaking();

    try {
      const cleanText = textToSpeak
        .replace(/[*_#`$|]/g, '')
        .replace(/https?:\/\/\S+/g, '')
        .replace(/\n+/g, '. ')
        .trim();

      if (!cleanText) return;

      const utterance = new SpeechSynthesisUtterance(cleanText);
      const bcp47 = LANGUAGE_LABELS[langCode]?.bcp47 || 'en-IN';
      utterance.lang = bcp47;
      utterance.rate = speechRate;

      // Select voice matching language if available
      const voices = window.speechSynthesis.getVoices();
      const matchedVoice = voices.find(v => v.lang === bcp47 || v.lang.startsWith(bcp47.split('-')[0]));
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      utterance.onstart = () => {
        setVoiceStatus('speaking');
        console.log('[VOICE] TTS speaking started:', bcp47);
      };
      utterance.onend = () => {
        console.log('[VOICE] TTS speaking finished');
        setVoiceStatus('idle');
        // Hands-free mode: resume listening after AI finishes speaking
        if (handsFree) {
          setTimeout(() => startSpeechRecognition(), 400);
        }
      };
      utterance.onerror = (e) => {
        console.warn('[VOICE] TTS error:', e);
        setVoiceStatus('idle');
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('[TTS Error]:', err);
      setVoiceStatus('idle');
    }
  };

  // Robust Speech Recognition (STT) setup
  const startSpeechRecognition = async () => {
    if (typeof window === 'undefined') return;
    setVoiceDiagnosticMsg(null);

    // 1. Secure context check
    if (!isSecureContextActive()) {
      const host = window.location.host;
      const diag = `Voice input requires a secure browser context (HTTPS or localhost). When accessing over local network IP (http://${host}), browsers block microphone access. Please access via http://localhost:8080 or enable HTTPS.`;
      console.warn('[VOICE] Insecure Context Diagnostic:', diag);
      setVoiceDiagnosticMsg(diag);
      setVoiceStatus('error');
      return;
    }

    // 2. Web Speech API availability check
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      const msg = 'Speech Recognition is not supported in this browser. Please use Google Chrome, Microsoft Edge, or typed input.';
      console.warn('[VOICE] SpeechRecognition unavailable:', msg);
      setVoiceDiagnosticMsg(msg);
      setVoiceStatus('error');
      return;
    }

    // 3. Microphone hardware / permission pre-flight check
    if (navigator?.mediaDevices?.getUserMedia) {
      try {
        console.log('[VOICE] Requesting microphone access...');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Release tracks after verification
        stream.getTracks().forEach(track => track.stop());
        console.log('[VOICE] Microphone permission granted');
      } catch (mediaErr: any) {
        console.warn('[VOICE] getUserMedia error:', mediaErr);
        if (mediaErr.name === 'NotAllowedError' || mediaErr.name === 'PermissionDeniedError') {
          setVoiceDiagnosticMsg('Microphone access is blocked. Please allow microphone permissions for SV Forecast AI in your browser settings.');
        } else if (mediaErr.name === 'NotFoundError' || mediaErr.name === 'DevicesNotFoundError') {
          setVoiceDiagnosticMsg('No microphone audio input device was found on your system.');
        } else {
          setVoiceDiagnosticMsg(`Microphone error: ${mediaErr.message || 'Unable to access audio input'}`);
        }
        setVoiceStatus('error');
        return;
      }
    }

    stopSpeaking();

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      const bcp47 = LANGUAGE_LABELS[selectedLanguage]?.bcp47 || 'en-IN';
      recognition.lang = bcp47;
      console.log('[VOICE] Starting recognition with locale:', bcp47);

      recognition.onstart = () => {
        console.log('[VOICE] Recognition started — listening');
        setVoiceStatus('listening');
        setInterimTranscript('');
      };

      recognition.onresult = (event: any) => {
        let finalTrans = '';
        let interimTrans = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTrans += event.results[i][0].transcript;
          } else {
            interimTrans += event.results[i][0].transcript;
          }
        }

        if (interimTrans) {
          setInterimTranscript(interimTrans);
        }

        if (finalTrans.trim()) {
          console.log('[VOICE] Final transcript received:', finalTrans);
          setInterimTranscript('');
          setVoiceStatus('thinking');
          handleSendMessage(finalTrans.trim());
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('[VOICE] Recognition error event:', event.error);
        if (event.error === 'not-allowed') {
          setVoiceDiagnosticMsg('Microphone permission was denied. Please allow microphone access in your browser bar.');
        } else if (event.error === 'no-speech') {
          // Soft timeout without error banner
          console.log('[VOICE] No speech detected');
        } else if (event.error === 'network') {
          setVoiceDiagnosticMsg('Network error occurred during speech-to-text processing.');
        }
        setVoiceStatus('idle');
        setInterimTranscript('');
      };

      recognition.onend = () => {
        console.log('[VOICE] Recognition ended');
        if (voiceStatus === 'listening') {
          setVoiceStatus('idle');
        }
        setInterimTranscript('');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.warn('[VOICE] Recognition start exception:', err);
      setVoiceDiagnosticMsg(`Could not start voice recognition: ${err.message || 'Unknown error'}`);
      setVoiceStatus('idle');
    }
  };

  const toggleSpeechRecognition = () => {
    if (voiceStatus === 'listening') {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setVoiceStatus('idle');
      setInterimTranscript('');
    } else {
      startSpeechRecognition();
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    // Interrupt active speech when new query is submitted
    stopSpeaking();

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setVoiceStatus('thinking');

    try {
      const payloadMessages = newMessages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await sendAIChatMessage(
        {
          messages: payloadMessages,
          conversationContext,
          language: selectedLanguage
        },
        session?.token
      );

      const assistantMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: res.text,
        voiceText: res.voiceText || res.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        language: res.language,
        intent: res.intent,
        toolsUsed: res.toolsUsed,
        suggestedActions: res.suggestedActions || []
      };

      setMessages((prev) => [...prev, assistantMessage]);
      if (res.context) {
        setConversationContext(res.context);
      }

      // Speak response aloud
      const langForTTS = (selectedLanguage !== 'auto' ? selectedLanguage : (res.language as SupportedLanguage)) || 'en';
      speakResponse(res.voiceText || res.text, langForTTS);
    } catch {
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: '⚠️ AI service is temporarily unavailable. Please try again in a moment.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMessage]);
      setVoiceStatus('idle');
    } finally {
      setLoading(false);
      if (voiceStatus === 'thinking') {
        setVoiceStatus('idle');
      }
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFeedback = async (id: string, rating: 'like' | 'dislike', reason?: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, feedback: rating, feedbackReason: reason } : m))
    );

    const targetMsg = messages.find(m => m.id === id);
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');

    await sendAIFeedback({
      messageId: id,
      rating,
      reason,
      query: lastUserMsg?.content,
      response: targetMsg?.content,
      language: selectedLanguage
    }, session?.token);

    setFeedbackActiveMsgId(null);
  };

  const handleRegenerate = () => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg) {
      handleSendMessage(lastUserMsg.content);
    }
  };

  const clearChat = () => {
    stopSpeaking();
    setMessages([]);
    setVoiceDiagnosticMsg(null);
    setConversationContext({
      currentProduct: null,
      horizonDays: 30,
      scenario: { demandMultiplier: 1.0 }
    });
  };

  return (
    <>
      {/* Floating Modern Circular Trigger Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          id="sv-copilot-trigger-btn"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Open SV Forecast AI Copilot"
          className="relative group w-14 h-14 rounded-full p-0 flex items-center justify-center shadow-xl shadow-primary/25 hover:shadow-primary/40 bg-gradient-to-tr from-primary to-indigo-600 text-primary-foreground transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-primary/30"
        >
          {voiceStatus === 'listening' ? (
            <span className="absolute inset-0 rounded-full bg-rose-500/30 animate-ping" />
          ) : (
            <span className="absolute inset-0 rounded-full bg-primary/20 animate-pulse" />
          )}

          <Bot className="w-6 h-6 z-10 transition-transform group-hover:rotate-12" />

          {/* Online & State Dot */}
          <span className={`w-3.5 h-3.5 rounded-full border-2 border-background absolute top-0.5 right-0.5 z-20 ${
            voiceStatus === 'listening'
              ? 'bg-rose-500 animate-ping'
              : voiceStatus === 'speaking'
              ? 'bg-cyan-400 animate-pulse'
              : 'bg-emerald-500'
          }`} />
        </button>
      </div>

      {/* Main Copilot Modal Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`fixed z-50 flex flex-col bg-card/95 text-foreground border border-border rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden ${
              isExpanded
                ? 'inset-4 sm:inset-10'
                : 'bottom-24 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-[480px] h-[660px] max-h-[calc(100vh-7rem)]'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/40 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center relative shadow-sm">
                  <Bot className="w-5 h-5 text-primary" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute -bottom-0.5 -right-0.5 ring-2 ring-card animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-foreground font-mono tracking-tight">SV Forecast AI</h3>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-primary/15 text-primary border border-primary/25 font-bold">
                      LIVE
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Multilingual Voice & Forecasting Copilot</p>
                </div>
              </div>

              {/* Header Controls */}
              <div className="flex items-center gap-1.5">
                {/* Language Selector */}
                <div className="relative flex items-center">
                  <Globe className="w-3.5 h-3.5 text-muted-foreground absolute left-2 pointer-events-none" />
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value as SupportedLanguage)}
                    className="bg-secondary border border-border hover:border-primary text-foreground text-[11px] font-mono rounded-lg pl-7 pr-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary transition-colors cursor-pointer appearance-none"
                    title="Select Language (Selected language is strictly respected)"
                  >
                    {Object.entries(LANGUAGE_LABELS).map(([code, item]) => (
                      <option key={code} value={code} className="bg-card text-foreground">
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Hands-Free Voice Conversation Mode Toggle */}
                <button
                  onClick={() => setHandsFree(!handsFree)}
                  className={`p-1.5 rounded-lg transition-colors text-xs ${
                    handsFree ? 'bg-primary/20 text-primary border border-primary/40 font-bold' : 'text-muted-foreground hover:bg-secondary'
                  }`}
                  title={handsFree ? 'Hands-Free Voice Conversation ACTIVE' : 'Enable Hands-Free Voice Conversation'}
                >
                  <Radio className={`w-4 h-4 ${handsFree ? 'animate-pulse' : ''}`} />
                </button>

                {/* Voice Response Toggle */}
                <button
                  onClick={() => {
                    const next = !voiceResponsesEnabled;
                    setVoiceResponsesEnabled(next);
                    localStorage.setItem('sv_voice_responses_enabled', next ? 'true' : 'false');
                    if (!next) stopSpeaking();
                  }}
                  className={`p-1.5 rounded-lg transition-colors text-xs ${
                    voiceResponsesEnabled ? 'text-primary hover:bg-secondary' : 'text-muted-foreground hover:bg-secondary line-through'
                  }`}
                  title={voiceResponsesEnabled ? 'Voice output ON (Click to mute speech)' : 'Voice output OFF (Click to unmute)'}
                >
                  {voiceResponsesEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>

                {/* Stop Speaking button if active */}
                {voiceStatus === 'speaking' && (
                  <button
                    onClick={stopSpeaking}
                    className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-colors animate-pulse"
                    title="Stop speaking"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                  </button>
                )}

                {/* New Chat */}
                <button
                  onClick={clearChat}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  title="New Chat"
                >
                  <Plus className="w-4 h-4" />
                </button>

                {/* Minimize / Maximize */}
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors hidden sm:flex"
                  title={isExpanded ? 'Minimize' : 'Expand'}
                >
                  {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>

                {/* Close */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-secondary transition-colors"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Insecure Context or Permission Diagnostic Banner */}
            {voiceDiagnosticMsg && (
              <div className="px-3.5 py-2 bg-amber-500/15 border-b border-amber-500/30 flex items-start justify-between gap-2 text-[11px] text-amber-200">
                <div className="flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                  <span>{voiceDiagnosticMsg}</span>
                </div>
                <button
                  onClick={() => setVoiceDiagnosticMsg(null)}
                  className="text-amber-400 hover:text-amber-200 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Chat Area */}
            <div
              ref={chatScrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs scroll-smooth bg-background/50"
            >
              {/* Empty State / Dynamic Suggestions */}
              {messages.length === 0 && (
                <div className="h-full flex flex-col justify-center py-4 space-y-4">
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center shadow-lg">
                      <Sparkles className="w-6 h-6 text-primary" />
                    </div>
                    <h4 className="text-sm font-semibold text-foreground">How can I assist your forecasts today?</h4>
                    <p className="text-[11px] text-muted-foreground max-w-xs mx-auto leading-relaxed">
                      Ask me by typing or speaking in Marathi, Hindi, Kannada, Tamil, Telugu, or English.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-2 pt-2">
                    {STARTER_SUGGESTIONS.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(item.text)}
                        className="p-2.5 rounded-xl bg-card hover:bg-secondary border border-border hover:border-primary/40 text-left transition-all group flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-sm">{item.icon}</span>
                          <span className="text-xs text-foreground font-medium group-hover:text-primary transition-colors">
                            {item.text}
                          </span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message Feed */}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} space-y-1`}
                >
                  <div
                    className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 shadow-md ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-none font-medium'
                        : 'bg-card border border-border text-foreground rounded-bl-none'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    ) : (
                      <div className="space-y-2">
                        <MarkdownRenderer content={msg.content} />
                        <ProductNotFoundChips content={msg.content} onSelect={handleSendMessage} />

                        {/* Grounding Source Badge */}
                        <div className="pt-2 mt-2 border-t border-border/60 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                          <span className="flex items-center gap-1.5 text-primary">
                            <Database className="w-2.5 h-2.5" />
                            Hybrid XGBoost-LSTM Grounded
                            {msg.intent && (
                              <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[9px] font-medium uppercase tracking-wider">
                                {msg.intent.replace(/_/g, ' ')}
                              </span>
                            )}
                          </span>
                          <span>{msg.timestamp}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Assistant Actions Bar */}
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground px-1 pt-0.5">
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="hover:text-foreground flex items-center gap-1 transition-colors"
                        title="Copy text"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                      </button>

                      {/* Read aloud button */}
                      <button
                        onClick={() => speakResponse(msg.voiceText || msg.content, (msg.language as SupportedLanguage) || selectedLanguage)}
                        className="hover:text-foreground flex items-center gap-1 transition-colors"
                        title="Listen aloud"
                      >
                        <Volume2 className="w-3 h-3" />
                        <span>Listen</span>
                      </button>

                      <button
                        onClick={() => handleFeedback(msg.id, 'like')}
                        className={`hover:text-foreground transition-colors ${
                          msg.feedback === 'like' ? 'text-emerald-400 font-bold' : ''
                        }`}
                        title="Helpful"
                      >
                        <ThumbsUp className="w-3 h-3" />
                      </button>

                      <Popover open={feedbackActiveMsgId === msg.id} onOpenChange={(open) => setFeedbackActiveMsgId(open ? msg.id : null)}>
                        <PopoverTrigger asChild>
                          <button
                            className={`hover:text-foreground transition-colors ${
                              msg.feedback === 'dislike' ? 'text-rose-400 font-bold' : ''
                            }`}
                            title="Unhelpful"
                          >
                            <ThumbsDown className="w-3 h-3" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-3 bg-card border border-border shadow-xl rounded-xl text-xs space-y-2">
                          <h5 className="font-bold text-foreground">What went wrong?</h5>
                          <select
                            value={feedbackReason}
                            onChange={(e) => setFeedbackReason(e.target.value)}
                            className="w-full bg-secondary border border-border rounded p-1 text-xs text-foreground"
                          >
                            <option value="wrong_answer">Wrong answer</option>
                            <option value="wrong_language">Wrong language</option>
                            <option value="didnt_understand">Didn't understand query</option>
                            <option value="wrong_calculation">Wrong calculation</option>
                            <option value="other">Other</option>
                          </select>
                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              onClick={() => handleFeedback(msg.id, 'dislike', feedbackReason)}
                              className="px-2.5 py-1 rounded bg-primary text-primary-foreground font-semibold text-[11px]"
                            >
                              Submit Feedback
                            </button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}

                  {/* Contextual Suggestion Chips (Upgrade 2) */}
                  {msg.role === 'assistant' && msg.suggestedActions && msg.suggestedActions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 px-1 pt-1 max-w-[90%]">
                      {msg.suggestedActions.map((action) => (
                        <button
                          key={action.id}
                          type="button"
                          onClick={() => {
                            if (action.isAction && action.query === 'export_csv') {
                              const tokenParam = session?.token ? `?token=${encodeURIComponent(session.token)}` : '';
                              window.open(`http://localhost:5000/api/forecasts/export-csv${tokenParam}`, '_blank');
                            } else {
                              handleSendMessage(action.query);
                            }
                          }}
                          disabled={loading}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium bg-primary/10 hover:bg-primary/20 border border-primary/25 hover:border-primary/50 text-primary transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer shadow-sm active:scale-95"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Real-time speech transcription feed */}
              {interimTranscript && (
                <div className="flex flex-col items-end space-y-1">
                  <div className="max-w-[90%] rounded-2xl px-3.5 py-2.5 bg-primary/70 text-primary-foreground border border-primary/50 shadow-md animate-pulse">
                    <p className="whitespace-pre-wrap italic text-xs">🎙️ {interimTranscript}...</p>
                  </div>
                </div>
              )}

              {/* Typing / Thinking Indicator */}
              {loading && (
                <div className="flex items-center gap-2 p-3 rounded-2xl bg-card border border-border max-w-fit shadow-md">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.4s]" />
                  <span className="text-[11px] font-mono text-muted-foreground ml-1">Analyzing forecast data & inventory...</span>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-card border-t border-border">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-end gap-2"
              >
                <div className="relative flex-1 bg-secondary border border-border focus-within:border-primary rounded-xl overflow-hidden transition-colors">
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={
                      voiceStatus === 'listening'
                        ? '🎙️ Listening to your speech...'
                        : 'Ask anything about forecasts, inventory, sales, pricing or data...'
                    }
                    className="w-full bg-transparent p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none resize-none max-h-28"
                  />
                </div>

                {/* Speech Dictation / Push-To-Talk Button */}
                <button
                  type="button"
                  id="sv-copilot-mic-btn"
                  onClick={toggleSpeechRecognition}
                  className={`relative p-2.5 rounded-xl border transition-all ${
                    voiceStatus === 'listening'
                      ? 'bg-rose-500/20 border-rose-500 text-rose-500 animate-pulse ring-2 ring-rose-500/40'
                      : 'bg-secondary border-border hover:border-primary text-muted-foreground hover:text-foreground'
                  }`}
                  title={voiceStatus === 'listening' ? 'Listening... Click to stop' : 'Start voice input (Speech-to-Text)'}
                >
                  {voiceStatus === 'listening' ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="p-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold disabled:opacity-40 disabled:pointer-events-none shadow-md shadow-primary/20 transition-all"
                  title="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

              {/* Bottom Context Indicator & Quick Actions */}
              <div className="flex items-center justify-between pt-2 px-1 text-[10px] text-muted-foreground font-mono">
                <div className="flex items-center gap-1.5 truncate max-w-[280px]">
                  <span>Topic:</span>
                  {conversationContext.currentProduct ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary font-bold">
                      <Tag className="w-2.5 h-2.5" />
                      {conversationContext.currentProduct}
                      <button
                        onClick={() => setConversationContext(prev => ({ ...prev, currentProduct: null }))}
                        className="hover:text-destructive transition-colors ml-0.5"
                        title="Clear topic context"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ) : (
                    <span className="text-foreground font-medium">Auto (All Products)</span>
                  )}
                </div>

                {messages.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRegenerate}
                      className="hover:text-foreground flex items-center gap-1 transition-colors"
                      title="Regenerate last response"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      Regenerate
                    </button>
                    <button
                      onClick={clearChat}
                      className="hover:text-destructive flex items-center gap-1 transition-colors"
                      title="Clear chat history"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                      Clear
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}


// ── Product Chip Extractor for Error Recovery (Upgrade 1) ──────────────────────
function ProductNotFoundChips({ content, onSelect }: { content: string; onSelect: (query: string) => void }) {
  // Detect "Product Not Found" or multilingual equivalents
  const isProductNotFound =
    content.includes('Product Not Found') ||
    content.includes('ಉತ್ಪನ್ನ ಕಂಡುಬಂದಿಲ್ಲ') ||
    content.includes('उत्पाद नहीं मिला') ||
    content.includes('ఉత్పత్తి కనుగొనబడలేదు');

  if (!isProductNotFound) return null;

  // Extract bullet-listed products (lines starting with • ** or • )
  const productMatches = content.match(/•\s+\*\*([^\*]+)\*\*/g) || [];
  const products = productMatches
    .map(m => m.replace(/•\s+\*\*/, '').replace(/\*\*$/, '').trim())
    .filter(p => p.length > 2)
    .slice(0, 10);

  if (products.length === 0) return null;

  return (
    <div className="mt-2 pt-2 border-t border-border/40">
      <p className="text-[10px] text-muted-foreground font-mono mb-1.5 flex items-center gap-1">
        <span>🎯</span>
        <span className="font-bold text-foreground">Suggested products in dataset — tap to forecast:</span>
      </p>
      <div className="flex flex-wrap gap-1.5">
        {products.map((product) => (
          <button
            key={product}
            type="button"
            onClick={() => onSelect(`Forecast for ${product} next month`)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/60 text-amber-300 hover:text-amber-200 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            🏷️ {product}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Markdown Parser & Theme-Safe Table Renderer ──────────────────────────────
function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split('\n');
  const renderedElements: React.ReactNode[] = [];
  let tableRows: string[] = [];
  let inTable = false;

  const flushTable = (key: number) => {
    if (tableRows.length === 0) return null;
    const headerRow = tableRows[0];
    const dataRows = tableRows.slice(2);

    const parseCells = (row: string) =>
      row
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim());

    const headers = parseCells(headerRow);

    return (
      <div key={`table-${key}`} className="my-2.5 overflow-x-auto rounded-xl border border-border shadow-sm">
        <table className="w-full text-[11px] text-left divide-y divide-border">
          <thead className="bg-secondary text-foreground font-mono font-bold">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="px-3 py-2">
                  {renderInlineText(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 bg-card/60">
            {dataRows.map((r, rIdx) => {
              const cells = parseCells(r);
              return (
                <tr key={rIdx} className="hover:bg-secondary/40 transition-colors">
                  {cells.map((c, cIdx) => (
                    <td key={cIdx} className="px-3 py-1.5 whitespace-nowrap">
                      {renderInlineText(c)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Markdown Table handling
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      inTable = true;
      tableRows.push(trimmed);
      return;
    } else if (inTable) {
      inTable = false;
      renderedElements.push(flushTable(idx));
      tableRows = [];
    }

    if (!trimmed) {
      renderedElements.push(<div key={idx} className="h-1.5" />);
      return;
    }

    // Headers
    if (trimmed.startsWith('### ')) {
      renderedElements.push(
        <h5 key={idx} className="text-xs font-bold text-foreground font-mono mt-2 mb-1">
          {renderInlineText(trimmed.replace('### ', ''))}
        </h5>
      );
      return;
    }
    if (trimmed.startsWith('## ')) {
      renderedElements.push(
        <h4 key={idx} className="text-sm font-bold text-foreground font-mono mt-2.5 mb-1 text-primary">
          {renderInlineText(trimmed.replace('## ', ''))}
        </h4>
      );
      return;
    }

    // Bullet points
    if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      renderedElements.push(
        <div key={idx} className="flex items-start gap-2 pl-1 leading-relaxed">
          <span className="text-primary mt-0.5">•</span>
          <span className="flex-1">{renderInlineText(trimmed.replace(/^[•\-\*]\s+/, ''))}</span>
        </div>
      );
      return;
    }

    // Standard paragraph
    renderedElements.push(
      <p key={idx} className="leading-relaxed">
        {renderInlineText(trimmed)}
      </p>
    );
  });

  if (inTable) {
    renderedElements.push(flushTable(lines.length));
  }

  return <div className="space-y-1">{renderedElements}</div>;
}

// ── Inline Formatter (Bold, Code, Math) ───────────────────────────────────────
function renderInlineText(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`|\$.*?\$)/g);

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-bold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="px-1.5 py-0.5 rounded bg-secondary text-primary font-mono text-[10px] border border-border">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('$') && part.endsWith('$')) {
      return (
        <span key={i} className="font-mono text-cyan-400 italic px-0.5">
          {part.slice(1, -1)}
        </span>
      );
    }
    return part;
  });
}
