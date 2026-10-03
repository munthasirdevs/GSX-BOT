import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/SessionProvider";
import { Navbar } from "@/components/ui/Navbar";

export const metadata: Metadata = {
  title: "Discord Hub | Bot & Server Management Suite",
  description: "24-Hour Analytics, Support Tickets, Scheduled Announcements, and Server Management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#111215] text-[#dbdee1] antialiased selection:bg-[#5865F2] selection:text-white">
        <SessionProvider>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1 flex flex-col">{children}</main>
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
