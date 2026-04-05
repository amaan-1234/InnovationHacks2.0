'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { LogOut, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const { data: session } = useSession();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);

    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const handleLogin = async () => {
    await signIn('google', { callbackUrl: '/chat' });
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/' });
    setDropdownOpen(false);
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 py-4 ${scrolled ? 'glass-nav !py-3 border-b border-border-subtle' : ''}`}>
      <div className="max-w-[1200px] mx-auto px-6 flex items-center justify-between gap-8">
        <div className="flex items-center gap-2 flex-shrink-0 cursor-pointer" onClick={() => router.push('/')}>
          <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="14" cy="14" r="13" stroke="url(#logoGrad)" strokeWidth="2" />
              <path d="M14 6C14 6 8 10 8 15C8 18.3 10.7 21 14 21C17.3 21 20 18.3 20 15C20 10 14 6 14 6Z" fill="url(#logoGrad2)" opacity="0.9" />
              <path d="M14 10L16 14H19L16.5 16.5L17.5 20L14 17.5L10.5 20L11.5 16.5L9 14H12L14 10Z" fill="white" opacity="0.95" />
              <defs>
                <linearGradient id="logoGrad" x1="1" y1="1" x2="27" y2="27" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#6366f1" />
                  <stop offset="1" stopColor="#06b6d4" />
                </linearGradient>
                <linearGradient id="logoGrad2" x1="8" y1="6" x2="20" y2="21" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#6366f1" />
                  <stop offset="1" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="font-outfit text-xl font-bold text-text-primary tracking-tight">Voyager<span className="gradient-text">AI</span></span>
        </div>

        <div className="hidden lg:flex items-center gap-8 flex-1 justify-center">
          <a href="/#features" className="nav-link text-sm font-medium text-text-secondary hover:text-text-primary transition-colors relative">Features</a>
          <a href="/#how-it-works" className="nav-link text-sm font-medium text-text-secondary hover:text-text-primary transition-colors relative">How It Works</a>
          <a href="/#testimonials" className="nav-link text-sm font-medium text-text-secondary hover:text-text-primary transition-colors relative">Testimonials</a>
        </div>

        <div className="hidden lg:block">
          {session?.user ? (
            <div className="relative flex items-center shrink-0" ref={profileRef}>
              <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center gap-2 bg-accent/10 border border-accent/25 rounded-full p-1 pr-3 text-text-secondary hover:bg-accent/15 hover:border-accent/45 hover:text-text-primary transition-all cursor-pointer">
                <img src={session.user.image || '/imgs/testbot.webp'} alt="Avatar" className="w-7 h-7 rounded-full object-cover border-2 border-accent/40" />
                <span className="font-outfit text-sm font-semibold text-text-primary">{session.user.name?.split(' ')[0]}</span>
                <ChevronDown size={14} />
              </button>
              
              <div className={`absolute top-[calc(100%+10px)] right-0 w-60 bg-[#0d1b2a] border border-accent/25 rounded-xl shadow-2xl overflow-hidden transition-all duration-200 z-50 ${dropdownOpen ? 'opacity-100 visible translate-y-0 scale-100' : 'opacity-0 invisible -translate-y-2 scale-95'}`}>
                <div className="flex items-center gap-3 p-4 bg-accent/5">
                  <img src={session.user.image || '/imgs/testbot.webp'} alt="Avatar" className="w-10 h-10 rounded-full object-cover border-2 border-accent/40 shrink-0" />
                  <div className="overflow-hidden">
                    <div className="font-outfit text-sm font-bold text-text-primary truncate">{session.user.name}</div>
                    <div className="text-xs text-text-muted mt-0.5 truncate">{session.user.email}</div>
                  </div>
                </div>
                <div className="h-px bg-border-subtle" />
                
                <button onClick={() => router.push('/chat')} className="flex items-center gap-2.5 w-full p-3 text-sm text-text-secondary hover:bg-accent/10 hover:text-accent transition-colors text-left cursor-pointer">
                  Open TripPlanner
                </button>

                <div className="h-px bg-border-subtle" />
                <button onClick={handleLogout} className="flex items-center gap-2.5 w-full p-3 text-sm text-text-secondary hover:bg-red-500/10 hover:text-red-400 transition-colors text-left cursor-pointer">
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <button 
              onClick={handleLogin}
              className="flex shrink-0 items-center gap-3 px-5 py-2 text-sm font-bold font-[Montserrat,sans-serif] text-[#c4d2dc] bg-[#19242b] border border-white/25 rounded-lg hover:scale-[1.025] hover:bg-[#1e2f38] transition-all cursor-pointer"
            >
              <svg viewBox="0 0 256 262" className="h-5 w-auto shrink-0" xmlns="http://www.w3.org/2000/svg">
                <path d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027" fill="#4285F4"></path>
                <path d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1" fill="#34A853"></path>
                <path d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782" fill="#FBBC05"></path>
                <path d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251" fill="#EB4335"></path>
              </svg>
              Sign in
            </button>
          )}
        </div>

        <button className="lg:hidden flex flex-col gap-[5px] p-1 bg-transparent border-none cursor-pointer" onClick={() => setMenuOpen(!menuOpen)}>
          <span className="block w-[22px] h-[2px] bg-text-secondary rounded-full"></span>
          <span className="block w-[22px] h-[2px] bg-text-secondary rounded-full"></span>
          <span className="block w-[22px] h-[2px] bg-text-secondary rounded-full"></span>
        </button>
      </div>

      <div className={`lg:hidden flex-col gap-4 p-4 px-6 border-t border-border-subtle bg-[#050b14]/95 backdrop-blur-md ${menuOpen ? 'flex' : 'hidden'}`}>
        <a href="/#features" className="nav-link text-sm font-medium text-text-secondary" onClick={() => setMenuOpen(false)}>Features</a>
        <a href="/#how-it-works" className="nav-link text-sm font-medium text-text-secondary" onClick={() => setMenuOpen(false)}>How It Works</a>
        <a href="/#testimonials" className="nav-link text-sm font-medium text-text-secondary" onClick={() => setMenuOpen(false)}>Testimonials</a>
        
        {!session?.user && (
          <button onClick={handleLogin} className="mt-2 py-2 px-4 bg-accent text-white rounded-lg font-semibold text-sm cursor-pointer">
            Sign In
          </button>
        )}
        {session?.user && (
          <>
            <button onClick={() => { setMenuOpen(false); router.push('/chat'); }} className="mt-2 py-2 px-4 bg-accent text-white rounded-lg font-semibold text-sm cursor-pointer">
              Open TripPlanner
            </button>
            <button onClick={handleLogout} className="mt-2 py-2 px-4 bg-border-subtle text-text-secondary rounded-lg font-semibold text-sm cursor-pointer">
              Sign Out
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
