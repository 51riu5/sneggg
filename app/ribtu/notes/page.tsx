import NotesBoard from "@/components/NotesBoard";

export default function Page() {
  return (
    <div className="space-y-8">
      <header className="text-center space-y-2 fade-up">
        <p className="kicker">letters</p>
        <h1 className="font-serif text-4xl">words, back and forth</h1>
        <p className="font-serif italic text-ink-soft">kept safe. always.</p>
      </header>
      <NotesBoard />
    </div>
  );
}
