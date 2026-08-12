import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Meguaz — Travel. Personalized. Unforgettable.",
  description:
    "Meguaz plans your whole trip around your budget and your time — so you spend less, leave on time, and never sweat the bottlenecks.",
};

export const viewport: Viewport = {
  themeColor: "#071320",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Loaded via <link> so the prototype's literal font-family names
            ('Inter', 'DM Serif Display') resolve exactly as designed. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
