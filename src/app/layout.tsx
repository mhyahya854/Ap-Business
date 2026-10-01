import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import bookConfig from "../../book.config.json";

const themeBootstrap = `try{var t=localStorage.getItem('b2-reader-theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t)}else{document.documentElement.removeAttribute('data-theme')}}catch{}`;

export const metadata: Metadata = {
  title: `${bookConfig.title} — Book 2`,
  description:
    "A page-faithful digital textbook reader with canonical navigation and accessible contents.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="reader-theme" strategy="beforeInteractive">
          {themeBootstrap}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  );
}
