import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import axios from 'axios';
import { Link, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import FavoriteIcon from '@mui/icons-material/Favorite';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import { addToWishlist, removeFromWishlist } from '../../actions/wishlistAction';
import lexiChatBg from '../../assets/images/lexi_chat_bg.webp';
import lexiVoice from '../../assets/Lexi_voice.mp3';
import useLexyVoice from '../../hooks/useLexyVoice';
import useLexyTTS from '../../hooks/useLexyTTS';
import useHeyLexy from '../../hooks/useHeyLexy';

const initialMessage = {
    role: 'assistant',
    content: "Hi! I'm Milaari AI. Tell me what you want to buy (category, brand, budget).",
    products: [],
};

const safeJsonParse = (raw, fallback) => {
    try {
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
};

const extractBudget = (text) => {
    const s = String(text || '');
    const m = s.match(/(?:₹|rs\.?|inr)\s*([0-9][0-9,]{2,})/i) || s.match(/\b([0-9][0-9,]{3,})\b/);
    if (!m) return null;
    const n = Number(String(m[1]).replace(/,/g, ''));
    return Number.isFinite(n) && n > 0 ? n : null;
};

const detectCurrency = (text) => {
    const s = String(text || '').toLowerCase();
    if (s.includes('inr') || s.includes('rupee') || s.includes('rupees') || s.includes('₹')) return 'INR';
    if (s.includes('usd') || s.includes('dollar') || s.includes('$')) return 'USD';
    if (s.includes('eur') || s.includes('euro') || s.includes('€')) return 'EUR';
    return null;
};

const detectIntent = (text) => {
    const s = String(text || '').toLowerCase();
    const intents = ['conditioner', 'shampoo', 'serum', 'sunscreen', 'moisturizer', 'cleanser', 'foundation', 'lipstick', 'perfume'];
    return intents.find((k) => s.includes(k)) || null;
};

const buildMemoryFrom = ({ prev, newText }) => {
    const next = { ...(prev || {}) };
    const budget = extractBudget(newText);
    const currency = detectCurrency(newText);
    const intent = detectIntent(newText);

    if (budget) next.budget = budget;
    if (currency) next.currency = currency;
    if (intent) next.intent = intent;

    next.updatedAt = new Date().toISOString();
    return next;
};

const memoryToPromptString = (memory) => {
    if (!memory || typeof memory !== 'object') return '';
    const parts = [];
    if (memory.intent) parts.push(`Requested product: ${memory.intent}`);
    if (memory.budget) parts.push(`Budget: ${memory.currency || 'INR'} ${Number(memory.budget).toLocaleString()}`);
    if (memory.currency && !memory.budget) parts.push(`Currency: ${memory.currency}`);
    return parts.join(' | ');
};

const asHistory = (messages) =>
    messages
        .filter((m) => m && !m.isDebug && (m.role === 'user' || m.role === 'assistant'))
        .map((m) => ({ role: m.role, content: m.fullContent || m.content }))
        .slice(-10);

const ChatProductCard = ({ product }) => {
    const imageUrl = product?.image || product?.images?.[0]?.url;
    const price = Number(product?.price || 0);
    const cuttedPrice = Number(product?.cuttedPrice || 0);
    const hasDiscount = Number.isFinite(cuttedPrice) && cuttedPrice > price;

    const dispatch = useDispatch();
    const { wishlistItems } = useSelector((state) => state.wishlist);
    const isInWishlist = wishlistItems?.some((i) => i.product === product?._id);

    return (
        <div className="relative w-40 shrink-0 bg-white border border-gray-200 rounded-sm overflow-hidden">
            <Link to={`/product/${product._id}`} className="block">
                <div className="h-28 w-full bg-gray-50 flex items-center justify-center">
                    {imageUrl ? (
                        <img className="w-full h-full object-contain p-2" src={imageUrl} alt={product?.name} />
                    ) : (
                        <div className="w-full h-full bg-gray-100" />
                    )}
                </div>
            </Link>

            <button
                type="button"
                onClick={() => {
                    if (!product?._id) return;
                    if (isInWishlist) dispatch(removeFromWishlist(product._id));
                    else dispatch(addToWishlist(product._id));
                }}
                className="absolute top-2 right-2 w-8 h-8 rounded-full border border-gray-200 bg-white/90 flex items-center justify-center"
                aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            >
                <span className={isInWishlist ? 'text-primary-blue' : 'text-primary-grey hover:text-primary-blue'}>
                    <FavoriteIcon sx={{ fontSize: '18px' }} />
                </span>
            </button>

            <div className="p-2">
                <Link to={`/product/${product._id}`} className="block">
                    <div className="text-[11px] uppercase tracking-widest text-primary-darkBlue leading-snug h-8 overflow-hidden hover:text-primary-blue">
                        {product?.name}
                    </div>
                </Link>
                <div className="mt-1 flex items-baseline gap-2">
                    {hasDiscount && (
                        <span className="text-[11px] text-primary-grey line-through">₹{cuttedPrice.toLocaleString()}</span>
                    )}
                    <span className="text-[12px] font-medium text-primary-darkBlue">₹{price.toLocaleString()}</span>
                </div>
            </div>
        </div>
    );
};

const FloatingChat = () => {
    const BUBBLE_SIZE_PX = 80;
    const BUBBLE_OFFSET_PX = 24;
    const PANEL_GAP_PX = 16;

    const [open, setOpen] = useState(false);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [messages, setMessages] = useState([initialMessage]);
    const [memory, setMemory] = useState({});

    const { user, isAuthenticated } = useSelector((state) => state.user);
    const chatOwnerId = isAuthenticated && user?._id ? String(user._id) : 'guest';

    const location = useLocation();

    const voiceRef = useRef(null);
    const lastChimeAtRef = useRef(0);
    const prevOpenRef = useRef(false);
    const typingTimeoutRef = useRef(null);
    const longPressTimerRef = useRef(null);
    const lastVoiceInputRef = useRef(false); // tracks if last user msg was via voice

    // ── Voice hooks ──
    const voice = useLexyVoice();
    const tts = useLexyTTS();

    // "Hey Lexy" wake word — opens chat + starts listening
    const handleWake = useCallback(() => {
        setOpen(true);
        void tryPlayOpenChimeRef.current();
        setTimeout(() => {
            voice.start({
                onFinal: (text) => {
                    lastVoiceInputRef.current = true;
                    setInput(text);
                    // Auto-send after a short delay so user sees the transcript
                    setTimeout(() => sendViaVoiceRef.current(text), 300);
                },
            });
        }, 400);
    }, [voice]);

    const heyLexy = useHeyLexy({ onWake: handleWake });

    // Pause wake listener while chat is open or voice is active
    useEffect(() => {
        if (open || voice.listening) {
            heyLexy.stopWakeListener();
        } else if (heyLexy.wakeEnabled && !open && !voice.listening) {
            heyLexy.startWakeListener();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, voice.listening, heyLexy.wakeEnabled]);

    const tryPlayOpenChime = async () => {
        // Avoid rapid re-triggering.
        const nowMs = Date.now();
        if (nowMs - lastChimeAtRef.current < 600) return;
        lastChimeAtRef.current = nowMs;

        try {
            if (!voiceRef.current) {
                const audio = new Audio(lexiVoice);
                audio.preload = 'auto';
                audio.volume = 0.05;
                voiceRef.current = audio;
            }

            const audio = voiceRef.current;
            audio.volume = 0.05;
            audio.currentTime = 0;
            await audio.play();
        } catch {
            // Autoplay policies can block audio; ignore silently.
        }
    };

    // Stable refs for callbacks used inside useCallback closures
    const tryPlayOpenChimeRef = useRef(tryPlayOpenChime);
    tryPlayOpenChimeRef.current = tryPlayOpenChime;
    const sendViaVoiceRef = useRef(null); // set below after sendMessage is defined

    useEffect(() => {
        const qs = new URLSearchParams(location.search || '');
        const openTarget = String(qs.get('open') || '').toLowerCase();
        if (openTarget === 'lexi-assistant') {
            setOpen(true);
        }
    }, [location.search]);

    useEffect(() => {
        const wasOpen = prevOpenRef.current;
        prevOpenRef.current = open;
        if (!wasOpen && open) {
            void tryPlayOpenChime();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const listRef = useRef(null);
    const inputRef = useRef(null);
    const containerRef = useRef(null);

    const chatStorageKey = useMemo(() => `lexyChat:${chatOwnerId}`, [chatOwnerId]);
    const memoryStorageKey = useMemo(() => `lexyChatMemory:${chatOwnerId}`, [chatOwnerId]);

    const history = useMemo(() => asHistory(messages), [messages]);

    // Load chat history per user (prevents different accounts sharing the same chat in localhost)
    useEffect(() => {
        try {
            const raw = localStorage.getItem(chatStorageKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length) {
                    // Drop messages that were saved with empty content (broken streaming)
                    const valid = parsed.filter(
                        (m) => m && ((m.content && String(m.content).trim()) || (m.fullContent && String(m.fullContent).trim()))
                    );
                    setMessages(valid.length ? valid : [initialMessage]);
                } else {
                    setMessages([initialMessage]);
                }
            } else {
                setMessages([initialMessage]);
            }
        } catch {
            setMessages([initialMessage]);
        }

        try {
            const rawMem = localStorage.getItem(memoryStorageKey);
            setMemory(safeJsonParse(rawMem, {}) || {});
        } catch {
            setMemory({});
        }

        setInput('');
        setSending(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chatStorageKey]);

    // Persist last N messages per user (always write fullContent into content so reloads are safe)
    useEffect(() => {
        try {
            const trimmed = (Array.isArray(messages) ? messages.slice(-30) : [initialMessage])
                .map((m) => ({
                    ...m,
                    content: m.content || m.fullContent || '',
                }));
            localStorage.setItem(chatStorageKey, JSON.stringify(trimmed));
        } catch {
            // ignore storage errors
        }
    }, [chatStorageKey, messages]);

    useEffect(() => {
        try {
            localStorage.setItem(memoryStorageKey, JSON.stringify(memory || {}));
        } catch {
            // ignore storage errors
        }
    }, [memoryStorageKey, memory]);

    useEffect(() => {
        if (!open) return;
        const el = listRef.current;
        if (!el) return;
        el.scrollTop = el.scrollHeight;
    }, [open, messages]);

    useEffect(() => {
        const el = inputRef.current;
        if (!el) return;

        // Auto-grow the textarea a bit (keeps UI tidy for long text)
        const maxHeightPx = 120;
        el.style.height = '0px';
        const nextHeight = Math.min(el.scrollHeight, maxHeightPx);
        el.style.height = `${nextHeight}px`;
        el.style.overflowY = el.scrollHeight > maxHeightPx ? 'auto' : 'hidden';
    }, [input]);

    // Close chat when clicking/tapping anywhere outside the widget
    useEffect(() => {
        if (!open) return;

        const onOutside = (e) => {
            const container = containerRef.current;
            if (!container) return;
            if (container.contains(e.target)) return;
            setOpen(false);
        };

        document.addEventListener('mousedown', onOutside, true);
        document.addEventListener('touchstart', onOutside, true);

        return () => {
            document.removeEventListener('mousedown', onOutside, true);
            document.removeEventListener('touchstart', onOutside, true);
        };
    }, [open]);

    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, []);

    const startStreamingReply = (messageIndex, fullText) => {
        if (!fullText) return;

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }

        let i = 0;
        const step = () => {
            i += 2;
            setMessages((prev) => {
                if (!prev[messageIndex]) return prev;
                const next = [...prev];
                const target = next[messageIndex];
                next[messageIndex] = {
                    ...target,
                    content: fullText.slice(0, i),
                };
                return next;
            });

            if (i < fullText.length) {
                typingTimeoutRef.current = window.setTimeout(step, 15);
            } else {
                typingTimeoutRef.current = null;
            }
        };

        step();
    };

    const sendMessage = async (overrideText) => {
        const text = (overrideText || input).trim();
        if (!text || sending) return;

        const wasVoice = lastVoiceInputRef.current;
        lastVoiceInputRef.current = false;

        setInput('');
        setSending(true);

        setMemory((prev) => buildMemoryFrom({ prev, newText: text }));

        setMessages((prev) => [...prev, { role: 'user', content: text, products: [] }]);

        try {
            const { data } = await axios.post(
                '/api/v1/chat',
                {
                    message: text,
                    history,
                    memory: memoryToPromptString(buildMemoryFrom({ prev: memory, newText: text })),
                },
                { timeout: 25000 }
            );
            const replyText = data?.reply || 'Sorry — I did not get a response.';
            const products = Array.isArray(data?.products) ? data.products : [];
            setMessages((prev) => {
                return [
                    ...prev,
                    {
                        role: 'assistant',
                        content: replyText,
                        fullContent: replyText,
                        products,
                    },
                ];
            });

            // Speak reply if TTS enabled and last input was voice
            if (wasVoice && tts.enabled) {
                tts.speak(replyText);
            }
        } catch (e) {
            const msg = e?.response?.data?.message || e?.message || 'Something went wrong.';
            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: `Sorry — ${msg}`,
                    products: [],
                },
            ]);
        } finally {
            setSending(false);
        }
    };

    // Wire sendViaVoiceRef so the wake word callback can call sendMessage
    sendViaVoiceRef.current = (text) => {
        lastVoiceInputRef.current = true;
        sendMessage(text);
    };

    // Voice mic button handler for chat input
    const handleChatMic = () => {
        if (voice.listening) {
            voice.stop();
            return;
        }
        tts.cancelSpeech();
        // Stop wake listener BEFORE starting voice to avoid SpeechRecognition conflict
        heyLexy.stopWakeListener();
        voice.start({
            onFinal: (text) => {
                lastVoiceInputRef.current = true;
                setInput(text);
                setTimeout(() => sendMessage(text), 300);
            },
        });
    };

    // Update input field with live transcript
    useEffect(() => {
        if (voice.listening && voice.transcript) {
            setInput(voice.transcript);
        }
    }, [voice.listening, voice.transcript]);

    // Listen for header mic trigger (desktop)
    useEffect(() => {
        const handler = () => {
            if (!open) {
                tryPlayOpenChimeRef.current();
                setOpen(true);
            }
            setTimeout(() => handleChatMic(), 300);
        };
        window.addEventListener('lexy:voice:start', handler);
        return () => window.removeEventListener('lexy:voice:start', handler);
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    const onKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const isExpanded = open;

    return (
        <div ref={containerRef}>
            {/* Toggle button — long-press on mobile starts voice */}
            <button
                onClick={() => {
                    if (!open) void tryPlayOpenChime();
                    setOpen((v) => !v);
                }}
                onTouchStart={() => {
                    longPressTimerRef.current = setTimeout(() => {
                        longPressTimerRef.current = 'fired';
                        handleWake();
                    }, 600);
                }}
                onTouchEnd={(e) => {
                    if (longPressTimerRef.current === 'fired') {
                        e.preventDefault(); // prevent click from also firing
                        longPressTimerRef.current = null;
                        return;
                    }
                    if (longPressTimerRef.current) {
                        clearTimeout(longPressTimerRef.current);
                        longPressTimerRef.current = null;
                    }
                }}
                onTouchMove={() => {
                    if (longPressTimerRef.current && longPressTimerRef.current !== 'fired') {
                        clearTimeout(longPressTimerRef.current);
                        longPressTimerRef.current = null;
                    }
                }}
                className="fixed bottom-6 right-6 z-[60] w-20 h-20 rounded-full bg-[var(--lexy-maroon-75)] text-white shadow-lg flex items-center justify-center relative"
                style={{
                    position: 'fixed',
                    right: `${BUBBLE_OFFSET_PX}px`,
                    bottom: `${BUBBLE_OFFSET_PX}px`,
                    width: `${BUBBLE_SIZE_PX}px`,
                    height: `${BUBBLE_SIZE_PX}px`,
                    borderRadius: '9999px',
                    zIndex: 10000,
                }}
                aria-label={isExpanded ? 'Close chat' : 'Open chat (long-press for voice)'}
                type="button"
            >
                {!isExpanded && !voice.listening && (
                    <>
                        <span className="absolute inset-0 rounded-full bg-[rgba(36,23,26,0.30)] animate-ping pointer-events-none" />
                        <span className="absolute inset-0 rounded-full bg-[rgba(36,23,26,0.20)] animate-pulse pointer-events-none" />
                    </>
                )}
                {voice.listening && (
                    <>
                        <span className="absolute inset-0 rounded-full bg-red-400/40 animate-ping pointer-events-none" />
                        <span className="absolute inset-0 rounded-full bg-red-400/25 animate-pulse pointer-events-none" />
                    </>
                )}
                <span className="relative font-brandSerif font-normal text-2xl leading-none select-none">
                    {voice.listening ? <MicIcon fontSize="medium" /> : isExpanded ? '×' : 'L'}
                </span>
            </button>

            {/* Panel */}
            <div
                style={{
                    position: 'fixed',
                    right: `${BUBBLE_OFFSET_PX}px`,
                    bottom: `${BUBBLE_OFFSET_PX + BUBBLE_SIZE_PX + PANEL_GAP_PX}px`,
                    width: '30rem',
                    maxWidth: `calc(100vw - ${BUBBLE_OFFSET_PX * 2}px)`,
                    height: '38rem',
                    maxHeight: '80vh',
                    zIndex: 10000,
                }}
                aria-hidden={!open}
                className={
                    `bg-white rounded shadow-xl border border-gray-200 flex flex-col overflow-hidden min-h-0 ` +
                    `origin-bottom-right transform-gpu transition-all duration-300 ease-out motion-reduce:transition-none motion-reduce:transform-none ` +
                    (open
                        ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                        : 'opacity-0 scale-95 translate-y-2 pointer-events-none')
                }
            >
                    <div className="px-4 py-3 bg-[var(--lexy-maroon-75)] text-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="font-medium">Milaari AI Assistant</span>
                            {heyLexy.wakeListening && (
                                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">"Hey Milaari" on</span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {/* TTS toggle */}
                            <button
                                onClick={tts.toggle}
                                className="text-white/80 hover:text-white transition-colors"
                                type="button"
                                aria-label={tts.enabled ? 'Mute voice replies' : 'Enable voice replies'}
                                title={tts.enabled ? 'Voice replies ON' : 'Voice replies OFF'}
                            >
                                {tts.enabled ? <VolumeUpIcon sx={{ fontSize: 20 }} /> : <VolumeOffIcon sx={{ fontSize: 20 }} />}
                            </button>
                            {/* Hey Lexy toggle */}
                            <button
                                onClick={heyLexy.toggleWake}
                                className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${
                                    heyLexy.wakeEnabled ? 'bg-white/30 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'
                                }`}
                                type="button"
                                title={heyLexy.wakeEnabled ? 'Disable "Hey Milaari"' : 'Enable "Hey Milaari"'}
                            >
                                Hey Milaari
                            </button>
                            <button
                                onClick={() => setOpen(false)}
                                className="text-white/90 hover:text-white"
                                type="button"
                                aria-label="Close chat"
                            >
                                ×
                            </button>
                        </div>
                    </div>

                    <div className="relative flex-1 flex min-h-0 bg-gray-50">
                        <div className="pointer-events-none absolute inset-0 opacity-10">
                            <img
                                src={lexiChatBg}
                                alt="Milaari chat background"
                                className="w-full h-full object-cover"
                                draggable="false"
                            />
                        </div>

                        <div
                            ref={listRef}
                            className="relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden lexy-hide-scrollbar p-3 space-y-3 bg-transparent"
                        >
                        {messages.map((m, idx) => (
                            <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className="max-w-[92%] min-w-0">
                                    <div
                                        className={
                                            m.role === 'user'
                                                ? 'ml-auto max-w-[85%] bg-[var(--lexy-maroon-75)] text-white px-3 py-2 rounded-lg text-sm'
                                                : 'max-w-[85%] bg-white text-gray-800 px-3 py-2 rounded-lg text-sm border border-gray-200'
                                        }
                                    >
                                        <div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{m.content || m.fullContent}</div>
                                    </div>

                                    {m.role === 'assistant' && Array.isArray(m.products) && m.products.length > 0 && (
                                        <div className="mt-2 flex gap-2 overflow-x-auto lexy-hide-scrollbar pb-2">
                                            {m.products.map((p) => (
                                                <ChatProductCard key={p._id} product={p} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {sending && (
                            <div className="flex justify-start">
                                <div className="max-w-[85%] bg-white text-gray-800 px-3 py-2 rounded-lg text-sm border border-gray-200">
                                    Typing…
                                </div>
                            </div>
                        )}
                        </div>
                    </div>

                    {/* Live voice transcript preview */}
                    {voice.listening && (
                        <div className="px-3 py-2 bg-red-50 border-t border-red-200 flex items-center gap-2">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                            </span>
                            <span className="text-sm text-red-700 italic flex-1 truncate">
                                {voice.transcript || 'Listening\u2026'}
                            </span>
                            <button
                                onClick={voice.stop}
                                className="text-xs text-red-600 hover:text-red-800 font-medium"
                                type="button"
                            >
                                Stop
                            </button>
                        </div>
                    )}

                    {/* TTS speaking indicator */}
                    {tts.speaking && (
                        <div className="px-3 py-1.5 bg-blue-50 border-t border-blue-200 flex items-center gap-2">
                            <VolumeUpIcon sx={{ fontSize: 16 }} className="text-blue-500 animate-pulse" />
                            <span className="text-xs text-blue-600">Milaari is speaking…</span>
                            <button
                                onClick={tts.cancelSpeech}
                                className="text-xs text-blue-500 hover:text-blue-700 font-medium ml-auto"
                                type="button"
                            >
                                Stop
                            </button>
                        </div>
                    )}

                    <div className="p-3 bg-white border-t border-gray-200">
                        <div className="flex gap-2 items-end">
                            {/* Mic button */}
                            <button
                                onClick={handleChatMic}
                                className={`p-2 rounded-full transition-colors ${voice.listening ? 'bg-red-100 text-red-600 animate-pulse' : 'text-gray-500 hover:text-primary-blue hover:bg-gray-100'}`}
                                type="button"
                                title={voice.listening ? 'Stop listening' : 'Voice input'}
                            >
                                {voice.listening ? <MicOffIcon style={{ fontSize: 20 }} /> : <MicIcon style={{ fontSize: 20 }} />}
                            </button>
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={onKeyDown}
                                placeholder={voice.listening ? 'Listening...' : 'Ask Milaari anything or tap the mic...'}
                                className="flex-1 resize-none border border-gray-300 rounded px-3 py-2 text-sm leading-5 break-words overflow-x-hidden lexy-hide-scrollbar focus:outline-none focus:ring-2 focus:ring-primary-blue"
                                rows={1}
                            />
                            <button
                                onClick={() => sendMessage()}
                                disabled={sending || !input.trim()}
                                className="px-4 py-2 bg-primary-blue text-white rounded disabled:opacity-50"
                                type="button"
                            >
                                Send
                            </button>
                        </div>
                        <div className="mt-1 text-[11px] text-gray-500">
                            Tip: tap the mic or say "Hey Milaari" to use voice, or type your question.
                        </div>
                    </div>
            </div>
        </div>
    );
};

export default FloatingChat;
