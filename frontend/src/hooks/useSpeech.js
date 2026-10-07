import { useCallback, useEffect, useRef, useState } from "react";

const SR = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
const hasTTS = typeof window !== "undefined" && "speechSynthesis" in window;

/**
 * Browser speech helpers (no API keys, no server):
 *  - dictate(): speech-to-text with interim results
 *  - speak():   read text aloud
 * Both degrade gracefully: `supported.*` tells the UI whether to show the buttons.
 */
export default function useSpeech() {
  const recRef = useRef(null);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState(null);

  const stop = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      /* already stopped */
    }
    setListening(false);
  }, []);

  /** @param {(final: string, interim: string) => void} onText called as speech is recognised */
  const dictate = useCallback(
    (onText) => {
      if (!SR) return;
      setError(null);
      const rec = new SR();
      rec.lang = navigator.language || "en-US";
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (e) => {
        let finalText = "";
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) finalText += t;
          else interim += t;
        }
        onText(finalText, interim);
      };
      rec.onerror = (e) => {
        setError(e.error === "not-allowed" ? "Microphone permission was blocked." : e.error === "no-speech" ? null : "Voice input stopped unexpectedly.");
        setListening(false);
      };
      rec.onend = () => setListening(false);
      recRef.current = rec;
      try {
        rec.start();
        setListening(true);
      } catch {
        setListening(false);
      }
    },
    []
  );

  const speak = useCallback((text) => {
    if (!hasTTS) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.97;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  }, []);

  const cancelSpeak = useCallback(() => {
    if (hasTTS) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  useEffect(
    () => () => {
      try {
        recRef.current?.abort();
      } catch {
        /* noop */
      }
      if (hasTTS) window.speechSynthesis.cancel();
    },
    []
  );

  return { supported: { stt: !!SR, tts: hasTTS }, listening, speaking, error, dictate, stop, speak, cancelSpeak };
}
