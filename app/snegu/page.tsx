import DailyDashboard from "@/components/DailyDashboard";
import Spotify from "@/components/Spotify";
import ReasonsCarousel from "@/components/ReasonsCarousel";

export default function SneguHome() {
  return (
    <div className="space-y-10">
      <header className="text-center space-y-3 fade-up">
        <p className="kicker">today, snegu</p>
        <h1 className="font-serif text-5xl sm:text-7xl font-medium">
          hi, <span className="shimmer-text font-script">snegu</span>
        </h1>
        <p className="font-serif italic text-ink-soft text-lg max-w-xl mx-auto">
          one gentle thing at a time. i'm right here with you.
        </p>
      </header>

      <DailyDashboard />

      <div className="grid md:grid-cols-2 gap-6">
        <Spotify />
        <ReasonsCarousel />
      </div>
    </div>
  );
}
