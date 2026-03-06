import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Finance Tracker",
  description: "Personal finance and portfolio tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Sidebar />
        <main className="min-h-screen p-4 pt-16 md:pt-8 md:p-8 md:ml-64">{children}</main>
      </body>
    </html>
  );
}
