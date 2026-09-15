"use client";

import { useCallback, useRef, useState } from "react";

// Web Speech API — Chrome/Edge only, and not (yet) part of TypeScript's standard DOM lib, hence
// the minimal shape declared by hand instead of a real type import. Everything past
// getSpeechRecognitionCtor() stays typed against this, rather than `any` leaking further.
type SpeechRecognitionResultLike = { transcript: string };
type SpeechRecognitionEventLike = { results: { 0: { 0: SpeechRecognitionResultLike } } };
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** This is a browser speech simulation of a call (mic → text → the same agent turn → text →
 *  spoken aloud) — NOT a real Vapi phone call. It exists so voice can be demoed reliably from
 *  a laptop with no telephony, no tunnel, and no dependency on Vapi's payload shape (which is
 *  still unverified against a live account, see vapi-client.ts). */
export function isVoiceModeSupported(): boolean {
  return (
    typeof window !== "undefined" && getSpeechRecognitionCtor() !== null && "speechSynthesis" in window
  );
}

export function useVoiceMode(onTranscript: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      onTranscript(event.results[0][0].transcript);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [onTranscript]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel(); // don't let replies overlap if one arrives mid-utterance
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  }, []);

  return { listening, startListening, stopListening, speak };
}
