import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import toast, { Toaster } from "react-hot-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const warsaw = localFont({
  src: [
    {
      path: "../../public/fonts/WarsawGothic.otf",
      weight: "700",
    },
  ],
  variable: "--font-warsaw",
});

export const metadata = {
  title: "Tekken Warriors PY",
  description:
    "Ranked de participantes de los torneos de Tekken Warriors Paraguay",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${warsaw.variable} flex min-h-screen flex-col bg-black font-warsaw antialiased`}
      >
        <Navbar />
        <div className="bg-gradient-to-br from-[#630D33] to-[#277687]">
          {children}
        </div>

        <Footer />
      </body>
    </html>
  );
}
