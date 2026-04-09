import type { Metadata } from "next";
import { Syne } from "next/font/google";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
});

export const metadata: Metadata = {
  title: "Motus Leap",
  openGraph: {
    title: "Motus Leap",
  },
  other: {
    "theme-color": "#0a0e1a",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={syne.variable}>
      <body className="bg-ml-void text-ml-text antialiased">{children}</body>
    </html>
  );
}
