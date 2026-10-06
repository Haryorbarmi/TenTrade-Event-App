import type { Metadata } from "next";
import { Inter, Questrial } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "600"],
});

const questrial = Questrial({
  variable: "--font-questrial",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "TenTrade Lagos Seminar 2026",
  description: "Event check-in and giveaway console",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${questrial.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
