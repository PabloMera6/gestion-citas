import { createClient } from "@/lib/supabase/server";
import NuevoAnuncioForm from "@/components/NuevoAnuncioForm";
import { formatFullDate, formatTime } from "@/lib/date";
import type { Profile } from "@/lib/types/database";

interface AnnouncementRow {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  created_at: string;
  author: { full_name: string; color: string | null } | null;
}

export default async function TablonPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  const { data: announcements } = await supabase
    .from("announcements")
    .select("id, title, content, pinned, created_at, author:profiles(full_name, color)")
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<AnnouncementRow[]>();

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-1">
        Tablón de anuncios
      </h1>
      <p className="text-text-dim text-sm mb-6">
        Novedades, avisos y cambios de horario publicados por los entrenadores.
      </p>

      {profile?.role === "trainer" && <NuevoAnuncioForm />}

      {(announcements ?? []).length === 0 ? (
        <div className="rounded-xl border border-dashed border-line px-6 py-12 text-center text-text-dim text-sm">
          Todavía no hay anuncios publicados.
        </div>
      ) : (
        <div className="space-y-3">
          {(announcements ?? []).map((a) => {
            const color = a.author?.color ?? "#6366f1";
            return (
              <article
                key={a.id}
                className={`rounded-xl border bg-bg-raised px-5 py-4 ${
                  a.pinned ? "border-accent/40" : "border-line"
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <h2 className="font-semibold">{a.title}</h2>
                  {a.pinned && (
                    <span className="shrink-0 text-[10px] font-semibold text-accent-ink bg-accent rounded-full px-2 py-0.5">
                      Fijado
                    </span>
                  )}
                </div>
                <p className="text-sm text-text-dim whitespace-pre-wrap mb-3">
                  {a.content}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-text-faint">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  {a.author?.full_name ?? "Entrenador"} ·{" "}
                  <span className="capitalize">
                    {formatFullDate(new Date(a.created_at))}
                  </span>{" "}
                  · {formatTime(new Date(a.created_at))}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
