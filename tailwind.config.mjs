/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        warsaw: ["var(--font-warsaw)"],
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",

        // Legacy — still used by src/app/torneos, src/app/auth/register,
        // src/components/seeRankingButton.js. Do not remove.
        "tekken-pink": "#F50A64",

        primary: {
          50: "rgb(var(--color-primary-50) / <alpha-value>)",
          100: "rgb(var(--color-primary-100) / <alpha-value>)",
          200: "rgb(var(--color-primary-200) / <alpha-value>)",
          300: "rgb(var(--color-primary-300) / <alpha-value>)",
          400: "rgb(var(--color-primary-400) / <alpha-value>)",
          500: "rgb(var(--color-primary-500) / <alpha-value>)",
          600: "rgb(var(--color-primary-600) / <alpha-value>)",
          700: "rgb(var(--color-primary-700) / <alpha-value>)",
          800: "rgb(var(--color-primary-800) / <alpha-value>)",
          900: "rgb(var(--color-primary-900) / <alpha-value>)",
        },
        "tekken-blue": {
          50: "rgb(var(--color-tekken-blue-50) / <alpha-value>)",
          100: "rgb(var(--color-tekken-blue-100) / <alpha-value>)",
          200: "rgb(var(--color-tekken-blue-200) / <alpha-value>)",
          300: "rgb(var(--color-tekken-blue-300) / <alpha-value>)",
          400: "rgb(var(--color-tekken-blue-400) / <alpha-value>)",
          500: "rgb(var(--color-tekken-blue-500) / <alpha-value>)",
          600: "rgb(var(--color-tekken-blue-600) / <alpha-value>)",
          700: "rgb(var(--color-tekken-blue-700) / <alpha-value>)",
          800: "rgb(var(--color-tekken-blue-800) / <alpha-value>)",
          900: "rgb(var(--color-tekken-blue-900) / <alpha-value>)",
        },
        "dark-gray-3": {
          50: "rgb(var(--color-dark-gray-3-50) / <alpha-value>)",
          100: "rgb(var(--color-dark-gray-3-100) / <alpha-value>)",
          200: "rgb(var(--color-dark-gray-3-200) / <alpha-value>)",
          300: "rgb(var(--color-dark-gray-3-300) / <alpha-value>)",
          400: "rgb(var(--color-dark-gray-3-400) / <alpha-value>)",
          500: "rgb(var(--color-dark-gray-3-500) / <alpha-value>)",
          600: "rgb(var(--color-dark-gray-3-600) / <alpha-value>)",
          700: "rgb(var(--color-dark-gray-3-700) / <alpha-value>)",
          800: "rgb(var(--color-dark-gray-3-800) / <alpha-value>)",
          900: "rgb(var(--color-dark-gray-3-900) / <alpha-value>)",
        },
        success: "rgb(var(--color-success-500) / <alpha-value>)",
        warning: "rgb(var(--color-warning-500) / <alpha-value>)",
        error: "rgb(var(--color-error-500) / <alpha-value>)",
      },
      borderRadius: {
        none: "0px",
        pill: "30px",
      },
      boxShadow: {
        "glow-primary":
          "0 2px 20px rgba(245,10,100,.5), 0 6px 15px rgba(245,10,100,.25)",
        "glow-cyan": "0 2px 20px rgba(63,209,231,.5)",
      },
      keyframes: {
        glowPulse: { "0%, 100%": { opacity: 0.55 }, "50%": { opacity: 0.9 } },
        fadeUp: {
          from: { opacity: 0, transform: "translateY(24px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        ringSpin: {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        ringSpinRev: {
          from: { transform: "rotate(360deg)" },
          to: { transform: "rotate(0deg)" },
        },
        ringPulse: {
          "0%, 100%": { opacity: 0.5, transform: "scale(1)" },
          "50%": { opacity: 1, transform: "scale(1.07)" },
        },
        dotBlink: { "0%, 100%": { opacity: 1 }, "50%": { opacity: 0.12 } },
        textGlitch: {
          "0%, 92%, 100%": {
            clipPath: "inset(0 0 0 0)",
            transform: "translateX(0)",
          },
          "94%": {
            clipPath: "inset(18% 0 62% 0)",
            transform: "translateX(-4px)",
          },
          "96%": {
            clipPath: "inset(58% 0 22% 0)",
            transform: "translateX(5px)",
          },
          "98%": {
            clipPath: "inset(38% 0 44% 0)",
            transform: "translateX(-2px)",
          },
        },
        barShimmer: {
          "0%": { transform: "translateX(-140%)" },
          "100%": { transform: "translateX(340%)" },
        },
        heroSweep: {
          "0%": { transform: "translateX(-60%) rotate(-16deg)" },
          "55%, 100%": { transform: "translateX(260%) rotate(-16deg)" },
        },
        heroFloat: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        heroInLeft: {
          from: { opacity: 0, transform: "translateX(-90px) scale(.98)" },
          to: { opacity: 1, transform: "translateX(0) scale(1)" },
        },
        heroInRight: {
          from: { opacity: 0, transform: "translateX(90px) scale(.98)" },
          to: { opacity: 1, transform: "translateX(0) scale(1)" },
        },
        cueBounce: {
          "0%, 100%": { transform: "translateY(0)", opacity: 0.5 },
          "50%": { transform: "translateY(8px)", opacity: 1 },
        },
        lineGrow: {
          from: { transform: "scaleX(0)" },
          to: { transform: "scaleX(1)" },
        },
        pulseDot: {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.25 },
        },
        cardIn: {
          from: { opacity: 0, transform: "translateY(8px)" },
          to: { opacity: 1, transform: "none" },
        },
        glitch404: {
          "0%, 88%, 100%": {
            transform: "translate(0,0)",
            opacity: 1,
            textShadow: "0 4px 30px rgba(0,0,0,.85)",
          },
          "89%": {
            transform: "translate(-4px,2px)",
            opacity: 0.92,
            textShadow:
              "3px 0 rgb(var(--color-tekken-blue-400)), -3px 0 rgb(var(--color-primary-500))",
          },
          "90%": {
            transform: "translate(3px,-2px)",
            opacity: 0.95,
            textShadow:
              "-3px 0 rgb(var(--color-tekken-blue-400)), 3px 0 rgb(var(--color-primary-500))",
          },
          "91%": {
            transform: "translate(-2px,0)",
            opacity: 0.9,
            textShadow:
              "2px 0 rgb(var(--color-tekken-blue-400)), -2px 0 rgb(var(--color-primary-500))",
          },
          "92%": {
            transform: "translate(0,0)",
            opacity: 1,
            textShadow: "0 4px 30px rgba(0,0,0,.85)",
          },
        },
        koStamp: {
          "0%": { transform: "scale(2.6) rotate(-8deg)", opacity: 0 },
          "60%": { transform: "scale(.94) rotate(-8deg)", opacity: 1 },
          "80%": { transform: "scale(1.04) rotate(-8deg)" },
          "100%": { transform: "scale(1) rotate(-8deg)", opacity: 1 },
        },
      },
      animation: {
        "glow-pulse": "glowPulse 7s ease-in-out infinite",
        "fade-up": "fadeUp .6s cubic-bezier(.4,0,.2,1) both",
        "ring-spin": "ringSpin 2.2s linear infinite",
        "ring-spin-rev": "ringSpinRev 6s linear infinite",
        "ring-pulse": "ringPulse 2.6s ease-in-out infinite",
        "dot-blink": "dotBlink 1s steps(1,end) infinite",
        "text-glitch": "textGlitch 3.4s steps(1,end) infinite",
        "bar-shimmer": "barShimmer 1.7s linear infinite",
        "hero-sweep": "heroSweep 9s cubic-bezier(.4,0,.2,1) infinite",
        "hero-float": "heroFloat 8s ease-in-out infinite",
        "hero-in-left": "heroInLeft 1.2s cubic-bezier(.16,.84,.24,1) both",
        "hero-in-right": "heroInRight 1.2s cubic-bezier(.16,.84,.24,1) both",
        "cue-bounce": "cueBounce 2.2s ease-in-out infinite",
        "line-grow": "lineGrow .9s cubic-bezier(.16,.84,.24,1) both",
        "pulse-dot": "pulseDot 2s ease-in-out infinite",
        "card-in": "cardIn .35s cubic-bezier(.4,0,.2,1) both",
        "glitch-404": "glitch404 5s ease-in-out .6s infinite",
        "ko-stamp": "koStamp .7s cubic-bezier(.16,.84,.24,1) both",
      },
    },
  },
};
