import { useCallback, useEffect, useRef, useState } from 'react';

// Web Speech API types are partially missing in lib.dom; cast as any.
type SR = any;

export function useVoiceChat(opts?: { lang?: string }) {
  const lang = opts?.lang || 'en-ZW';
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [interim, setInterim] = useState('');
  const recognitionRef = useRef<SR | null>(null);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSupported(!!SR && 'speechSynthesis' in window);
  }, []);

  const safetyTimer = useRef<number | null>(null);

  const stop = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch { /* noop */ }
    if (safetyTimer.current) { window.clearTimeout(safetyTimer.current); safetyTimer.current = null; }
    setListening(false);
  }, []);

  const start = useCallback((onFinal: (text: string) => void) => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const r: SR = new SR();
    r.lang = lang;
    r.interimResults = true;
    r.continuous = false;
    r.onresult = (e: any) => {
      let final = '';
      let int = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t; else int += t;
      }
      setInterim(int);
      if (final) {
        setInterim('');
        onFinal(final.trim());
      }
    };
    r.onend = () => {
      if (safetyTimer.current) { window.clearTimeout(safetyTimer.current); safetyTimer.current = null; }
      setListening(false);
      setInterim('');
    };
    r.onerror = () => {
      if (safetyTimer.current) { window.clearTimeout(safetyTimer.current); safetyTimer.current = null; }
      setListening(false);
      setInterim('');
    };
    recognitionRef.current = r;
    setListening(true);
    try { r.start(); } catch { setListening(false); }
    // Safety: stop after 15s of listening even if browser hangs
    safetyTimer.current = window.setTimeout(() => stop(), 15000);
  }, [lang, stop]);

  useEffect(() => () => stop(), [stop]);

  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    // Strip markdown + confirm markers for natural speech
    const clean = text
      .replace(/\[\[CONFIRM:[^\]]+\]\]/g, '')
      .replace(/[*_`#>]/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .trim();
    if (!clean) return;
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = lang;
    u.rate = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }, [lang]);

  return { listening, supported, interim, start, stop, speak };
}
