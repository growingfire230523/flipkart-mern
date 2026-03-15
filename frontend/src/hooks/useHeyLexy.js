/**
 * useHeyLexy — "Hey Lexy" wake word detection.
 *
 * Uses the Web Speech API in continuous mode, listening for a trigger phrase.
 * Opt-in only (user must enable). Stops automatically when chat opens.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'lexyWakeWord:enabled';
const WAKE_PHRASES = ['hey lexy', 'hey lexi', 'hey lexie', 'hay lexy', 'hay lexi', 'alexy', 'hey alexy'];

const getSpeechCtor = () =>
    window.SpeechRecognition || window.webkitSpeechRecognition || null;

const useHeyLexy = ({ onWake }) => {
    const [wakeEnabled, setWakeEnabled] = useState(() => {
        try {
            return localStorage.getItem(STORAGE_KEY) === 'true';
        } catch {
            return false;
        }
    });
    const [wakeListening, setWakeListening] = useState(false);

    const recognitionRef = useRef(null);
    const onWakeRef = useRef(onWake);
    const restartTimerRef = useRef(null);

    // Keep callback ref fresh
    useEffect(() => {
        onWakeRef.current = onWake;
    }, [onWake]);

    // Persist toggle
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, String(wakeEnabled));
        } catch { /* */ }
    }, [wakeEnabled]);

    const toggleWake = useCallback(() => setWakeEnabled((v) => !v), []);

    const stopWakeListener = useCallback(() => {
        if (restartTimerRef.current) {
            clearTimeout(restartTimerRef.current);
            restartTimerRef.current = null;
        }
        const r = recognitionRef.current;
        if (r) {
            try { r.abort(); } catch { /* */ }
            recognitionRef.current = null;
        }
        setWakeListening(false);
    }, []);

    const startWakeListener = useCallback(() => {
        const Ctor = getSpeechCtor();
        if (!Ctor) return;

        // Stop any existing instance
        if (recognitionRef.current) {
            try { recognitionRef.current.abort(); } catch { /* */ }
        }

        // Per-instance flag — old recognition's deferred onerror can't corrupt this
        let wasAborted = false;

        const recognition = new Ctor();
        recognitionRef.current = recognition;

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognition.lang = navigator.language || 'en-US';

        recognition.onstart = () => setWakeListening(true);

        recognition.onresult = (event) => {
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const text = String(event.results[i]?.[0]?.transcript || '').toLowerCase().trim();
                const matched = WAKE_PHRASES.some((p) => text.includes(p));
                if (matched) {
                    // Wake word detected
                    try { recognition.stop(); } catch { /* */ }
                    recognitionRef.current = null;
                    setWakeListening(false);
                    if (onWakeRef.current) onWakeRef.current();
                    return;
                }
            }
        };

        recognition.onerror = (event) => {
            const err = String(event?.error || '').toLowerCase();
            if (err === 'aborted') {
                // Aborted by stopWakeListener() or another SpeechRecognition — don't restart
                wasAborted = true;
                return;
            }
            if (err === 'no-speech') {
                // Normal silence timeout — will restart via onend
                return;
            }
            // For other errors, stop wake listener
            setWakeListening(false);
        };

        recognition.onend = () => {
            setWakeListening(false);
            // Auto-restart ONLY after natural silence timeout, not after abort
            if (recognitionRef.current === recognition && !wasAborted) {
                restartTimerRef.current = setTimeout(() => {
                    startWakeListener();
                }, 500);
            }
        };

        try {
            recognition.start();
        } catch {
            setWakeListening(false);
        }
    }, []);

    // Pause wake listener when Searchbar voice search is active
    const searchbarActiveRef = useRef(false);
    useEffect(() => {
        const handler = (e) => {
            const active = !!e?.detail?.active;
            searchbarActiveRef.current = active;
            if (active) {
                stopWakeListener();
            } else if (wakeEnabled) {
                // Small delay to let the browser release the mic
                setTimeout(() => {
                    if (!searchbarActiveRef.current && wakeEnabled) startWakeListener();
                }, 600);
            }
        };
        window.addEventListener('lexy:searchbar:voice', handler);
        return () => window.removeEventListener('lexy:searchbar:voice', handler);
    }, [wakeEnabled, startWakeListener, stopWakeListener]);

    // Start/stop based on wakeEnabled
    useEffect(() => {
        if (wakeEnabled) {
            startWakeListener();
        } else {
            stopWakeListener();
        }
        return () => stopWakeListener();
    }, [wakeEnabled, startWakeListener, stopWakeListener]);

    return { wakeEnabled, wakeListening, toggleWake, stopWakeListener, startWakeListener };
};

export default useHeyLexy;
