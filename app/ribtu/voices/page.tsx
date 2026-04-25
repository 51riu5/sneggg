import VoiceNotes from "@/components/VoiceNotes";

export default function Page() {
  return (
    <div className="space-y-8">
      <header className="text-center space-y-2 fade-up">
        <p className="kicker">voice notes</p>
        <h1 className="font-serif text-4xl">soft little voices</h1>
        <p className="font-serif italic text-ink-soft max-w-md mx-auto">
          tell her something you can't quite type. up to a minute, and it'll buzz on her phone.
        </p>
      </header>
      <VoiceNotes role="ribtu" />
    </div>
  );
}
