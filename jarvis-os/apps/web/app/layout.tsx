import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/components/layout/AuthProvider";

export const metadata: Metadata = {
  title: "JARVIS OS — AI Personal Assistant",
  description:
    "The closest real-world equivalent to Tony Stark's JARVIS. AI-powered personal assistant with voice, memory, and agent capabilities.",
  keywords: ["AI", "assistant", "JARVIS", "voice", "agents", "productivity"],
  authors: [{ name: "JARVIS OS" }],
  openGraph: {
    title: "JARVIS OS",
    description: "Your AI personal assistant",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased">
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
