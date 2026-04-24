import CycleTracker from "@/components/CycleTracker";

export default function Page() {
  return (
    <div className="space-y-8">
      <header className="text-center space-y-2 fade-up">
        <p className="kicker">your cycle</p>
        <h1 className="font-serif text-4xl">gentle rhythm</h1>
        <p className="font-serif italic text-ink-soft max-w-xl mx-auto">
          just a soft record — so you can see your pattern, not perform for it.
        </p>
      </header>
      <CycleTracker editable />
    </div>
  );
}
