'use client';

import { useEffect } from "react";
import Navbar from "../components/Navbar";
import Toast from "../components/Toast";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function Home() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.classList.add("visible");
          }, parseInt(entry.target.getAttribute("data-delay") || "0"));
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll(".animate-in").forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <main className="min-h-screen bg-[#050b14] selection:bg-accent/30 selection:text-white overflow-y-auto">
      <Navbar />
      <Toast />

      {/* HERO SECTION */}
      <section className="relative min-h-[95vh] flex items-center justify-center pt-24 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[#050b14] via-[#050b14]/70 to-[#050b14] z-10"></div>
          <Image src="/hero_travel_bg.png" alt="Travel Background" priority fill className="object-cover opacity-60 mix-blend-screen animate-pulse-dot" />
        </div>

        <div className="absolute top-[20%] left-[10%] w-[400px] h-[400px] bg-accent/20 rounded-full blur-[120px] animate-pulse-dot z-0"></div>
        <div className="absolute top-[40%] right-[5%] w-[300px] h-[300px] bg-accent-cyan/20 rounded-full blur-[100px] animate-pulse-dot z-0" style={{ animationDelay: '1s' }}></div>

        <div className="max-w-[1000px] mx-auto px-6 text-center relative z-20 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium mb-8 animate-in" data-delay="0">
            <span className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse"></span>
            VoyagerAI 2.0 is now live
          </div>

          <h1 className="font-outfit text-5xl md:text-7xl font-bold text-text-primary leading-[1.1] tracking-tight mb-6 animate-in" data-delay="100">
            The Future of Travel is <br />
            <span className="gradient-text">Intelligently Yours.</span>
          </h1>

          <p className="text-lg md:text-xl text-text-secondary max-w-[600px] mx-auto leading-relaxed mb-10 font-[Inter,sans-serif] animate-in" data-delay="200">
            No more endless searching. Our Agentic AI crafts hyper-personalized itineraries, books stays, and curates experiences based on your unique travel DNA.
          </p>

          <div className="flex flex-wrap justify-center gap-4 animate-in" data-delay="300">
            <button 
              onClick={() => {
                if (status === 'authenticated') router.push('/chat');
                else {
                  const navLoginBtn = document.querySelector('nav button') as HTMLButtonElement;
                  if (navLoginBtn) navLoginBtn.click();
                }
              }}
              className="btn-primary relative cursor-pointer overflow-hidden bg-accent hover:bg-[#4f46e5] text-white px-8 py-3.5 rounded-xl font-semibold transition-all shadow-[0_8px_20px_rgba(99,102,241,0.3)] hover:-translate-y-0.5"
            >
              Start Planning Free
            </button>
            <button className="px-8 py-3.5 rounded-xl cursor-pointer bg-transparent border border-border-subtle text-text-primary font-semibold hover:bg-white/5 transition-all">
              Watch Demo
            </button>
          </div>

          <div className="mt-20 flex items-center justify-center gap-12 border-t border-border-subtle pt-10 w-full max-w-[800px] space-y-4 md:space-y-0 md:flex-row flex-col animate-in" data-delay="400">
            <div className="text-center">
              <div className="font-outfit text-3xl font-bold text-text-primary">50K+</div>
              <div className="text-sm text-text-muted mt-1 uppercase tracking-wider">Trips Planned</div>
            </div>
            <div className="hidden md:block w-px h-12 bg-border-subtle"></div>
            <div className="text-center">
              <div className="font-outfit text-3xl font-bold text-accent-cyan">120+</div>
              <div className="text-sm text-text-muted mt-1 uppercase tracking-wider">Countries Covered</div>
            </div>
            <div className="hidden md:block w-px h-12 bg-border-subtle"></div>
            <div className="text-center">
              <div className="font-outfit text-3xl font-bold text-text-primary flex items-center justify-center gap-1">
                4.9 <svg width="20" height="20" viewBox="0 0 24 24" fill="#fbbf24" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              </div>
              <div className="text-sm text-text-muted mt-1 uppercase tracking-wider">User Rating</div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-scroll">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="py-32 px-6 bg-bg-surface relative border-t border-border-subtle">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center max-w-[700px] mx-auto mb-20 animate-in section-header">
            <h2 className="font-outfit text-3xl md:text-5xl font-bold mb-6">Beyond Traditional Planning.</h2>
            <p className="text-text-secondary text-lg">VoyagerAI doesn&apos;t just suggest places; it understands context, budget, and real-time logistics.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="feature-card bg-bg-card border border-border-subtle p-8 rounded-3xl relative overflow-hidden transition-all hover:-translate-y-1 hover:border-accent/40 animate-in group" data-delay="0">
              <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center text-accent mb-6">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
              </div>
              <h3 className="font-outfit text-xl font-bold mb-3">Smart Itinerary Builder</h3>
              <p className="text-text-secondary text-sm leading-relaxed mb-6">Tell the AI your interests, budget, and travel dates. It crafts a day-by-day itinerary optimized for the perfect experience — not just the tourist traps.</p>
              <div className="inline-block px-3 py-1 bg-border-subtle text-xs font-semibold tracking-wider uppercase rounded-full text-text-muted">AI-Generated</div>
            </div>

            {/* Feature 2 */}
            <div className="feature-card bg-bg-card border border-border-subtle p-8 rounded-3xl relative overflow-hidden transition-all hover:-translate-y-1 hover:border-accent/40 animate-in group" data-delay="100">
              <div className="feature-glow"></div>
              <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center text-accent mb-6">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <h3 className="font-outfit text-xl font-bold mb-3">Conversational Planning</h3>
              <p className="text-text-secondary text-sm leading-relaxed mb-6">Just chat naturally. &quot;I want beaches, great food, and no crowded spots in Southeast Asia for 10 days.&quot; Your AI agent handles the rest autonomously.</p>
              <div className="inline-block px-3 py-1 bg-border-subtle text-xs font-semibold tracking-wider uppercase rounded-full text-text-muted">Most Popular</div>
            </div>

            {/* Feature 3 */}
            <div className="feature-card bg-bg-card border border-border-subtle p-8 rounded-3xl relative overflow-hidden transition-all hover:-translate-y-1 hover:border-accent/40 animate-in group" data-delay="200">
              <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center text-accent mb-6">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
              </div>
              <h3 className="font-outfit text-xl font-bold mb-3">Real-Time Adaptation</h3>
              <p className="text-text-secondary text-sm leading-relaxed mb-6">Flight delayed? Weather changed? The AI automatically re-routes your plans, finds alternatives, and keeps your trip seamless even when things go sideways.</p>
              <div className="inline-block px-3 py-1 bg-border-subtle text-xs font-semibold tracking-wider uppercase rounded-full text-text-muted">Live Updates</div>
            </div>

            {/* Feature 4 */}
            <div className="feature-card bg-bg-card border border-border-subtle p-8 rounded-3xl relative overflow-hidden transition-all hover:-translate-y-1 hover:border-accent/40 animate-in group" data-delay="300">
              <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center text-accent mb-6">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 .8-1.6l8-6a2 2 0 0 1 2.4 0l8 6Z"/><path d="m22 10-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 10"/></svg>
              </div>
              <h3 className="font-outfit text-xl font-bold mb-3">Direct to Inbox</h3>
              <p className="text-text-secondary text-sm leading-relaxed mb-6">A curated YouTube video related to your destination and your final customized itinerary will be automatically mailed directly to your logged-in account.</p>
              <div className="inline-block px-3 py-1 bg-border-subtle text-xs font-semibold tracking-wider uppercase rounded-full text-text-muted">Auto-Mailed</div>
            </div>

            {/* Feature 5 */}
            <div className="feature-card bg-bg-card border border-border-subtle p-8 rounded-3xl relative overflow-hidden transition-all hover:-translate-y-1 hover:border-accent/40 animate-in group" data-delay="400">
              <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center text-accent mb-6">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
              </div>
              <h3 className="font-outfit text-xl font-bold mb-3">Budget Optimization</h3>
              <p className="text-text-secondary text-sm leading-relaxed mb-6">Set a budget and let AI find the best deals on flights, hotels, and experiences without sacrificing quality. Stretch every dollar further.</p>
              <div className="inline-block px-3 py-1 bg-border-subtle text-xs font-semibold tracking-wider uppercase rounded-full text-text-muted">Smart Savings</div>
            </div>

            {/* Feature 6 */}
            <div className="feature-card bg-bg-card border border-border-subtle p-8 rounded-3xl relative overflow-hidden transition-all hover:-translate-y-1 hover:border-accent/40 animate-in group" data-delay="500">
              <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center text-accent mb-6">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <h3 className="font-outfit text-xl font-bold mb-3">Group Trip Coordination</h3>
              <p className="text-text-secondary text-sm leading-relaxed mb-6">Traveling with friends? The AI balances everyone&apos;s preferences, finds common ground, and coordinates schedules so no one is left out.</p>
              <div className="inline-block px-3 py-1 bg-border-subtle text-xs font-semibold tracking-wider uppercase rounded-full text-text-muted">Multi-Traveler</div>
            </div>
          </div>
        </div>
      </section>
      
      {/* HOW IT WORKS SECTION */}
      <section id="how-it-works" className="py-32 px-6">
        <div className="max-w-[1000px] mx-auto">
          <div className="text-center max-w-[700px] mx-auto mb-20 animate-in section-header">
            <h2 className="font-outfit text-3xl md:text-5xl font-bold mb-6">How VoyagerAI Works</h2>
            <p className="text-text-secondary text-lg">Three simple steps to your perfectly engineered getaway.</p>
          </div>

          <div className="relative">
            <div className="hidden lg:block absolute top-[40px] left-8 bottom-0 w-px bg-gradient-to-b from-accent via-border to-transparent"></div>
            
            <div className="flex flex-col lg:flex-row gap-8 mb-16 relative animate-in step">
              <div className="w-16 h-16 rounded-full bg-accent text-white flex justify-center items-center font-outfit text-xl font-bold z-10 shrink-0 border-4 border-bg-base">1</div>
              <div className="bg-bg-surface border border-border-subtle rounded-3xl p-8 flex-1">
                <h3 className="font-outfit text-2xl font-bold mb-3 text-text-primary">Tell us your dream.</h3>
                <p className="text-text-secondary leading-relaxed">Chat with VoyagerAI. Tell it where you want to go, your budget, who you are traveling with, and your desired vibe (e.g., &quot;Relaxing beach trip to Bali under $2000&quot;).</p>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 mb-16 relative animate-in step">
              <div className="w-16 h-16 rounded-full bg-bg-surface border border-accent text-accent flex justify-center items-center font-outfit text-xl font-bold z-10 shrink-0">2</div>
              <div className="bg-bg-surface border border-border-subtle rounded-3xl p-8 flex-1">
                <h3 className="font-outfit text-2xl font-bold mb-3 text-text-primary">AI Analyzes & Crafts.</h3>
                <p className="text-text-secondary leading-relaxed">Our multi-agent system cross-references millions of combinations for flights, hotels, and local activities to instantly generate a day-by-day plan optimized for efficiency.</p>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 relative animate-in step">
              <div className="w-16 h-16 rounded-full bg-bg-surface border border-border-subtle text-text-muted flex justify-center items-center font-outfit text-xl font-bold z-10 shrink-0">3</div>
              <div className="bg-bg-surface border border-border-subtle rounded-3xl p-8 flex-1">
                <h3 className="font-outfit text-2xl font-bold mb-3 text-text-primary">Review & Execute.</h3>
                <p className="text-text-secondary leading-relaxed">Approve the itinerary. VoyagerAI will finalize the bookings, sync everything to your calendar, and auto-mail you your itinerary and curated destination videos.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* TESTIMONIALS SECTION */}
      <section id="testimonials" className="py-24 px-6 bg-bg-surface border-y border-border-subtle overflow-hidden">
        <div className="max-w-[1200px] mx-auto">
          <h2 className="font-outfit text-center text-3xl font-bold mb-16 animate-in section-header">Loved by Explorers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-bg-card p-8 rounded-3xl border border-border-subtle animate-in testimonial-card">
              <div className="flex gap-1 mb-4 text-[#fbbf24]">
                {"★★★★★".split("").map((star, i) => <span key={i}>{star}</span>)}
              </div>
              <p className="text-text-secondary italic mb-6">&quot;VoyagerAI completely changed how I travel. It found a hidden boutique hotel in Kyoto I would&apos;ve never discovered, and automatically rescheduled my train when it detected a delay!&quot;</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-accent/20"></div>
                <div>
                  <div className="font-bold text-text-primary text-sm">Sarah Jenkins</div>
                  <div className="text-text-muted text-xs">Digital Nomad</div>
                </div>
              </div>
            </div>
            
            <div className="bg-bg-card p-8 rounded-3xl border border-border-subtle animate-in testimonial-card" data-delay="100">
              <div className="flex gap-1 mb-4 text-[#fbbf24]">
                {"★★★★★".split("").map((star, i) => <span key={i}>{star}</span>)}
              </div>
              <p className="text-text-secondary italic mb-6">&quot;I hate planning trips. I just told the AI &apos;Take me to Patagonia, I like hiking, handle everything.&apos; And it literally did. flights, lodges, guides. Incredible.&quot;</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-accent-cyan/20"></div>
                <div>
                  <div className="font-bold text-text-primary text-sm">Marcus Chen</div>
                  <div className="text-text-muted text-xs">Adventure Photographer</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[800px] h-[400px] bg-accent/10 blur-[150px] rounded-full z-0"></div>
        <div className="max-w-[800px] mx-auto text-center relative z-10 animate-in cta-content">
          <h2 className="font-outfit text-4xl md:text-6xl font-bold mb-6">Ready to let AI guide you?</h2>
          <p className="text-text-secondary text-lg mb-10">Join thousands of smart travelers who let VoyagerAI handle the complexity of travel planning.</p>
          <button 
            onClick={() => {
              if (status === 'authenticated') router.push('/chat');
              else {
                const navLoginBtn = document.querySelector('nav button') as HTMLButtonElement;
                if (navLoginBtn) navLoginBtn.click();
              }
            }}
            className="btn-primary relative cursor-pointer bg-accent hover:bg-[#4f46e5] text-white px-10 py-4 rounded-xl font-bold text-lg shadow-[0_10px_30px_rgba(99,102,241,0.4)] transition-all hover:scale-105"
          >
            Start Your Journey
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border-subtle py-12 px-6 bg-[#03060a]">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="font-outfit text-xl font-bold tracking-tight">Voyager<span className="gradient-text">AI</span></span>
          </div>
          <div className="flex gap-6 text-sm text-text-muted">
            <a href="#" className="hover:text-text-primary transition-colors">Privacy</a>
            <a href="#" className="hover:text-text-primary transition-colors">Terms</a>
            <a href="#" className="hover:text-text-primary transition-colors">Twitter</a>
            <a href="#" className="hover:text-text-primary transition-colors">Instagram</a>
          </div>
          <div className="text-sm text-text-muted">
            &copy; 2026 VoyagerAI. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}
