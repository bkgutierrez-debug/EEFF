import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EditorFondos from "./editor-fondos/editor-fondos";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  return <EditorFondos userEmail={user.email} role={profile?.role ?? "revisor"} />;
}
