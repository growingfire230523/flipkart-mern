/**
 * useLexyVoice — speech-to-text hook for Lexy AI chat.
 *
 * Uses the browser Web Speech API (free, instant) with auto-retry on silence.
 * Exposes start / stop / transcript / listening state.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

const getSpeechCtor = () =>
    window.SpeechRecognition || window.webkitSpeechRecognition || null;

const playChirp = async (ctxRef) => {
    try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        const ctx = ctxRef.current || new Ctx();
        ctxRef.current = ctx;
        if (ctx.state === 'suspended') await ctx.resume();

        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.type = 'sine';
        osc2.type = 'sine';
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

const useLexyVoice = () => {
    const [listening, setListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [supported, setSupported] = useState(true);

    const recognitionRef = useRef(null);
    const audioCtxRef = useRef(null);
    const micGrantedRef = useRef(false);
    const stopRequestedRef = useRef(false);
    const retryCountRef = useRef(0);
    const onFinalRef = useRef(null);      // callback when final transcript is ready

    useEffect(() => {
        setSupported(!!getSpeechCtor());
    }, []);

    const stop = useCallback(() => {
        stopRequestedRef.current = true;
        const r = recognitionRef.current;
        if (r) {
            try { r.stop(); } catch { /* */ }
        }
        setListening(false);
    }, []);

    const start = useCallback(
        /**
         * @param {{ onFinal?: (text: string) => void, isRetry?: boolean }} opts
         */
        async (opts = {}) => {
            const { onFinal, isRetry = false } = opts;
            if (listening && !isRetry) return;

            const Ctor = getSpeechCtor();
            if (!Ctor) {
                setSupported(false);
                return;
            }

            stopRequestedRef.current = false;
            if (!isRetry) {
                retryCountRef.current = 0;
                setTranscript('');
            }
            if (onFinal) onFinalRef.current = onFinal;

            await playChirp(audioCtxRef);

            // Pre-flight mic permission
            if (!micGrantedRef.current) {
                try {
                    if (navigator.mediaDevices?.getUserMedia) {
                        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                        stream.getTracks().forEach((t) => t.stop());
                        micGrantedRef.current = true;
                    }
                } catch {
                    return; // silently fail — no mic
                }
            }

            try {
                const recognition = new Ctor();
                recognitionRef.current = recognition;

                recognition.continuous = false;
                recognition.interimResults = true;
                recognition.maxAlternatives = 1;
                recognition.lang = navigator.language || 'en-US';

                let finalText = '';

                recognition.onstart = () => setListening(true);

                recognition.onresult = (event) => {
                    let interim = '';
                    let captured = '';
                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        const t = String(event.results[i]?.[0]?.transcript || '');
                        if (event.results[i].isFinal) {
                            captured += t;
                        } else {
                            interim += t;
                        }
                    }
                    if (captured.trim()) {
                        finalText = captured.trim();
                        setTranscript(finalText);
                    } else if (interim.trim()) {
                        setTranscript(interim.trim());
                    }
                };

                recognition.onerror = (event) => {
                    const err = String(event?.error || '').toLowerCase();
                    if (err === 'aborted') {
                        setListening(false);
                        return;
                    }
                    if (err === 'no-speech' && !stopRequestedRef.current && retryCountRef.current < 1) {
                        retryCountRef.current += 1;
                        try { recognition.abort(); } catch { /* */ }
                        setListening(false);
                        setTimeout(() => {
                            if (!stopRequestedRef.current) start({ isRetry: true });
                        }, 250);
                        return;
                    }
                    setListening(false);
                };

                recognition.onend = () => {
                    setListening(false);
                    const text = finalText.trim();
                    if (text && onFinalRef.current) {
                        onFinalRef.current(text);
                    }
                };

                recognition.start();
            } catch {
                setListening(false);
            }
        },
        [listening]
    );

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopRequestedRef.current = true;
            const r = recognitionRef.current;
            if (r) { try { r.abort(); } catch { /* */ } }
        };
    }, []);

    return { listening, transcript, supported, start, stop };
};

export default useLexyVoice;
