import type { Metadata } from "next";
import { Geist, Geist_Mono, Poppins, Big_Shoulders } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const poppins = Poppins({ 
  subsets: ['latin'],
  weight: ['400', '600', '800'],
  variable: '--font-poppins'
});

const bigShoulders = Big_Shoulders({
  subsets: ['latin'],
  weight: ['800'],
  variable: '--font-big-shoulders'
});

export const metadata: Metadata = {
  title: "Duke Discount Manager",
  description: "Template discount manager application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${poppins.variable} ${bigShoulders.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
