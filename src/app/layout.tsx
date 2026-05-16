import type { Metadata } from "next";
import { Noto_Sans_Lao, Geist_Mono } from "next/font/google";
import "./globals.css";

const notoLao = Noto_Sans_Lao({
  variable: "--font-noto-lao",
  subsets: ["lao"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SMLAO — ລະບົບອອກບິນອາກອນ",
  description: "ລະບົບອອກບິນອາກອນ ຮ້ານຄ້າ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="lo"
      className={`${notoLao.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900 font-[var(--font-noto-lao)]">
        {children}
      </body>
    </html>
  );
}
