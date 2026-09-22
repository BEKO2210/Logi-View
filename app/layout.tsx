import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Logi-View · Logistics Process Intelligence",
  description: "Visualize logistics processes, bookings, capacity and bottlenecks in one operational workspace.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="antialiased">{children}</body>
    </html>
  );
}
