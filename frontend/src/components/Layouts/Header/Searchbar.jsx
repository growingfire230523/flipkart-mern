import MicIcon from '@mui/icons-material/Mic';
import ImageSearchIcon from '@mui/icons-material/ImageSearch';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const Searchbar = () => {

    const [keyword, setKeyword] = useState("");
    const [recentSearches, setRecentSearches] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [trending, setTrending] = useState([]);
    const [didYouMean, setDidYouMean] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isImageSearching, setIsImageSearching] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const speechRecognitionRef = useRef(null);
    const lastFinalTranscriptRef = useRef('');
    const micPermissionGrantedRef = useRef(false);
    const noSpeechRetryRef = useRef(0);
    const stopRequestedRef = useRef(false);

    const imageInputRef = useRef(null);
    const inputRef = useRef(null);
    const containerRef = useRef(null);

    const audioContextRef = useRef(null);
    const suggestionAbortRef = useRef(null);
    const trendingFetchedRef = useRef(false);

    const RECENT_SEARCHES_KEY = 'lexy_recent_searches';

    // Load recent searches from localStorage once
    useEffect(() => {
        try {
            const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                setRecentSearches(parsed.filter((v) => typeof v === 'string' && v.trim()).slice(0, 10));
            }
        } catch {
            // ignore parse errors
        }
    }, []);

    const saveRecentSearch = useCallback((term) => {
        const trimmed = String(term || '').trim();
        if (!trimmed) return;
        setRecentSearches((prev) => {
            const existing = prev.filter((t) => t.toLowerCase() !== trimmed.toLowerCase());
            const next = [trimmed, ...existing].slice(0, 10);
            try {
                localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
            } catch {
                // ignore storage errors
            }
            return next;
        });
    }, []);

    const removeRecentSearch = useCallback((termToRemove) => {
        setRecentSearches((prev) => {
            const next = prev.filter((t) => t !== termToRemove);
            try {
                localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
            } catch {
                // ignore storage errors
            }
            return next;
        });
    }, []);

    useEffect(() => {
        // Keep the header search input in sync with the current browse/search route.
        // - Leaving /products clears it.
        // - Visiting /products/:keyword shows that keyword in the input.
        if (!location.pathname.startsWith('/products')) {
            setKeyword("");
            setShowDropdown(false);
            return;
        }

        const prefix = '/products/';
        if (location.pathname.startsWith(prefix)) {
            const raw = location.pathname.slice(prefix.length);
            const decoded = raw ? decodeURIComponent(raw) : '';
            setKeyword(decoded);
            return;
        }

        // /products (no keyword)
        setKeyword("");
    }, [location.pathname]);

    const performSearch = useCallback((value) => {
        const trimmed = (value || '').trim();

        if (trimmed) {
            saveRecentSearch(trimmed);
            navigate(`/products/${encodeURIComponent(trimmed)}`);
        } else {
            navigate('/products');
        }
        setShowDropdown(false);
    }, [navigate, saveRecentSearch]);

    useEffect(() => {
        const onMessage = (event) => {
            try {
                if (event.origin !== window.location.origin) return;
                const data = event.data;
                if (!data || typeof data !== 'object') return;

                const type = String(data.type || '').toUpperCase();
                if (type === 'LEXY_OPEN_PRODUCT' || type === 'LEXI_OPEN_PRODUCT') {
                    const productId = String(data.productId || '').trim();
                    if (!productId) return;
                    navigate(`/product/${productId}`);
                    return;
                }

                if (type !== 'LEXY_SEARCH' && type !== 'LEXI_SEARCH') return;

                const query = String(data.query || '').trim();
                if (!query) return;

                setKeyword(query);
                performSearch(query);
            } catch {
                // ignore
            }
        };

        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, [performSearch]);

    const getSpeechRecognitionCtor = () => {
        return window.SpeechRecognition || window.webkitSpeechRecognition || null;
    };

    // Close suggestions when clicking outside the search container
    useEffect(() => {
        const onPointerDown = (e) => {
            const target = e.target;
            if (!containerRef.current) return;
            if (!containerRef.current.contains(target)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', onPointerDown, true);
        document.addEventListener('touchstart', onPointerDown, true);
        return () => {
            document.removeEventListener('mousedown', onPointerDown, true);
            document.removeEventListener('touchstart', onPointerDown, true);
        };
    }, []);

    const runImageSearch = async (file) => {
        if (!file || isImageSearching || isRecording) return;

        setIsImageSearching(true);
        let lastError = '';

        try {
            const formData = new FormData();
            formData.append('image', file, file.name || 'search-image');

            const res = await fetch('/api/v1/image-search', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json().catch(() => null);
            if (!res.ok) {
                const msg = data?.message || data?.error || 'Image search failed. Please try again.';
                lastError = msg;
                return;
            }

            const query = String(data?.query || '').trim();
            if (!query) {
                lastError = 'Could not extract a search keyword from that image. Please try a clearer image.';
                return;
            }

            setKeyword(query);
            performSearch(query);
        } catch (err) {
            const msg = String(err?.message || '');
            if (msg.toLowerCase().includes('failed to fetch')) {
                lastError = 'Cannot reach the server for image search. Make sure the backend is running on http://localhost:4000.';
            } else {
                lastError = 'Image search failed. Please try again.';
            }
        } finally {
            setIsImageSearching(false);
            if (imageInputRef.current) {
                // allow selecting the same file again
                imageInputRef.current.value = '';
            }
            if (lastError) alert(lastError);
        }
    };

    const playMicOpenSound = async () => {
        // Lightweight “mic open” chirp using Web Audio (no asset files).
        try {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return;
            const ctx = audioContextRef.current || new Ctx();
            audioContextRef.current = ctx;

            // Ensure audio can start after user gesture.
            if (ctx.state === 'suspended') {
                await ctx.resume();
            }

            const now = ctx.currentTime;

            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();

            osc1.type = 'sine';
            osc2.type = 'sine';

            // Two quick tones similar to Google-ish “start listening” feedback.
            osc1.frequency.setValueAtTime(880, now);
            osc2.frequency.setValueAtTime(1175, now + 0.06);

            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.exponentialRampToValueAtTime(0.06, now + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);

            osc1.start(now);
            osc1.stop(now + 0.08);
            osc2.start(now + 0.06);
            osc2.stop(now + 0.18);
        } catch {
            // ignore
        }
    };

    const startRecording = async ({ isRetry = false } = {}) => {
        if (isRecording) return;

        const Ctor = getSpeechRecognitionCtor();
        if (!Ctor) {
            alert('Voice search is not supported in this browser. Please use Chrome or Edge.');
            return;
        }

        stopRequestedRef.current = false;
        if (!isRetry) noSpeechRetryRef.current = 0;

        // Signal other voice consumers (Lexy wake word) to release the mic
        window.dispatchEvent(new CustomEvent('lexy:searchbar:voice', { detail: { active: true } }));

        // Small delay so the wake listener has time to abort its recognition
        await new Promise((r) => setTimeout(r, 120));

        await playMicOpenSound();

        // Preflight permission once so the browser shows a proper mic prompt.
        // (SpeechRecognition errors can be vague without this.)
        if (!micPermissionGrantedRef.current) {
            try {
                if (navigator.mediaDevices?.getUserMedia) {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    stream.getTracks().forEach((t) => t.stop());
                    micPermissionGrantedRef.current = true;
                }
            } catch (e) {
                const name = String(e?.name || '').toLowerCase();
                if (name.includes('notallowed') || name.includes('permission')) {
                    alert('Microphone permission denied. Please allow mic access and try again.');
                } else {
                    alert('Microphone is not available. Please check your device settings and try again.');
                }
                return;
            }
        }

        try {
            const recognition = new Ctor();
            speechRecognitionRef.current = recognition;
            lastFinalTranscriptRef.current = '';

            recognition.continuous = false;
            recognition.interimResults = true;
            recognition.maxAlternatives = 1;
            recognition.lang = navigator.language || 'en-US';

            recognition.onstart = () => {
                setIsRecording(true);
            };

            recognition.onerror = (event) => {
                const err = String(event?.error || '').toLowerCase();

                // If the user clicked stop, Chrome often fires `aborted`.
                if (err === 'aborted') {
                    setIsRecording(false);
                    return;
                }

                if (err.includes('not-allowed') || err.includes('permission') || err.includes('service-not-allowed')) {
                    setIsRecording(false);
                    alert('Microphone permission denied. Please allow mic access and try again.');
                    return;
                }

                if (err === 'no-speech') {
                    // Common when the user starts speaking a bit late.
                    // Retry once automatically to make UX smoother.
                    if (!stopRequestedRef.current && noSpeechRetryRef.current < 1) {
                        noSpeechRetryRef.current += 1;
                        try {
                            recognition.abort();
                        } catch {
                            // ignore
                        }
                        setIsRecording(false);
                        setTimeout(() => {
                            if (stopRequestedRef.current) return;
                            startRecording({ isRetry: true });
                        }, 250);
                        return;
                    }

                    setIsRecording(false);
                    alert('No voice detected. Please speak clearly and try again.');
                    return;
                }

                if (err === 'audio-capture') {
                    setIsRecording(false);
                    alert('No microphone was found. Please connect/enable a mic and try again.');
                    return;
                }

                if (err === 'network') {
                    setIsRecording(false);
                    alert('Speech service is unavailable (network error). Please check your internet connection and try again.');
                    return;
                }

                setIsRecording(false);
                alert('Voice recognition failed. Please try again.');
            };

            recognition.onresult = (event) => {
                try {
                    let interim = '';
                    let finalText = '';

                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        const res = event.results[i];
                        const transcript = String(res?.[0]?.transcript || '');
                        if (!transcript) continue;

                        if (res.isFinal) {
                            finalText += transcript;
                        } else {
                            interim += transcript;
                        }
                    }

                    const cleanedFinal = String(finalText || '').trim();
                    if (cleanedFinal) {
                        lastFinalTranscriptRef.current = cleanedFinal;
                        setKeyword(cleanedFinal);
                    } else {
                        const cleanedInterim = String(interim || '').trim();
                        if (cleanedInterim) setKeyword(cleanedInterim);
                    }
                } catch {
                    // ignore
                }
            };

            recognition.onend = () => {
                setIsRecording(false);
                window.dispatchEvent(new CustomEvent('lexy:searchbar:voice', { detail: { active: false } }));
                const text = String(lastFinalTranscriptRef.current || '').trim();
                if (!text) {
                    // No final text captured; keep whatever interim the user saw.
                    return;
                }

                // Auto-search after voice input.
                performSearch(text);
            };

            recognition.start();
        } catch (err) {
            setIsRecording(false);
            alert('Could not start voice recognition. Please try again.');
        }
    };

    const stopRecording = () => {
        stopRequestedRef.current = true;
        const recognition = speechRecognitionRef.current;
        if (!recognition) {
            setIsRecording(false);
            return;
        }

        try {
            recognition.stop();
        } catch {
            setIsRecording(false);
            speechRecognitionRef.current = null;
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        performSearch(keyword);
    }

    useEffect(() => {
        return () => {
            // Cleanup on unmount
            try {
                speechRecognitionRef.current?.abort?.();
            } catch {
                // ignore
            }
        };
    }, []);

    const isVoiceActive = isRecording;
    const isBusy = isVoiceActive || isImageSearching;

    const hasKeyword = Boolean((keyword || '').trim());
    const hasSuggestions = suggestions && suggestions.length > 0;
    const hasRecentSearches = recentSearches && recentSearches.length > 0;
    const hasTrending = trending && trending.length > 0;

    // Fetch trending searches once when the search bar is first focused
    const fetchTrending = useCallback(async () => {
        if (trendingFetchedRef.current) return;
        trendingFetchedRef.current = true;
        try {
            const res = await fetch('/api/v1/products/suggest?keyword=');
            const data = await res.json().catch(() => null);
            if (data?.success && Array.isArray(data.trending)) {
                setTrending(data.trending);
            }
        } catch {
            // ignore
        }
    }, []);

    // Fetch product suggestions as the user types
    useEffect(() => {
        const trimmed = (keyword || '').trim();

        if (!trimmed) {
            // reset when input cleared
            setSuggestions([]);
            setDidYouMean(null);
            setIsLoadingSuggestions(false);
            return;
        }

        // Require at least 2 characters to avoid unnecessary network calls
        if (trimmed.length < 2) {
            suggestionAbortRef.current?.abort?.();
            setSuggestions([]);
            setIsLoadingSuggestions(false);
            return;
        }

        const controller = new AbortController();
        suggestionAbortRef.current?.abort?.();
        suggestionAbortRef.current = controller;

        setIsLoadingSuggestions(true);

        const timeoutId = setTimeout(async () => {
            try {
                const res = await fetch(`/api/v1/products/suggest?keyword=${encodeURIComponent(trimmed)}`, {
                    signal: controller.signal,
                });
                const data = await res.json().catch(() => null);
                if (!res.ok || !data || data.success !== true || !Array.isArray(data.suggestions)) {
                    if (!controller.signal.aborted) {
                        setSuggestions([]);
                        setDidYouMean(null);
                    }
                    return;
                }
                if (!controller.signal.aborted) {
                    setSuggestions(data.suggestions);
                    setDidYouMean(data.didYouMean || null);
                }
            } catch (e) {
                if (controller.signal.aborted) return;
                setSuggestions([]);
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoadingSuggestions(false);
                }
            }
        }, 220);

        return () => {
            clearTimeout(timeoutId);
            controller.abort();
        };
    }, [keyword]);

    return (
        <form
            ref={containerRef}
            onSubmit={handleSubmit}
            className="relative w-full sm:w-9/12 px-3 sm:px-4 py-2 flex justify-between items-center shadow-md bg-white rounded-sm"
        >
            <input
                ref={inputRef}
                value={keyword}
                onChange={(e) => {
                    setKeyword(e.target.value);
                    setShowDropdown(true);
                }}
                onFocus={() => {
                    fetchTrending();
                    if (hasRecentSearches || hasSuggestions || hasTrending) setShowDropdown(true);
                }}
                className="text-sm font-brandSerif flex-1 outline-none border-none placeholder-gray-500"
                type="text"
                placeholder="Search mascara ..."
            />
            <div className="flex items-center gap-3">
                <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => runImageSearch(e.target.files?.[0])}
                />
                <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={isBusy}
                    className={isImageSearching ? 'text-primary-yellow' : 'text-primary-blue'}
                    aria-label="Search by image"
                    title="Search by image"
                >
                    <span className="relative inline-flex items-center justify-center">
                        {isImageSearching && (
                            <>
                                <span className="absolute inline-flex h-9 w-9 rounded-full bg-primary-yellow/30 animate-ping" />
                                <span className="absolute inline-flex h-9 w-9 rounded-full bg-primary-yellow/20" />
                            </>
                        )}
                        <ImageSearchIcon />
                    </span>
                </button>
                <button
                    type="button"
                    onClick={() => (isRecording ? stopRecording() : startRecording())}
                    disabled={isImageSearching}
                    className={isVoiceActive ? 'text-primary-yellow' : 'text-primary-blue'}
                    aria-label={isRecording ? 'Stop voice search' : 'Start voice search'}
                    title={isRecording ? 'Stop voice search' : 'Start voice search'}
                >
                    <span className="relative inline-flex items-center justify-center">
                        {isVoiceActive && (
                            <>
                                <span className="absolute inline-flex h-9 w-9 rounded-full bg-primary-yellow/30 animate-ping" />
                                <span className="absolute inline-flex h-9 w-9 rounded-full bg-primary-yellow/20" />
                            </>
                        )}
                        <MicIcon />
                    </span>
                </button>
            </div>

            {showDropdown && (hasRecentSearches || hasKeyword || hasTrending) && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-xl z-50 max-h-80 overflow-auto text-sm">
                    {/* ── Empty state: Recent + Trending ───────────────── */}
                    {!hasKeyword && (
                        <>
                            {hasRecentSearches && (
                                <div className="py-1">
                                    <div className="px-3 pt-2 pb-2 text-[11px] uppercase tracking-widest text-primary-grey/90">Recent searches</div>
                                    {recentSearches.map((term) => (
                                        <div
                                            key={term}
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => {
                                                setKeyword(term);
                                                performSearch(term);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    setKeyword(term);
                                                    performSearch(term);
                                                }
                                            }}
                                            className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                                        >
                                            <span className="flex items-center gap-2 flex-1 truncate text-primary-darkBlue">
                                                <span className="text-gray-400 text-xs">&#128337;</span>
                                                {term}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeRecentSearch(term);
                                                }}
                                                className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                                                aria-label="Remove from recent searches"
                                            >
                                                <span className="text-xs leading-none">×</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {hasTrending && (
                                <div className={hasRecentSearches ? "py-1 border-t border-gray-100" : "py-1"}>
                                    <div className="px-3 pt-2 pb-2 text-[11px] uppercase tracking-widest text-primary-grey/90">&#128293; Trending</div>
                                    {trending.map((t) => (
                                        <button
                                            key={t.keyword}
                                            type="button"
                                            onClick={() => {
                                                setKeyword(t.keyword);
                                                performSearch(t.keyword);
                                            }}
                                            className="w-full text-left px-3 py-2 hover:bg-gray-50 text-primary-darkBlue flex items-center gap-2"
                                        >
                                            <span className="text-gray-400 text-xs">&#8599;</span>
                                            <span className="truncate">{t.keyword}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {/* ── Keyword suggestions grouped by category ──────── */}
                    {hasKeyword && (
                        <div className="py-1 bg-white">
                            {/* Did you mean? */}
                            {didYouMean && (
                                <div className="px-3 py-2 border-b border-gray-100">
                                    <span className="text-xs text-primary-grey">Did you mean: </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setKeyword(didYouMean);
                                            performSearch(didYouMean);
                                        }}
                                        className="text-xs text-primary-blue font-semibold hover:underline"
                                    >
                                        {didYouMean}
                                    </button>
                                    <span className="text-xs text-primary-grey">?</span>
                                </div>
                            )}

                            <div className="px-3 pt-2 pb-2 text-[11px] uppercase tracking-widest text-primary-grey/90">Suggestions</div>
                            {isLoadingSuggestions && (
                                <div className="px-3 pb-2 text-xs text-primary-grey">Searching…</div>
                            )}
                            {!isLoadingSuggestions && hasSuggestions && suggestions.map((s, i) => {
                                const kw = s?.keyword || '';
                                const cat = s?.category || '';
                                return (
                                    <button
                                        key={`${kw}-${cat}-${i}`}
                                        type="button"
                                        onClick={() => {
                                            setKeyword(kw);
                                            performSearch(kw);
                                        }}
                                        className="w-full text-left px-3 py-2 hover:bg-gray-50 text-primary-darkBlue flex items-center justify-between gap-2"
                                    >
                                        <span className="flex items-center gap-2 truncate">
                                            <span className="text-gray-400 text-xs">&#128269;</span>
                                            <span className="truncate">{kw}</span>
                                        </span>
                                        {cat && (
                                            <span className="text-[10px] uppercase tracking-wider text-primary-grey bg-gray-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                                                in {cat}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                            {!isLoadingSuggestions && !hasSuggestions && !didYouMean && (
                                <div className="px-3 pb-2 text-xs text-primary-grey">No suggestions found.</div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </form>
    );
};

export default Searchbar;
