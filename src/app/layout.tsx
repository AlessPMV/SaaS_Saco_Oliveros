import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Colegio Saco Oliveros — Sede Huancayo",
  description: "Sistema SaaS de gestión académica y administrativa del Colegio Saco Oliveros, Sede Huancayo.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
