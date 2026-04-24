import CycleTracker from "@/components/CycleTracker";

export default function Page() {
  return (
    <div className="space-y-8">
      <header className="text-center space-y-2 fade-up">
        <p className="kicker">her cycle</p>
        <h1 className="font-serif text-4xl">understanding her rhythm</h1>
        <p className="font-serif italic text-ink-soft max-w-xl mx-auto">
          read-only — so you can be prepared, soft, and present through every phase.
        </p>
      </header>
      <CycleTracker />
    </div>
  );
}
