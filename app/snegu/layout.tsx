import { redirect } from "next/navigation";
import { getSessionRole } from "@/lib/auth";
import Topbar from "@/components/Topbar";
import Blobs from "@/components/Blobs";
import FloatingHearts from "@/components/FloatingHearts";
import NoteToaster from "@/components/NoteToaster";

export default async function SneguLayout({ children }: { children: React.ReactNode }) {
  const role = await getSessionRole();
  if (!role) redirect("/login");
  if (role !== "snegu") redirect("/ribtu");

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Blobs />
      <FloatingHearts />
      <Topbar role="snegu" />
      <main className="relative z-10 pt-28 pb-24 px-4 sm:px-6 max-w-5xl mx-auto">
        {children}
      </main>
      <NoteToaster role="snegu" />
    </div>
  );
}
