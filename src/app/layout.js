import { Bebas_Neue, Source_Sans_3 } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import PageTransition from "@/components/ui/PageTransition";
import { Toaster } from "react-hot-toast";

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const sourceSans3 = Source_Sans_3({
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-body",
});

// Kept for src/app/torneos, which still uses font-warsaw explicitly via
// inherited body styling in a few spots — see Global Constraints in the
// implementation plan.
const warsaw = localFont({
  src: [
    {
      path: "../../public/fonts/WarsawGothic.otf",
      weight: "700",
    },
  ],
  variable: "--font-warsaw",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const DESCRIPCION =
  "Ranked de participantes de los torneos de Tekken Warriors Paraguay";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Tekken Warriors PY",
    template: "%s · Tekken Warriors PY",
  },
  description: DESCRIPCION,
  openGraph: {
    title: "Tekken Warriors PY",
    description: DESCRIPCION,
    type: "website",
    locale: "es_PY",
    images: ["/images/LOGO TWPY/PNG/TWPY LOGO VARIANTES-06.png"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body
        className={`${bebasNeue.variable} ${sourceSans3.variable} ${warsaw.variable} flex min-h-screen flex-col bg-black font-body antialiased`}
      >
        <Toaster />
        <Navbar />
        <PageTransition>{children}</PageTransition>
        <Footer />
      </body>
    </html>
  );
}
