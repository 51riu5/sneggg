import { redirect } from "next/navigation";
import { getSessionRole } from "@/lib/auth";

export default async function RootPage() {
  const role = await getSessionRole();
  if (!role) redirect("/login");
  if (role === "snegu") redirect("/snegu");
  redirect("/ribtu");
}
