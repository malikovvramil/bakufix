import './globals.css';
export const metadata = { title: 'BakıFix', description: 'BakıFix — Şəhər İdarəetmə Platforması' };
export default function RootLayout({ children }) {
  return (
    <html lang="az">
      <body>{children}</body>
    </html>
  );
}
