import { AuthProvider } from "@/lib/auth";
import { Toaster } from "@/components/ui/toaster";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Party Market",
  description: "Multiplayer party game where players trade stocks",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-background">
          <div className="container max-w-8xl mx-auto px-4">
            <AuthProvider>
              {children}
              <Toaster />
            </AuthProvider>
          </div>
        </div>
      </body>
    </html>
  );
}
