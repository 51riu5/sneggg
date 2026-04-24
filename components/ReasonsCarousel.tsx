"use client";

import { useState, useEffect } from "react";

const REASONS = [
  "because the way you laugh makes the whole room feel kinder.",
  "because even when you're sick, you're still the softest person i know.",
  "because your eyes do that little thing when you're thinking.",
  "because you care about people in a way most people forgot how to.",
  "because your little hums between sentences are my favourite sound.",
  "because you make the ordinary feel special. like chai at 4pm.",
  "because the way you say my name is unmatched, and you know it.",
  "because you remember the small things i say and bring them back weeks later.",
  "because your sleepy voice is a national treasure.",
  "because you're brave even when you don't feel brave.",
  "because you tried to hide that you were in pain — and still went to the doctor.",
  "because you're going to be okay, and i will be right here for every step.",
  "because being your person is the best thing i've been.",
  "because you make tonsillitis look cute somehow. don't ask me how.",
  "because every version of you — tired, sick, hungry, cranky — is still my favourite.",
  "because you are worth every bit of care and then some.",
  "because of the way you hold my hand like you mean it.",
  "because your heart is the softest thing i've ever known.",
  "because you're not alone. not today, not tomorrow, not ever.",
  "because you, snegu, are the whole universe to me."
];

export default function ReasonsCarousel() {
  const [idx, setIdx] = useState(0);
  const [flipping, setFlipping] = useState(false);

  const move = (d: number) => {
    setFlipping(true);
    setTimeout(() => {
      setIdx((p) => (p + d + REASONS.length) % REASONS.length);
      setFlipping(false);
    }, 380);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") move(1);
      if (e.key === "ArrowLeft") move(-1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="card p-6 relative overflow-hidden">
      <p className="kicker">a little reminder</p>
      <h3 className="font-serif text-2xl mt-2 mb-5">reasons i love you</h3>
      <div className="flex items-center gap-3">
        <button
          onClick={() => move(-1)}
          className="w-10 h-10 rounded-full bg-white/80 border border-accent/20 text-accent text-xl hover:bg-accent hover:text-white transition"
          aria-label="previous"
        >
          ‹
        </button>
        <div
          onClick={() => move(1)}
          className={`flex-1 min-h-[140px] rounded-2xl p-6 cursor-pointer text-center flex items-center justify-center bg-gradient-to-br from-white to-accent-soft/30 transition-all duration-500 ${
            flipping ? "opacity-0 rotate-y-180" : ""
          }`}
          style={{ transform: flipping ? "rotateY(180deg)" : "none" }}
        >
          <div>
            <p className="font-script text-3xl text-accent mb-2">{String(idx + 1).padStart(2, "0")}</p>
            <p className="font-serif italic text-lg leading-relaxed">{REASONS[idx]}</p>
          </div>
        </div>
        <button
          onClick={() => move(1)}
          className="w-10 h-10 rounded-full bg-white/80 border border-accent/20 text-accent text-xl hover:bg-accent hover:text-white transition"
          aria-label="next"
        >
          ›
        </button>
      </div>
      <p className="text-center text-[11px] tracking-[0.3em] uppercase text-ink-mute mt-4">
        {idx + 1} of {REASONS.length}
      </p>
    </div>
  );
}
