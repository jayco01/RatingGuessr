import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  metadataBase: new URL('https://www.ratingguessr.games'),

  title: {
    template: '%s | Rating Guessr',
    default: 'Rating Guessr - Discover Local Gems',
  },

  description: "A location-based web game where you discover local gems by guessing their Google ratings.",

  openGraph: {
    title: "Rating Guessr - Discover Local Gems",
    description: "Explore cities and find hidden new places in this Higher/Lower style game.",
    url: "https://www.ratingguessr.games",
    siteName: "Rating Guessr",
    images: [
      {
        url: "/RatingGuessr_favicon.png",
        width: 1200,
        height: 630,
        alt: "Rating Guessr Favicon",
      },
    ],
    locale: "en_US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Rating Guessr",
    description: "Discover local gems by guessing their Google ratings.",
    images: ["/RatingGuessr_favicon.png"],
  },

  icons: {
    icon: "/RatingGuessr_favicon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
    <body
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
    {children}
    </body>
    </html>
  );
}