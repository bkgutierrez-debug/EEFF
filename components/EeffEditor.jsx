"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CONDICIONALES_DISPONIBLES, OBLIGATORIA_TEMPLATE, KIND_LABEL, buildInitialNoteRows } from "@/lib/notes-templates";

// Editor de Notas a los Estados Financieros (EEFF) de Fondos de Inversión.
// A diferencia de la versión anterior (que guardaba todo en window.storage),
// esta versión lee y escribe directamente en Supabase (Postgres). El rol
// ("escritura" o "revisor") viene fijo desde la cuenta del usuario -no se
// puede cambiar desde la pantalla- y la base de datos también lo exige
// mediante políticas de seguridad (RLS), así que aunque alguien manipulara
// el navegador, no podría escribir sin permiso real.
export default function EeffEditor({ userEmail, role }) {
  const supabase = createClient();
  const router = useRouter();

  const [funds, setFunds] = useState([]);
  const [notes, setNotes] = useState([]);
  const [selectedFundId, setSelectedFundId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notesLoading, setNotesLoading] = useState(false);
  const [showAddFund, setShowAddFund] = useState(false);
  const [newFundName, setNewFundName] = useState("");
  const [newFundProfile, setNewFundProfile] = useState([]);
  const [expandedNoteId, setExpandedNoteId] = useState(null);
  const [balance, setBalance] = useState({ activos: "", pasivos: "", patrimonio: "" });
  const [commentDrafts, setCommentDrafts] = useState({});
  const saveTimers = useRef({});

  const canWrite = role === "escritura";

  // ---------- Carga inicial: lista de fondos ----------
  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("funds")
        .select("id, name, profile, balance_activos, balance_pasivos, balance_patrimonio")
        .order("created_at", { ascending: true });
      if (!error && data) {
        setFunds(data);
        if (data.length > 0) setSelectedFundId(data[0].id);
      }
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Carga de notas + comentarios del fondo seleccionado ----------
  useEffect(() => {
    if (!selectedFundId) {
      setNotes([]);
      return;
    }
    const fund = funds.find((f) => f.id === selectedFundId);
    setBalance({
      activos: fund?.balance_activos ?? "",
      pasivos: fund?.balance_pasivos ?? "",
      patrimonio: fund?.balance_patrimonio ?? "",
    });

    (async () => {
      setNotesLoading(true);
      const { data, error } = await supabase
        .from("notes")
        .select("*, comments(*)")
        .eq("fund_id", selectedFundId)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true, foreignTable: "comments" });
      if (!error && data) setNotes(data);
      setNotesLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFundId, funds.length]);

  // ---------- Guardado con demora (debounce) para campos de texto ----------
  function debouncedSave(key, fn) {
    if (saveTimers.current[key]) clearTimeout(saveTimers.current[key]);
    saveTimers.current[key] = setTimeout(fn, 500);
  }

  // ---------- Acciones ----------
  async function addFund() {
    if (!newFundName.trim() || !canWrite) return;
    const { data: fund, error } = await supabase
      .from("funds")
      .insert({ name: newFundName.trim(), profile: newFundProfile })
      .select()
      .single();
    if (error || !fund) return;

    const rows = buildInitialNoteRows(fund.id, newFundProfile);
    const { data: insertedNotes } = await supabase.from("notes").insert(rows).select("*, comments(*)");

    setFunds((prev) => [...prev, fund]);
    setNotes((insertedNotes || []).map((n) => ({ ...n, comments: n.comments || [] })));
    setSelectedFundId(fund.id);
    setShowAddFund(false);
    setNewFundName("");
    setNewFundProfile([]);
  }

  async function toggleProfileTag(tag) {
    if (!canWrite || !selectedFundId) return;
    const fund = funds.find((f) => f.id === selectedFundId);
    if (!fund) return;
    const already = fund.profile.includes(tag);
    const newProfile = already ? fund.profile.filter((t) => t !== tag) : [...fund.profile, tag];

    const { error } = await supabase.from("funds").update({ profile: newProfile }).eq("id", selectedFundId);
    if (error) return;
    setFunds((prev) => prev.map((f) => (f.id === selectedFundId ? { ...f, profile: newProfile } : f)));

    if (already) {
      const toRemove = notes.find((n) => n.tag === tag);
      if (toRemove) {
        await supabase.from("notes").delete().eq("id", toRemove.id);
        setNotes((prev) => prev.filter((n) => n.id !== toRemove.id));
      }
    } else {
      const def = CONDICIONALES_DISPONIBLES.find((c) => c.tag === tag);
      const position = notes.length ? Math.max(...notes.map((n) => n.position)) + 1 : 0;
      const { data: created } = await supabase
        .from("notes")
        .insert({ fund_id: selectedFundId, kind: "condicional", tag, title: def.title, content: def.content, position })
        .select()
        .single();
      if (created) setNotes((prev) => [...prev, { ...created, comments: [] }]);
    }
  }

  function updateNoteContent(noteId, field, value) {
    if (!canWrite) return;
    setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, [field]: value } : n)));
    debouncedSave(`note-${noteId}-${field}`, async () => {
      await supabase.from("notes").update({ [field]: value }).eq("id", noteId);
    });
  }

  async function addAdhocNote() {
    if (!canWrite || !selectedFundId) return;
    const position = notes.length ? Math.max(...notes.map((n) => n.position)) + 1 : 0;
    const { data: created, error } = await supabase
      .from("notes")
      .insert({ fund_id: selectedFundId, kind: "adhoc", title: "Nueva nota ad-hoc", content: "", position })
      .select()
      .single();
    if (error || !created) return;
    setNotes((prev) => [...prev, { ...created, comments: [] }]);
    setExpandedNoteId(created.id);
  }

  async function moveNote(noteId, dir) {
    if (!canWrite) return;
    const idx = notes.findIndex((n) => n.id === noteId);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= notes.length) return;

    const a = notes[idx];
    const b = notes[newIdx];
    const list = [...notes];
    [list[idx], list[newIdx]] = [{ ...b, position: a.position }, { ...a, position: b.position }];
    setNotes(list);

    await Promise.all([
      supabase.from("notes").update({ position: b.position }).eq("id", a.id),
      supabase.from("notes").update({ position: a.position }).eq("id", b.id),
    ]);
  }

  async function removeAdhocNote(noteId) {
    if (!canWrite) return;
    await supabase.from("notes").delete().eq("id", noteId);
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  }

  async function addComment(noteId) {
    const text = (commentDrafts[noteId] || "").trim();
    if (!text) return;
    const { data: userRes } = await supabase.auth.getUser();
    const { data: created, error } = await supabase
      .from("comments")
      .insert({ note_id: noteId, author_id: userRes.user.id, author_name: userEmail, text })
      .select()
      .single();
    if (error || !created) return;
    setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, comments: [...n.comments, created] } : n)));
    setCommentDrafts((prev) => ({ ...prev, [noteId]: "" }));
  }

  async function resolveComment(noteId, commentId) {
    if (!canWrite) return;
    await supabase.from("comments").delete().eq("id", commentId);
    setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, comments: n.comments.filter((c) => c.id !== commentId) } : n)));
  }

  function saveBalanceField(field, value) {
    setBalance((prev) => ({ ...prev, [field]: value }));
    const column = { activos: "balance_activos", pasivos: "balance_pasivos", patrimonio: "balance_patrimonio" }[field];
    debouncedSave(`balance-${field}`, async () => {
      await supabase.from("funds").update({ [column]: value === "" ? null : Number(value) }).eq("id", selectedFundId);
    });
  }

  function exportPdf() {
    window.print();
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  // ---------- Valores derivados ----------
  const currentFund = funds.find((f) => f.id === selectedFundId);
  const totalComentarios = notes.reduce((acc, n) => acc + n.comments.length, 0);
  const mandatoryOk = notes.filter((n) => n.kind === "obligatoria").length === OBLIGATORIA_TEMPLATE.length;
  const act = parseFloat(balance.activos) || 0;
  const pas = parseFloat(balance.pasivos) || 0;
  const pat = parseFloat(balance.patrimonio) || 0;
  const cuadra = Math.abs(act - (pas + pat)) < 0.01 && (act || pas || pat);

  if (loading) {
    return <div style={{ padding: 40, fontFamily: "IBM Plex Sans, sans-serif", color: "#1B2430" }}>Cargando…</div>;
  }

  return (
    <div className="eeff-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

        .eeff-root {
          --paper: #F3F2ED;
          --panel: #FFFFFF;
          --ink: #1B2430;
          --ink-soft: #565F6E;
          --accent: #5C2A3D;
          --accent-soft: #F1E6EA;
          --gold: #A9822C;
          --gold-soft: #F3ECDA;
          --line: #DCD7CA;
          --nucleo-tint: #ECEAE4;
          --danger: #A3323A;
          font-family: 'IBM Plex Sans', sans-serif;
          background: var(--paper);
          color: var(--ink);
          min-height: 100vh;
          display: flex;
          font-size: 14px;
        }
        .eeff-serif { font-family: 'Source Serif 4', serif; }
        .eeff-mono { font-family: 'IBM Plex Mono', monospace; }

        .eeff-sidebar {
          width: 240px;
          flex-shrink: 0;
          border-right: 1px solid var(--line);
          padding: 20px 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .eeff-brand { font-size: 13px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-soft); }
        .eeff-fund-item {
          padding: 10px 12px;
          border-radius: 6px;
          cursor: pointer;
          border: 1px solid transparent;
          font-size: 13.5px;
        }
        .eeff-fund-item.active { background: var(--accent-soft); border-color: var(--accent); color: var(--accent); font-weight: 600; }
        .eeff-fund-item:hover:not(.active) { background: #EDEBE4; }
        .eeff-fund-tags { font-size: 11px; color: var(--ink-soft); margin-top: 2px; }

        .eeff-add-fund-btn {
          border: 1px dashed var(--line);
          background: transparent;
          border-radius: 6px;
          padding: 8px 10px;
          font-size: 13px;
          color: var(--ink-soft);
          cursor: pointer;
        }
        .eeff-add-fund-btn:hover { border-color: var(--accent); color: var(--accent); }
        .eeff-add-fund-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .eeff-main { flex: 1; padding: 28px 40px; max-width: 900px; }
        .eeff-topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }

        .eeff-session { display: flex; align-items: center; gap: 10px; font-size: 12.5px; color: var(--ink-soft); }
        .eeff-role-badge { padding: 4px 10px; border-radius: 999px; background: var(--ink); color: #fff; font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.04em; }

        .eeff-doc-title { font-size: 24px; margin: 0 0 2px 0; }
        .eeff-doc-sub { color: var(--ink-soft); font-size: 13px; }

        .eeff-actions { display: flex; gap: 8px; }
        .eeff-btn { border: 1px solid var(--line); background: var(--panel); padding: 7px 14px; border-radius: 6px; font-size: 13px; cursor: pointer; color: var(--ink); }
        .eeff-btn:hover { border-color: var(--accent); color: var(--accent); }
        .eeff-btn.primary { background: var(--ink); color: #fff; border-color: var(--ink); }
        .eeff-btn.primary:hover { opacity: 0.88; color: #fff; }
        .eeff-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .eeff-validation { display: flex; gap: 10px; margin-bottom: 22px; flex-wrap: wrap; }
        .eeff-pill { font-size: 11.5px; padding: 5px 10px; border-radius: 999px; display: flex; align-items: center; gap: 6px; border: 1px solid var(--line); }
        .eeff-dot { width: 7px; height: 7px; border-radius: 50%; }
        .eeff-dot.ok { background: #3F7A54; }
        .eeff-dot.bad { background: var(--danger); }

        .eeff-note {
          position: relative;
          background: var(--panel);
          border: 1px solid var(--line);
          border-radius: 8px;
          margin-bottom: 12px;
          overflow: hidden;
        }
        .eeff-note.nucleo { background: var(--nucleo-tint); }
        .eeff-note-head {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 18px;
          cursor: pointer;
        }
        .eeff-note-num { font-family: 'IBM Plex Mono', monospace; font-size: 26px; color: var(--line); font-weight: 500; width: 46px; flex-shrink: 0; }
        .eeff-note-title { font-size: 14.5px; font-weight: 500; flex: 1; }
        .eeff-note-kind { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.05em; padding: 3px 8px; border-radius: 4px; color: var(--ink-soft); background: #EEEBE3; }
        .eeff-note-kind.condicional { color: var(--gold); background: var(--gold-soft); }
        .eeff-note-kind.adhoc { color: var(--accent); background: var(--accent-soft); }
        .eeff-note-comment-badge { font-size: 11px; color: var(--accent); }

        .eeff-note-body { padding: 0 18px 18px 78px; }
        .eeff-textarea, .eeff-title-input {
          width: 100%;
          border: 1px solid var(--line);
          border-radius: 6px;
          padding: 10px 12px;
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 13.5px;
          color: var(--ink);
          background: #FBFAF7;
          resize: vertical;
        }
        .eeff-title-input { margin-bottom: 8px; font-weight: 500; }
        .eeff-readonly { padding: 10px 0; font-size: 13.5px; line-height: 1.6; color: var(--ink); white-space: pre-wrap; }
        .eeff-locked-note { font-size: 12px; color: var(--ink-soft); font-style: italic; margin-top: 4px; }

        .eeff-comments { margin-top: 14px; border-top: 1px dashed var(--line); padding-top: 12px; }
        .eeff-comment { background: var(--gold-soft); border-radius: 6px; padding: 8px 10px; margin-bottom: 8px; font-size: 12.5px; }
        .eeff-comment-meta { color: var(--ink-soft); font-size: 11px; margin-bottom: 3px; display: flex; justify-content: space-between; }
        .eeff-comment-input-row { display: flex; gap: 8px; }
        .eeff-comment-input-row input { flex: 1; border: 1px solid var(--line); border-radius: 6px; padding: 7px 10px; font-size: 12.5px; }

        .eeff-profile-tags { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
        .eeff-tag-toggle { font-size: 12px; padding: 6px 12px; border-radius: 999px; border: 1px solid var(--line); cursor: pointer; background: var(--panel); }
        .eeff-tag-toggle.on { background: var(--gold-soft); border-color: var(--gold); color: var(--gold); }
        .eeff-tag-toggle:disabled { cursor: not-allowed; opacity: 0.6; }

        .eeff-section-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.07em; color: var(--ink-soft); margin: 22px 0 8px 2px; }

        .eeff-modal-overlay { position: fixed; inset: 0; background: rgba(27,36,48,0.4); display: flex; align-items: center; justify-content: center; z-index: 50; }
        .eeff-modal { background: var(--panel); border-radius: 10px; padding: 24px; width: 360px; }
        .eeff-modal input[type="text"] { width: 100%; padding: 8px 10px; border: 1px solid var(--line); border-radius: 6px; margin: 10px 0 16px 0; font-size: 13.5px; }
        .eeff-modal-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 18px; }

        .eeff-add-note-btn { border: 1px dashed var(--line); background: transparent; padding: 10px; width: 100%; border-radius: 8px; color: var(--ink-soft); cursor: pointer; font-size: 13px; margin-top: 4px; }
        .eeff-add-note-btn:hover { border-color: var(--accent); color: var(--accent); }

        @media print {
          .eeff-sidebar, .eeff-topbar, .eeff-actions, .eeff-add-note-btn, .eeff-comments, .eeff-validation, .eeff-profile-tags { display: none !important; }
          .eeff-main { max-width: 100%; padding: 0; }
          .eeff-note { border: none; border-bottom: 1px solid #ccc; border-radius: 0; break-inside: avoid; }
          .eeff-note-head { cursor: default; }
          body { background: #fff; }
        }
      `}</style>

      {/* Barra lateral: lista de fondos + botón para agregar uno nuevo */}
      <aside className="eeff-sidebar">
        <div className="eeff-brand eeff-serif">EEFF · Fondos de Inversión</div>
        {funds.map((f) => (
          <div key={f.id} className={`eeff-fund-item ${f.id === selectedFundId ? "active" : ""}`} onClick={() => setSelectedFundId(f.id)}>
            <div>{f.name}</div>
            <div className="eeff-fund-tags">{f.profile.length ? f.profile.map((t) => CONDICIONALES_DISPONIBLES.find((c) => c.tag === t)?.label).join(" · ") : "Sin perfil especial"}</div>
          </div>
        ))}
        <button className="eeff-add-fund-btn" disabled={!canWrite} onClick={() => setShowAddFund(true)}>+ Agregar fondo</button>
      </aside>

      {/* Panel central */}
      <main className="eeff-main">
        <div className="eeff-topbar">
          <div>
            <h1 className="eeff-doc-title eeff-serif">{currentFund ? currentFund.name : "Sin fondo seleccionado"}</h1>
            <div className="eeff-doc-sub">Estados Financieros · Circular N°1998 CMF</div>
          </div>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <div className="eeff-session">
              <span>{userEmail}</span>
              <span className="eeff-role-badge">{role === "escritura" ? "Escritura" : "Revisor"}</span>
              <button className="eeff-btn" onClick={signOut}>Cerrar sesión</button>
            </div>
            <button className="eeff-btn primary" onClick={exportPdf} disabled={!currentFund}>Descargar PDF</button>
          </div>
        </div>

        {currentFund && (
          <>
            <div className="eeff-validation">
              <div className="eeff-pill"><span className={`eeff-dot ${mandatoryOk ? "ok" : "bad"}`}></span>Notas obligatorias completas</div>
              <div className="eeff-pill"><span className={`eeff-dot ${cuadra ? "ok" : "bad"}`}></span>Cuadre Activos = Pasivos + Patrimonio</div>
              <div className="eeff-pill"><span className={`eeff-dot ${totalComentarios === 0 ? "ok" : "bad"}`}></span>{totalComentarios} observaciones abiertas</div>
            </div>

            <div className="eeff-section-label eeff-mono">Perfil del fondo (activa notas condicionales)</div>
            <div className="eeff-profile-tags">
              {CONDICIONALES_DISPONIBLES.map((c) => (
                <button key={c.tag} disabled={!canWrite} className={`eeff-tag-toggle ${currentFund.profile.includes(c.tag) ? "on" : ""}`} onClick={() => toggleProfileTag(c.tag)}>
                  {c.label}
                </button>
              ))}
            </div>

            <div className="eeff-section-label eeff-mono">Balance de comprobación (control de cuadre)</div>
            <div style={{ display: "flex", gap: 10, marginBottom: 22 }}>
              {["activos", "pasivos", "patrimonio"].map((f) => (
                <div key={f} style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 4, textTransform: "capitalize" }}>{f}</div>
                  <input
                    className="eeff-title-input"
                    type="number"
                    disabled={!canWrite}
                    value={balance[f]}
                    onChange={(e) => saveBalanceField(f, e.target.value)}
                    placeholder="0"
                  />
                </div>
              ))}
            </div>

            <div className="eeff-section-label eeff-mono">Índice de notas {notesLoading && "· cargando…"}</div>
            {notes.map((note, idx) => {
              const isOpen = expandedNoteId === note.id;
              const locked = note.kind === "nucleo" && canWrite;
              return (
                <div key={note.id} className={`eeff-note ${note.kind}`}>
                  <div className="eeff-note-head" onClick={() => setExpandedNoteId(isOpen ? null : note.id)}>
                    <div className="eeff-note-num eeff-mono">{String(idx + 1).padStart(2, "0")}</div>
                    <div className="eeff-note-title">{note.title}</div>
                    <span className={`eeff-note-kind ${note.kind}`}>{KIND_LABEL[note.kind]}</span>
                    {note.comments.length > 0 && <span className="eeff-note-comment-badge">{note.comments.length} obs.</span>}
                  </div>
                  {isOpen && (
                    <div className="eeff-note-body">
                      {note.kind === "adhoc" && canWrite && (
                        <input className="eeff-title-input" value={note.title} onChange={(e) => updateNoteContent(note.id, "title", e.target.value)} />
                      )}

                      {canWrite && !locked ? (
                        <textarea className="eeff-textarea" rows={4} value={note.content} onChange={(e) => updateNoteContent(note.id, "content", e.target.value)} placeholder="Redactar contenido de la nota…" />
                      ) : (
                        <div className="eeff-readonly">{note.content || "— Sin contenido redactado aún —"}</div>
                      )}
                      {locked && <div className="eeff-locked-note">Nota núcleo: se edita centralizadamente, no a nivel de fondo.</div>}

                      {canWrite && (
                        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                          <button className="eeff-btn" onClick={() => moveNote(note.id, -1)}>↑ Subir</button>
                          <button className="eeff-btn" onClick={() => moveNote(note.id, 1)}>↓ Bajar</button>
                          {note.kind === "adhoc" && <button className="eeff-btn" onClick={() => removeAdhocNote(note.id)}>Eliminar</button>}
                        </div>
                      )}

                      <div className="eeff-comments">
                        {note.comments.map((c) => (
                          <div key={c.id} className="eeff-comment">
                            <div className="eeff-comment-meta">
                              <span>{c.author_name} · {new Date(c.created_at).toLocaleDateString("es-CL")}</span>
                              {canWrite && <span style={{ cursor: "pointer", color: "var(--accent)" }} onClick={() => resolveComment(note.id, c.id)}>Marcar resuelta</span>}
                            </div>
                            {c.text}
                          </div>
                        ))}
                        {!canWrite && (
                          <div className="eeff-comment-input-row">
                            <input
                              value={commentDrafts[note.id] || ""}
                              onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [note.id]: e.target.value }))}
                              onKeyDown={(e) => e.key === "Enter" && addComment(note.id)}
                              placeholder="Agregar observación…"
                            />
                            <button className="eeff-btn" onClick={() => addComment(note.id)}>Comentar</button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {canWrite && <button className="eeff-add-note-btn" onClick={addAdhocNote}>+ Insertar nota ad-hoc</button>}
          </>
        )}

        {!currentFund && !canWrite && (
          <div style={{ color: "var(--ink-soft)", fontSize: 13.5 }}>Todavía no hay fondos creados.</div>
        )}
      </main>

      {showAddFund && (
        <div className="eeff-modal-overlay" onClick={() => setShowAddFund(false)}>
          <div className="eeff-modal" onClick={(e) => e.stopPropagation()}>
            <div className="eeff-serif" style={{ fontSize: 17, marginBottom: 4 }}>Nuevo fondo</div>
            <input type="text" placeholder="Nombre del fondo" value={newFundName} onChange={(e) => setNewFundName(e.target.value)} />
            <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 8 }}>Perfil (activa notas condicionales)</div>
            <div className="eeff-modal-tags">
              {CONDICIONALES_DISPONIBLES.map((c) => (
                <button
                  key={c.tag}
                  className={`eeff-tag-toggle ${newFundProfile.includes(c.tag) ? "on" : ""}`}
                  onClick={() => setNewFundProfile((prev) => (prev.includes(c.tag) ? prev.filter((t) => t !== c.tag) : [...prev, c.tag]))}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="eeff-btn" onClick={() => setShowAddFund(false)}>Cancelar</button>
              <button className="eeff-btn primary" onClick={addFund}>Crear fondo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
