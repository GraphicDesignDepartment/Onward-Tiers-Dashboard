import type { Metadata } from "next";
import { Bakbak_One, Bebas_Neue, Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
});

const bakbak = Bakbak_One({
  variable: "--font-bakbak",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const bebas = Bebas_Neue({
  variable: "--font-bebas",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Rewards Dashboard | Onward Customs",
  description: "Track your Onward Customs tier progress, discounts, benefits, credits, and qualifying order activity.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${montserrat.variable} ${bakbak.variable} ${bebas.variable}`}>
      <body>{children}</body>
    </html>
  );
}
