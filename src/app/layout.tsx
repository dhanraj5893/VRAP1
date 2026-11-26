import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VRAP — Vendor Risk Assessment Portal",
  description:
    "Traceable, evidence-led third-party risk assessment: intake, questionnaires, evidence review, explainable scoring, resilience readiness, actions and reassessment.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Fonts load at runtime from Google Fonts; next/font is not used because build-time font fetch is not guaranteed in all environments. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
