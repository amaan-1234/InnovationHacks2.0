import './globals.css';
import { Inter } from 'next/font/google';
import { Providers } from '../components/Providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'TripPilot – AI Travel Planner',
  description: 'Plan your perfect trip with an AI agent that checks your calendar, finds flights, and builds your itinerary.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
