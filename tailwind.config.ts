import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#3a1f2a",
          soft: "#6b4a58",
          mute: "#9c7c8a"
        },
        accent: {
          DEFAULT: "#e86a8f",
          soft: "#f0a7b8",
          lav: "#b189c9",
          gold: "#d8a75c"
        },
        cream: "#fff9f2",
        bg: {
          0: "#fff5f5",
          1: "#ffe9ef",
          2: "#ffd6e2"
        }
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', "serif"],
        script: ['"Dancing Script"', "cursive"],
        sans: ['"Inter"', "system-ui", "sans-serif"]
      },
      boxShadow: {
        soft: "0 10px 40px rgba(232, 106, 143, 0.15)",
        lift: "0 20px 60px rgba(232, 106, 143, 0.22)"
      },
      keyframes: {
        heartBeat: {
          "0%, 100%": { transform: "scale(1)" },
          "15%": { transform: "scale(1.25)" },
          "30%": { transform: "scale(1)" },
          "45%": { transform: "scale(1.2)" }
        },
        shimmer: {
          "0%, 100%": { backgroundPosition: "0% center" },
          "50%": { backgroundPosition: "100% center" }
        },
        floatUp: {
          "0%": { transform: "translateY(0) scale(0.4)", opacity: "0" },
          "10%": { opacity: "1" },
          "100%": { transform: "translateY(-110vh) scale(1.2) rotate(30deg)", opacity: "0" }
        },
        blobDrift: {
          "0%, 100%": { transform: "translate(0,0) scale(1)" },
          "33%": { transform: "translate(40px,-30px) scale(1.08)" },
          "66%": { transform: "translate(-30px,40px) scale(0.96)" }
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        heartBeat: "heartBeat 1.4s ease-in-out infinite",
        shimmer: "shimmer 6s ease-in-out infinite",
        floatUp: "floatUp 2.8s ease-out forwards",
        blobDrift: "blobDrift 22s ease-in-out infinite",
        fadeUp: "fadeUp 1s cubic-bezier(.22,1,.36,1) forwards"
      }
    }
  },
  plugins: []
} satisfies Config;
