/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  safelist: [
    "bg-sky-400", "bg-sky-500",
    "bg-cyan-500",
    "bg-emerald-500",
    "bg-violet-400", "bg-violet-500", "bg-violet-600",
    "bg-rose-500",
    "bg-pink-500",
    "bg-red-600",
    "bg-yellow-600",
    "bg-amber-500",
    "bg-lime-500",
    "bg-fuchsia-500",
    "bg-indigo-400",
    "bg-orange-400",
    "shadow-sky-500/50", "shadow-violet-600/50", "shadow-red-600/50",
    "ring-sky-400/80",
  ],
  theme: { extend: {} },
  plugins: [],
};
