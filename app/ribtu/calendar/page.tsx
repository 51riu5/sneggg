import CalendarView from "@/components/CalendarView";

export default function Page() {
  return (
    <div className="space-y-8">
      <header className="text-center space-y-2 fade-up">
        <p className="kicker">her history</p>
        <h1 className="font-serif text-4xl">every gentle day</h1>
        <p className="font-serif italic text-ink-soft">so you can see her pattern, and celebrate it with her.</p>
      </header>
      <CalendarView />
    </div>
  );
}
