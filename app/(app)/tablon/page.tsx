import { getAuthContext } from "@/lib/auth-context";
import NuevoAnuncioForm from "@/components/NuevoAnuncioForm";
import { formatFullDate, formatTime } from "@/lib/date";

interface AnnouncementRow {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  created_at: string;
  author: { full_name: string; color: string | null } | null;
}

export default async function TablonPage() {
  const { supabase, user, profile } = await getAuthContext();

  if (!user) return null;

  const { data: announcements } = await supabase
    .from("announcements")
    .select("id, title, content, pinned, created_at, author:profiles(full_name, color)")
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<AnnouncementRow[]>();

  return (
    <div>
      <h1 className="mb-1">
        Tablón de anuncios
      </h1>
      <p className="text-text-dim text-sm mb-6 mt-4">
        Novedades, avisos y cambios de horario publicados por los entrenadores.
      </p>

      {profile?.role === "trainer" && <NuevoAnuncioForm />}

      {(announcements ?? []).length === 0 ? (
        <div className="border border-dashed border-line px-6 py-12 text-center text-text-dim text-sm">
          Todavía no hay anuncios publicados.
        </div>
      ) : (
        <div className="space-y-3">
          {(announcements ?? []).map((a) => {
            return (
              <article
                key={a.id}
                className={`border bg-bg-raised px-5 py-4 ${
                  a.pinned
                    ? "border-text shadow-[5px_5px_0_0_rgba(255,255,255,0.85)]"
                    : "border-line"
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <h2 className="font-display text-xl">{a.title}</h2>
                  {a.pinned && (
                    <span className="shrink-0 label-mono !text-accent-ink bg-accent px-2 py-0.5">
                      Fijado
                    </span>
                  )}
                </div>
                <p className="text-sm text-text-dim whitespace-pre-wrap mb-3">
                  {a.content}
                </p>
                <div className="flex items-center gap-1.5 font-mono-ui text-[11px] text-text-faint">
                  <span className="w-1.5 h-1.5 bg-text" />
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
