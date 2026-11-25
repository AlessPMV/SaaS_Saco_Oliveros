import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Paleta institucional Colegio Saco Oliveros
        blue: { 950: "#0F2C59" }, // Azul Marino (primario)
        red: { 700: "#C8102E" }, // Rojo Carmesí (acento)
        amber: { 600: "#D97706" }, // Ámbar / Dorado (alertas)
        slate: { 50: "#F8FAFC" },
      },
    },
  },
  plugins: [],
};

export default config;
