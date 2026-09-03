import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Elevated Career OS",
  description:
    "Executive-level career intelligence platform. Discover opportunities at startups and MNCs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="flex min-h-screen flex-col bg-bg text-text">
        <main className="flex-1 flex flex-col">{children}</main>
      </body>
    </html>
  );
}
