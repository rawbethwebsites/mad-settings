"use client";

import dynamic from "next/dynamic";
import Navigation from "@/components/Navigation";
import ScrollProgress from "@/components/ScrollProgress";
import ScrollProgressBar from "@/components/ScrollProgressBar";
import AutoScroll from "@/components/AutoScroll";
import Hero from "@/components/Hero";
import EventChapter from "@/components/EventChapter";
import GamesSection from "@/components/GamesSection";
import KaraokeScene from "@/components/KaraokeScene";
import ProgramTimeline from "@/components/ProgramTimeline";

const CampWorld = dynamic(() => import("./CampWorld"), {
  ssr: false,
  loading: () => <div className="camp-world-fallback" aria-hidden="true" />,
});

export default function HomeExperience() {
  return (
    <main className="relative min-h-screen w-full camp-experience">
      <a href="#program" className="skip-link">
        Skip to program
      </a>
      <CampWorld />
      <Navigation night />
      <ScrollProgress />
      <ScrollProgressBar />
      <AutoScroll />

      <Hero night />

      <EventChapter
        overlay
        id="arrival"
        time="12 NOON"
        headline="WE OUTSIDE."
        subheadline="ARRIVAL & SETTLING IN"
      >
        <div className="font-body text-lg md:text-3xl space-y-4 max-w-2xl font-medium italic">
          <p>Pull up. Chill.</p>
          <p>Games. Bicycle rides.</p>
          <p>Picnic vibes. Music.</p>
          <p>12:00 PM – 4:30 PM</p>
        </div>
        <div className="mt-12 flex flex-wrap gap-6">
          <div className="p-6 poster-border poster-shadow bg-brand-acid text-brand-black inline-block">
            <div className="font-display font-black uppercase text-xs tracking-widest mb-1">4:30 PM – 7:30 PM</div>
            <div className="font-display font-black text-2xl uppercase">Intertribe Games</div>
          </div>
          <div className="p-6 poster-border poster-shadow bg-brand-black text-brand-cream inline-block">
            <div className="font-display font-black uppercase text-xs tracking-widest mb-1">7:30 PM – 8:30 PM</div>
            <div className="font-display font-black text-2xl uppercase">Rest &amp; Get Ready</div>
          </div>
        </div>
      </EventChapter>

      <EventChapter
        overlay
        id="games"
        time="8:30 PM"
        headline="GAME ON."
        subheadline="MAD SETTINGS SOCIAL SPACE"
      >
        <div className="mb-12 font-body text-base md:text-xl max-w-xl">
          Introduction to the Mad Settings Social Space from The Boost Nation, in front of the LED screen.
          Your phone is your controller. No downloads. Join and play.
        </div>
        <GamesSection />
      </EventChapter>

      <EventChapter
        overlay
        id="intro"
        time="9:00 PM"
        headline="STRANGERS? NOT FOR LONG."
        subheadline="ICE BREAKING"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          <div className="font-body text-base md:text-xl space-y-4 max-w-md">
            <p>Introduction</p>
            <p>Guest Introductions</p>
            <p>Icebreakers</p>
          </div>
          <div className="space-y-8">
            <div>
              <div className="font-display font-black text-xs uppercase opacity-50 tracking-widest mb-2">HOST</div>
              <div className="font-display font-black text-4xl uppercase">MC Sapilo</div>
            </div>
            <div>
              <div className="font-display font-black text-xs uppercase opacity-50 tracking-widest mb-2">HYPEMAN</div>
              <div className="font-display font-black text-4xl uppercase">Yus</div>
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

      <EventChapter
        overlay
        id="karaoke"
        time="10:00 PM"
        headline="MIC UP."
        subheadline="KARAOKE"
      >
        <KaraokeScene />
      </EventChapter>

      <EventChapter
        overlay
        id="movie"
        time="11:00 PM"
        headline="LIGHTS DOWN."
        subheadline="MOVIE SCREENING"
      >
        <div className="max-w-xl font-body text-base md:text-2xl italic">
          The camp screen lights up. Same night. Same crew. Popcorn hour.
        </div>
      </EventChapter>

      <EventChapter
        overlay
        id="bonfire"
        time="12:00 AM"
        headline="LIGHT THE FIRE."
        subheadline="BONFIRE PARTY"
      >
        <div className="text-center mb-8">
          <div className="font-display font-black text-lg md:text-4xl uppercase tracking-wider md:tracking-widest mb-3 md:mb-4">
            12:00 AM → 2:30 AM
          </div>
          <div className="font-body text-base md:text-2xl opacity-80 italic">
            We light up the bonfire. The main party begins.
          </div>
        </div>
      </EventChapter>

      <EventChapter
        overlay
        id="chill"
        time="2:30 AM"
        headline="STILL AWAKE?"
        subheadline="LOW TEMPO"
      >
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <p className="font-body text-lg md:text-2xl italic opacity-80">Music comes down. Conversations go up.</p>
          <div className="font-display font-bold text-sm md:text-xl uppercase tracking-wider md:tracking-widest opacity-50">
            2:30 AM → 7:30 AM
          </div>
        </div>
      </EventChapter>

      <div id="the-night" className="h-[40vh] w-full pointer-events-none" />

      <EventChapter
        overlay
        id="morning"
        time="7:30 AM"
        headline="GOOD MORNING."
        subheadline="MORNING GLORY"
      >
        <div className="text-center space-y-6">
          <div className="font-display font-black text-3xl md:text-6xl uppercase italic">
            SOMEHOW... <br /> WE SURVIVED.
          </div>
          <div className="font-body text-base md:text-xl max-w-lg mx-auto">
            Hosted by Ogogoro Settings. Cruise, praise &amp; gyration, interactive games and socializing.
            <br /> 7:30 AM – 8:30 AM
          </div>
        </div>
      </EventChapter>

      <EventChapter
        overlay
        id="football"
        time="9:00 AM"
        headline="RUN IT BACK."
        subheadline="5-A-SIDE"
      >
        <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-center">
          <div className="text-center md:text-left space-y-4">
            <div className="font-body text-base md:text-xl">
              Football. Medium-Tempo Music. Vibes.
              <br /> 9:00 AM – 11:30 AM
            </div>
          </div>
          <div className="relative w-full h-48 bg-brand-acid text-brand-black poster-border poster-shadow flex items-center justify-center overflow-hidden">
            <div className="font-display font-black text-6xl md:text-8xl opacity-20 absolute -right-10 -bottom-10 rotate-12">GOAL</div>
            <div className="font-display font-black text-4xl uppercase italic">Pitch Ready</div>
          </div>
        </div>
      </EventChapter>

      <EventChapter
        overlay
        id="departure"
        time="12:00 PM"
        headline="THAT'S A WRAP."
        subheadline="DEPARTURE"
      >
        <div className="text-center space-y-12">
          <div className="font-body text-lg md:text-4xl italic leading-relaxed">
            You arrived as strangers. <br />
            Hopefully, you leave with stories.
          </div>

          <div className="p-6 md:p-12 poster-border poster-shadow bg-brand-black text-brand-cream max-w-3xl mx-auto">
            <div className="font-display font-black text-3xl md:text-5xl uppercase italic mb-6 md:mb-8">
              MAD SETTINGS
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left font-body">
              <div>
                <div className="font-display font-bold text-xs uppercase opacity-50 mb-2">HOST</div>
                <div className="font-display font-black uppercase">MC Sapilo</div>
              </div>
              <div>
                <div className="font-display font-bold text-xs uppercase opacity-50 mb-2">HYPEMAN</div>
                <div className="font-display font-black uppercase">Yus</div>
              </div>
              <div>
                <div className="font-display font-bold text-xs uppercase opacity-50 mb-2">DJs</div>
                <div className="font-display font-black uppercase">Sarz / Virgin Sticks / Emzzy</div>
              </div>
            </div>
          </div>

          <div className="pt-12">
            <a href="/register" className="inline-block px-12 py-6 bg-brand-purple text-brand-cream font-display font-black uppercase tracking-tighter text-3xl poster-border poster-shadow hover:-translate-y-1 transition-transform">
              REGISTER FOR CAMP →
            </a>
          </div>
        </div>
      </EventChapter>

      <ProgramTimeline />

      <footer className="py-12 px-6 bg-brand-black text-brand-cream/40 text-center font-display font-bold text-xs uppercase tracking-widest">
        © 2026 MAD SETTINGS • POP-UP • BONFIRE • SLEEPOVER
      </footer>
    </main>
  );
}
