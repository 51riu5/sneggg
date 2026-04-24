import CalendarView from "@/components/CalendarView";

export default function Page() {
  return (
    <div className="space-y-8">
      <header className="text-center space-y-2 fade-up">
        <p className="kicker">history</p>
        <h1 className="font-serif text-4xl">your gentle days</h1>
        <p className="font-serif italic text-ink-soft">every dot is a day you took care of yourself.</p>
      </header>
      <CalendarView editable />
    </div>
  );
}
