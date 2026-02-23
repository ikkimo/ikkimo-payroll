import type { Metadata } from "next";
import { Lato } from "next/font/google";
import "./globals.css";

const lato = Lato({
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
  variable: "--font-lato",
});


export const metadata: Metadata = {
  title: "Ikkimo Payroll",
  description: "Internal payroll system",

  openGraph: {
    title: "Ikkimo Payroll",
    description: "Internal payroll system",
    images: ["/ikkimo_logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${lato.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
