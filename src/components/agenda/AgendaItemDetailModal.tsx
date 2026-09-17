"use client";

import { useEffect, useState } from "react";
import { BarChart3, Send } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Avatar from "@/components/ui/Avatar";
import { PriorityBadge, AgendaStatusBadge } from "@/components/ui/Badges";
import { supabase } from "@/lib/supabase/client";
import { logActivity } from "@/lib/activity";
import { useUser } from "@/components/providers/UserProvider";
import { formatRelativeTime } from "@/lib/date";
import type { AgendaComment, AgendaItem, Poll, PollOption, PollVote } from "@/lib/types";

export default function AgendaItemDetailModal({
  item,
  workspaceId,
  onClose,
}: {
  item: AgendaItem;
  workspaceId: string;
  onClose: () => void;
}) {
  const { userName } = useUser();
  const [comments, setComments] = useState<AgendaComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [poll, setPoll] = useState<Poll | null>(null);
  const [options, setOptions] = useState<PollOption[]>([]);
  const [votes, setVotes] = useState<PollVote[]>([]);
  const [creatingPoll, setCreatingPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [{ data: commentRows }, { data: pollRows }] = await Promise.all([
        supabase
          .from("agenda_comments")
          .select("*")
          .eq("agenda_item_id", item.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("polls")
          .select("*")
          .eq("agenda_item_id", item.id)
          .order("created_at", { ascending: false })
          .limit(1),
      ]);
      if (cancelled) return;
      setComments((commentRows as AgendaComment[]) || []);
      const currentPoll = (pollRows?.[0] as Poll) || null;
      setPoll(currentPoll);

      if (currentPoll) {
        const [{ data: optionRows }, { data: voteRows }] = await Promise.all([
          supabase
            .from("poll_options")
            .select("*")
            .eq("poll_id", currentPoll.id)
            .order("position", { ascending: true }),
          supabase.from("poll_votes").select("*").eq("poll_id", currentPoll.id),
        ]);
        if (cancelled) return;
        setOptions((optionRows as PollOption[]) || []);
        setVotes((voteRows as PollVote[]) || []);
      }
    }

    load();

    const channel = supabase
      .channel(`agenda-detail:${item.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agenda_comments", filter: `agenda_item_id=eq.${item.id}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as AgendaComment;
            setComments((prev) => (prev.some((c) => c.id === row.id) ? prev : [...prev, row]));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "polls", filter: `agenda_item_id=eq.${item.id}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setPoll(payload.new as Poll);
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [item.id]);

  useEffect(() => {
    if (!poll) return;
    const channel = supabase
      .channel(`poll-votes:${poll.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "poll_votes", filter: `poll_id=eq.${poll.id}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as PollVote;
            setVotes((prev) => [...prev.filter((v) => v.voter_name !== row.voter_name), row]);
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as PollVote;
            setVotes((prev) => prev.map((v) => (v.id === row.id ? row : v)));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "poll_options", filter: `poll_id=eq.${poll.id}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as PollOption;
            setOptions((prev) => (prev.some((o) => o.id === row.id) ? prev : [...prev, row]));
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [poll]);

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!userName || !commentText.trim()) return;
    const body = commentText.trim();
    setCommentText("");
    await supabase.from("agenda_comments").insert({
      agenda_item_id: item.id,
      author: userName,
      body,
    });
    await logActivity(workspaceId, userName, `comentó en "${item.title}"`);
  }

  async function submitPoll(e: React.FormEvent) {
    e.preventDefault();
    if (!userName || !pollQuestion.trim()) return;
    const cleanOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (cleanOptions.length < 2) return;

    const { data: newPoll } = await supabase
      .from("polls")
      .insert({ agenda_item_id: item.id, question: pollQuestion.trim(), created_by: userName })
      .select()
      .single();

    if (newPoll) {
      await supabase.from("poll_options").insert(
        cleanOptions.map((label, index) => ({
          poll_id: newPoll.id,
          label,
          position: index,
        }))
      );
      await logActivity(workspaceId, userName, `creó una votación en "${item.title}"`);
      setPoll(newPoll as Poll);
    }
    setCreatingPoll(false);
    setPollQuestion("");
    setPollOptions(["", ""]);
  }

  async function castVote(optionId: string) {
    if (!userName || !poll) return;
    await supabase
      .from("poll_votes")
      .upsert(
        { poll_id: poll.id, poll_option_id: optionId, voter_name: userName },
        { onConflict: "poll_id,voter_name" }
      );
  }

  const totalVotes = votes.length;
  const myVote = votes.find((v) => v.voter_name === userName)?.poll_option_id;

  return (
    <Modal title={item.title} onClose={onClose} wide>
      <div className="flex flex-col gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <PriorityBadge priority={item.priority} />
            <AgendaStatusBadge status={item.status} />
          </div>
          {item.description && (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
              {item.description}
            </p>
          )}
          <p className="mt-3 flex items-center gap-2 text-xs text-slate-400">
            <Avatar name={item.added_by} size={20} />
            Añadido por <span className="font-medium text-slate-500">{item.added_by}</span> ·{" "}
            {formatRelativeTime(item.created_at)}
          </p>
        </div>

        <div className="border-t border-slate-100 pt-5">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
            <BarChart3 className="h-4 w-4" /> Votación
          </h3>
          {poll ? (
            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
              <p className="mb-3 text-sm font-medium text-slate-800">{poll.question}</p>
              <div className="flex flex-col gap-2">
                {options.map((opt) => {
                  const optVotes = votes.filter((v) => v.poll_option_id === opt.id).length;
                  const pct = totalVotes ? Math.round((optVotes / totalVotes) * 100) : 0;
                  const mine = myVote === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => castVote(opt.id)}
                      className={`relative overflow-hidden rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                        mine
                          ? "border-indigo-300 bg-indigo-50 text-indigo-800"
                          : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200"
                      }`}
                    >
                      <div
                        className="absolute inset-y-0 left-0 bg-indigo-100/70"
                        style={{ width: `${pct}%` }}
                      />
                      <div className="relative flex items-center justify-between">
                        <span>{opt.label}</span>
                        <span className="text-xs font-semibold text-slate-500">
                          {optVotes} · {pct}%
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-slate-400">
                {totalVotes} {totalVotes === 1 ? "voto" : "votos"}
              </p>
            </div>
          ) : creatingPoll ? (
            <form onSubmit={submitPoll} className="flex flex-col gap-2.5 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
              <input
                autoFocus
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder="¿Qué día hacemos la presentación?"
                className="input"
              />
              {pollOptions.map((opt, i) => (
                <input
                  key={i}
                  value={opt}
                  onChange={(e) =>
                    setPollOptions((prev) => prev.map((o, idx) => (idx === i ? e.target.value : o)))
                  }
                  placeholder={`Opción ${i + 1}`}
                  className="input"
                />
              ))}
              <div className="flex items-center justify-between gap-2">
                {pollOptions.length < 5 ? (
                  <button
                    type="button"
                    onClick={() => setPollOptions((prev) => [...prev, ""])}
                    className="text-xs font-medium text-indigo-600 hover:underline"
                  >
                    + Añadir opción
                  </button>
                ) : (
                  <span />
                )}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setCreatingPoll(false)} className="btn-secondary">
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary">
                    Crear votación
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setCreatingPoll(true)}
              className="rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-500 transition hover:border-indigo-300 hover:text-indigo-600"
            >
              + Crear votación
            </button>
          )}
        </div>

        <div className="border-t border-slate-100 pt-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">
            Comentarios {comments.length > 0 && `(${comments.length})`}
          </h3>
          <div className="flex max-h-56 flex-col gap-3 overflow-y-auto pr-1">
            {comments.length === 0 && (
              <p className="text-sm text-slate-400">Todavía no hay comentarios.</p>
            )}
            {comments.map((c) => (
              <div key={c.id} className="flex gap-2.5">
                <Avatar name={c.author} size={26} />
                <div className="flex-1 rounded-2xl bg-slate-50 px-3.5 py-2.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-700">{c.author}</span>
                    <span className="text-[11px] text-slate-400">{formatRelativeTime(c.created_at)}</span>
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-600">{c.body}</p>
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={submitComment} className="mt-3 flex items-center gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Escribe un comentario…"
              className="input"
            />
            <button
              type="submit"
              disabled={!commentText.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white transition hover:bg-slate-800 disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </Modal>
  );
}
