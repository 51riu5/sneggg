import HerDayLive from "@/components/HerDayLive";
import QuickSendNote from "@/components/QuickSendNote";
import PushManager from "@/components/PushManager";
import SharedTasks from "@/components/SharedTasks";
import MemoryOfDay from "@/components/MemoryOfDay";

export default function RibtuHome() {
  return (
    <div className="space-y-10">
      <header className="text-center space-y-3 fade-up">
        <p className="kicker">ribtu's view</p>
        <h1 className="font-serif text-5xl sm:text-6xl">how's <span className="shimmer-text font-script">snegu</span> today?</h1>
        <p className="font-serif italic text-ink-soft">live updates from her day. gentle presence, always.</p>
      </header>

      <MemoryOfDay role="ribtu" basePath="/ribtu" />

      <PushManager role="ribtu" />

      <HerDayLive />

      <SharedTasks role="ribtu" />

      <QuickSendNote />
    </div>
  );
}
