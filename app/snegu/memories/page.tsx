import MemoriesGallery from "@/components/MemoriesGallery";

export default function Page() {
  return (
    <div className="space-y-8">
      <header className="text-center space-y-2 fade-up">
        <p className="kicker">memories</p>
        <h1 className="font-serif text-4xl">us, in pictures</h1>
        <p className="font-serif italic text-ink-soft">a soft random one shows up on your home each day.</p>
      </header>
      <MemoriesGallery role="snegu" />
    </div>
  );
}
