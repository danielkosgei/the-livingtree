import type { Metadata } from "next";
import { ThemeProvider } from '@/components/theme-provider';
import "./globals.css";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "The LivingTree",
  description: "Living Family History Archive",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <html lang="en" suppressHydrationWarning>
        <head />
        <body>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            
            {children}
          </ThemeProvider>
        </body>
      </html>
    </>
  );
}
