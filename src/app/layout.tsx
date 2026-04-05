import './globals.css';
import { Inter, Outfit } from 'next/font/google';
import { Providers } from '../components/Providers';

const inter = Inter({ subsets: ['latin'], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700", "800"], variable: "--font-outfit" });

export const metadata = {
  title: 'VoyagerAI 2.0 – AI Travel Planner',
  description: 'Plan your perfect trip with an AI agent that checks your calendar, finds flights, and builds your itinerary.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body className={`${inter.variable} ${outfit.variable} antialiased`} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
