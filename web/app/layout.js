import './globals.css';

export const metadata = {
  title: 'Airpiv',
  description: 'Flight booking and travel search',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
