/**
 * useLexyTTS — text-to-speech hook for Lexy AI replies.
 *
 * Default: Browser speechSynthesis (free).
 * Toggle: OpenAI TTS via backend endpoint (set LEXY_TTS_PROVIDER=openai in env).
 * User can toggle voice on/off; preference persisted in localStorage.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';

const STORAGE_KEY = 'lexyTTS:enabled';

const useLexyTTS = () => {
    const [enabled, setEnabled] = useState(() => {
        try {
            return localStorage.getItem(STORAGE_KEY) === 'true';
        } catch {
            return false;
        }
    });
    const [speaking, setSpeaking] = useState(false);

    const utteranceRef = useRef(null);
    const audioRef = useRef(null);

    // Persist toggle
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, String(enabled));
        } catch { /* */ }
    }, [enabled]);

    const toggle = useCallback(() => setEnabled((v) => !v), []);

    const cancelSpeech = useCallback(() => {
        // Cancel browser synth
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        // Cancel OpenAI audio
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current = null;
        }
        setSpeaking(false);
    }, []);

    /**
     * Speak text using browser speechSynthesis.
     */
    const speakBrowser = useCallback((text) => {
        if (!window.speechSynthesis || !text) return;

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.05;
        utterance.volume = 0.9;

        // Prefer a female voice for Lexy (cosmetics brand feel)
        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find(
            (v) =>
                v.lang.startsWith('en') &&
                (v.name.toLowerCase().includes('female') ||
                    v.name.toLowerCase().includes('samantha') ||
                    v.name.toLowerCase().includes('zira') ||
                    v.name.toLowerCase().includes('google uk english female'))
        );
        if (preferred) utterance.voice = preferred;

        utterance.onstart = () => setSpeaking(true);
        utterance.onend = () => setSpeaking(false);
        utterance.onerror = () => setSpeaking(false);

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    }, []);

    /**
     * Speak text using OpenAI TTS via backend.
     */
    const speakOpenAI = useCallback(async (text) => {
        if (!text) return;
        setSpeaking(true);
        try {
            const { data } = await axios.post(
                '/api/v1/voice/tts',
                { text },
                { responseType: 'blob', timeout: 15000 }
            );
            const url = URL.createObjectURL(data);
            const audio = new Audio(url);
            audioRef.current = audio;
            audio.onended = () => {
                setSpeaking(false);
                URL.revokeObjectURL(url);
                audioRef.current = null;
            };
            audio.onerror = () => {
                setSpeaking(false);
                URL.revokeObjectURL(url);
                audioRef.current = null;
            };
            await audio.play();
        } catch {
            // Fallback to browser TTS if OpenAI fails
            setSpeaking(false);
            speakBrowser(text);
        }
    }, [speakBrowser]);

    /**
     * Main speak function — picks provider automatically.
     * Only speaks if TTS is enabled.
     */
    const speak = useCallback(
        (text, { force = false } = {}) => {
            if (!enabled && !force) return;
            if (!text) return;

            // Clean text for speech — remove markdown-ish artifacts
            const clean = text
                .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
                .replace(/_{1,2}([^_]+)_{1,2}/g, '$1')
                .replace(/`([^`]+)`/g, '$1')
                .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
                .replace(/#{1,6}\s*/g, '')
                .trim();

            if (!clean) return;

            // Check if OpenAI TTS is configured (an env flag tells frontend)
            const useOpenAI = window.__LEXY_TTS_PROVIDER === 'openai';
            if (useOpenAI) {
                speakOpenAI(clean);
            } else {
                speakBrowser(clean);
            }
        },
        [enabled, speakBrowser, speakOpenAI]
    );

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cancelSpeech();
        };
    }, [cancelSpeech]);

    return { enabled, speaking, toggle, speak, cancelSpeech };
};

export default useLexyTTS;
