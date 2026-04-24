import LoginForm from "@/components/LoginForm";
import FloatingHearts from "@/components/FloatingHearts";
import Blobs from "@/components/Blobs";

export default function LoginPage() {
  return (
    <main className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
      <Blobs />
      <FloatingHearts />

      <section className="relative z-10 w-full max-w-md">
        <div className="text-center mb-10">
          <p className="font-serif italic text-accent text-lg fade-up">a little corner of the internet,</p>
          <h1 className="font-script text-6xl text-accent mt-1 fade-up d1">
            made just for us
          </h1>
        </div>

        <div className="card p-8 fade-up d2">
          <p className="text-center text-ink-soft text-sm mb-6">enter your PIN to continue</p>
          <LoginForm />
        </div>

        <p className="text-center text-xs text-ink-mute tracking-[0.2em] uppercase mt-8 fade-up d3">
          ribtu + snegu · always
        </p>
      </section>
    </main>
  );
}
