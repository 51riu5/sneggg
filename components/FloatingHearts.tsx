"use client";
import { useEffect, useRef } from "react";

const glyphs = ["❤", "♡", "❤", "♥", "❤︎"];

export default function FloatingHearts() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = ref.current;
    if (!layer) return;
    const spawn = () => {
      const h = document.createElement("span");
      h.className = "heart";
      h.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
      const size = 12 + Math.random() * 20;
      h.style.fontSize = size + "px";
      h.style.left = Math.random() * 100 + "vw";
      h.style.bottom = "-20px";
      const duration = 9 + Math.random() * 7;
      h.style.animationDuration = duration + "s";
      const hue = 320 + Math.random() * 40;
      h.style.color = `hsl(${hue}, 70%, 70%)`;
      layer.appendChild(h);
      setTimeout(() => h.remove(), duration * 1000);
    };
    const i = setInterval(spawn, 900);
    return () => clearInterval(i);
  }, []);

  return <div ref={ref} className="hearts-layer" aria-hidden="true" />;
}
