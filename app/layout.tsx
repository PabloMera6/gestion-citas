import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MiGym — Reservas y clases",
  description: "Gestión de clases, reservas y entrenadores del gimnasio",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
