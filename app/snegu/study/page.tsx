import StudyRoom from "@/components/StudyRoom";

export default function Page() {
  return (
    <div className="space-y-8">
      <header className="text-center space-y-2 fade-up">
        <p className="kicker">study together</p>
        <h1 className="font-serif text-4xl">our little library</h1>
        <p className="font-serif italic text-ink-soft max-w-xl mx-auto">
          the timer is shared. either of us can start, pause, or reset — and the other sees it instantly.
        </p>
      </header>
      <StudyRoom role="snegu" />
    </div>
  );
}
