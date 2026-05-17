import type { Metadata } from "next";
import { Noto_Sans_Lao, Geist_Mono } from "next/font/google";
import { getTheme } from "@/lib/theme";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = await getTheme();
  return (
    <html
      lang="lo"
      data-theme={theme}
      className={`${notoLao.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-[var(--font-noto-lao)]">
        {children}
      </body>
    </html>
  );
}
