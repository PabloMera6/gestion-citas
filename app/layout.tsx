import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MiGym — Entrenadores, clases y reservas",
  description:
    "Calendario de clases, reservas de entrenamientos, tablón de anuncios y horarios de los entrenadores del gimnasio.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans text-text">
        {children}
      </body>
    </html>
  );
}
