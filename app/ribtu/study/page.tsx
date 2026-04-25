import StudyRoom from "@/components/StudyRoom";

export default function Page() {
  return (
    <div className="space-y-8">
      <header className="text-center space-y-2 fade-up">
        <p className="kicker">study together</p>
        <h1 className="font-serif text-4xl">our little library</h1>
        <p className="font-serif italic text-ink-soft max-w-xl mx-auto">
          shared timer. shared focus. open the meet, hit start, and we're in this together.
        </p>
      </header>
      <StudyRoom role="ribtu" />
    </div>
  );
}
