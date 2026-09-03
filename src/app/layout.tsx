import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-serif-calm",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Job Search — Calm Focus",
  description:
    "A quiet, minimal job board. What do you want next?",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${instrumentSerif.variable} h-full`}>
      <body className="flex min-h-screen flex-col bg-[#FAFAF7] text-[#111111]">
        <main className="flex-1 flex flex-col">{children}</main>
      </body>
    </html>
  );
}
