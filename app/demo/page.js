import { notFound } from "next/navigation";
import EditorFondosDemo from "../editor-fondos/editor-fondos-demo";

// Ruta de solo-desarrollo para ver la interfaz sin conectar Supabase todavía.
// En producción (Vercel) esta página no existe: siempre responde 404.
export default function DemoPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return <EditorFondosDemo />;
}
