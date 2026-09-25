import Navigation from '@/components/Navigation';
import ScrollProgress from '@/components/ScrollProgress';
import ScrollProgressBar from '@/components/ScrollProgressBar';
import FloatingCTA from '@/components/FloatingCTA';
import Hero from '@/components/Hero';
import EventChapter from '@/components/EventChapter';
import GamesSection from '@/components/GamesSection';
import BonfireScene from '@/components/BonfireScene';
import KaraokeScene from '@/components/KaraokeScene';
import ProgramTimeline from '@/components/ProgramTimeline';
import { schedule } from '@/data/schedule';

export default function Home() {
  return (
    <main className="relative min-h-screen w-full">
      <Navigation />
      <ScrollProgress />
      <ScrollProgressBar />
      <FloatingCTA />

      <Hero />

      {/* Chapter 01: Arrival */}
      <EventChapter
        id="arrival"
        time="4:30 PM"
        headline="WE OUTSIDE."
        subheadline="ARRIVAL & SETTLING IN"
      >
        <div className="font-body text-xl md:text-3xl space-y-4 max-w-2xl font-medium italic">
          <p>Pull up.</p>
          <p>Find your spot.</p>
          <p>Meet the crew.</p>
          <p>Let the night begin.</p>
        </div>
        <div className="mt-12 p-6 poster-border poster-shadow bg-brand-acid inline-block animate-pulse-glow">
          <div className="font-display font-black uppercase text-xs tracking-widest mb-1">DJ CHECK</div>
          <div className="font-display font-black text-2xl uppercase">
            Deadline: 5:30 PM <span className="text-brand-coral">STRICT</span>
          </div>
        </div>
      </EventChapter>

      {/* Chapter 02: Introduction */}
      <EventChapter
        id="intro"
        time="7:45 PM"
        headline="STRANGERS? NOT FOR LONG."
        subheadline="ICE BREAKING"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="font-body text-xl space-y-4 max-w-md">
            <p>Event Introduction</p>
            <p>Guest Introductions</p>
            <p>Ice Breaking Activities</p>
          </div>
          <div className="space-y-8">
            <div>
              <div className="font-display font-black text-xs uppercase opacity-50 tracking-widest mb-2">HOST</div>
              <div className="font-display font-black text-4xl uppercase">Coach Dan</div>
            </div>
            <div>
              <div className="font-display font-black text-xs uppercase opacity-50 tracking-widest mb-2">MC</div>
              <div className="font-display font-black text-4xl uppercase">MC Analog</div>
            </div>
            <div>
              <div className="font-display font-black text-xs uppercase opacity-50 tracking-widest mb-2">DJs</div>
              <div className="font-display font-black text-4xl uppercase flex flex-wrap gap-x-4">
                Sarz / Virgin Sticks / Emzzy
              </div>
            </div>
          </div>
        </div>
      </EventChapter>

      {/* Chapter 03: Games */}
      <EventChapter
        id="games"
        time="8:30 PM"
        headline="GAME ON."
        subheadline="YOUR PHONE IS YOUR CONTROLLER"
      >
        <div className="mb-12 font-body text-lg md:text-xl max-w-xl">
          No downloads. No complicated setup. Join and play.
        </div>
        <GamesSection />
      </EventChapter>

      {/* Chapter 04: Night Program */}
      <EventChapter
        id="movie"
        time="9:30 PM"
        headline="LIGHTS DOWN."
        bgColor="bg-brand-black"
        textColor="text-brand-cream"
        subheadline="MOVIE SCREENING"
      >
        <div className="flex items-center justify-center h-64 border-4 border-brand-cream/20 relative overflow-hidden group">
          <div className="font-display font-black text-4xl text-brand-cream/20 group-hover:text-brand-cream/50 transition-colors uppercase tracking-tighter">
            Cinematic Experience
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-transparent to-transparent" />
        </div>
      </EventChapter>

      <EventChapter
        id="karaoke"
        time="10:30 PM"
        headline="MIC UP."
        subheadline="KARAOKE"
      >
        <KaraokeScene />
      </EventChapter>

      {/* Chapter 05: Bonfire */}
      <EventChapter
        id="bonfire"
        time="12:00 AM"
        headline="LIGHT THE FIRE."
        bgColor="bg-brand-black"
        textColor="text-brand-cream"
        subheadline="BONFIRE PARTY"
      >
        <div className="text-center mb-12">
          <div className="font-display font-black text-2xl md:text-4xl uppercase tracking-widest mb-4">
            12:00 AM → 2:30 AM
          </div>
          <div className="font-body text-xl md:text-2xl opacity-80 italic">
            Music. Fire. Stories. Games. Vibes.
          </div>
        </div>
        <BonfireScene />
      </EventChapter>

      {/* Chapter 06: After Hours */}
      <EventChapter
        id="chill"
        time="2:30 AM"
        headline="STILL AWAKE?"
        bgColor="bg-brand-black"
        textColor="text-brand-cream"
        subheadline="LOW TEMPO"
      >
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <p className="font-body text-2xl italic opacity-60">Music comes down. Conversations go up.</p>
          <div className="font-display font-bold text-xl uppercase tracking-widest opacity-40">
            2:30 AM → 7:30 AM
          </div>
        </div>
      </EventChapter>

      {/* Transition Section: Sunrise */}
      <div id="the-night" className="h-screen w-full bg-gradient-to-b from-brand-black via-brand-purple to-brand-cream transition-colors duration-1000" />

      {/* Chapter 07: Morning */}
      <EventChapter
        id="morning"
        time="7:30 AM"
        headline="GOOD MORNING."
        subheadline="SURVIVAL MODE"
      >
        <div className="text-center space-y-6">
          <div className="font-display font-black text-4xl md:text-6xl uppercase italic">
            SOMEHOW... <br /> WE SURVIVED.
          </div>
          <div className="font-body text-xl max-w-lg mx-auto">
            Interactive Games & Catching Up.
            <br /> 7:30 AM – 8:30 AM
          </div>
        </div>
      </EventChapter>

      {/* Chapter 08: Football */}
      <EventChapter
        id="football"
        time="9:00 AM"
        headline="RUN IT BACK."
        subheadline="5-A-SIDE"
      >
        <div className="flex flex-col md:flex-row gap-12 items-center">
          <div className="text-center md:text-left space-y-4">
            <div className="font-display font-black text-6xl uppercase italic animate-float-medium">⚽</div>
            <div className="font-body text-xl">
              Football. Medium-Tempo Music. Vibes.
              <br /> 9:00 AM – 11:30 AM
            </div>
          </div>
          <div className="relative w-full h-64 bg-brand-acid poster-border poster-shadow flex items-center justify-center overflow-hidden">
             <div className="font-display font-black text-8xl opacity-20 absolute -right-10 -bottom-10 rotate-12 animate-float-slow">GOAL</div>
             <div className="font-display font-black text-4xl uppercase italic">Pitch Ready</div>
          </div>
        </div>
      </EventChapter>

      {/* Final Chapter */}
      <EventChapter
        id="departure"
        time="12:00 PM"
        headline="THAT'S A WRAP."
        subheadline="DEPARTURE"
      >
        <div className="text-center space-y-12">
          <div className="font-body text-2xl md:text-4xl italic leading-relaxed">
            You arrived as strangers. <br />
            Hopefully, you leave with stories.
          </div>

          <div className="p-12 poster-border poster-shadow bg-brand-black text-brand-cream max-w-3xl mx-auto">
            <div className="font-display font-black text-5xl uppercase italic mb-8">
              MAD SETTINGS
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left font-body">
              <div>
                <div className="font-display font-bold text-xs uppercase opacity-50 mb-2">HOST</div>
                <div className="font-display font-black uppercase">Coach Dan</div>
              </div>
              <div>
                <div className="font-display font-bold text-xs uppercase opacity-50 mb-2">MC</div>
                <div className="font-display font-black uppercase">MC Analog</div>
              </div>
              <div>
                <div className="font-display font-bold text-xs uppercase opacity-50 mb-2">DJs</div>
                <div className="font-display font-black uppercase">Sarz / Virgin Sticks / Emzzy</div>
              </div>
            </div>
          </div>

          <div id="join" className="pt-12">
            <a href="#" className="inline-block px-12 py-6 bg-brand-purple text-brand-cream font-display font-black uppercase tracking-tighter text-3xl poster-border poster-shadow hover:-translate-y-1 transition-transform">
              JOIN THE GAMES →
            </a>
          </div>
        </div>
      </EventChapter>

      {/* Program Timeline View */}
      <ProgramTimeline />

      {/* Simple Footer */}
      <footer className="py-12 px-6 bg-brand-black text-brand-cream/40 text-center font-display font-bold text-xs uppercase tracking-widest">
        © 2026 MAD SETTINGS • POP-UP • BONFIRE • SLEEPOVER
      </footer>
    </main>
  );
}