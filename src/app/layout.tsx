import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'UrithiVault | Secure Digital Inheritance & Legacy Continuity Vault',
  description:
    'Protect and transfer your vital estate plans, financial records, media, and chamas/SACCOs details to designated beneficiaries upon verified triggers.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
