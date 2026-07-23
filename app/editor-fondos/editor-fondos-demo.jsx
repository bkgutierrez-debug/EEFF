"use client";

import { useState } from "react";
import { CONDICIONALES_DISPONIBLES, OBLIGATORIA_TEMPLATE, NUCLEO_TEMPLATE, KIND_LABEL } from "./plantillas-notas";
import { estilosEditor } from "./estilos-editor";

// Versión de SOLO PRUEBA LOCAL: todo vive en memoria del navegador
// (useState), no toca Supabase ni se guarda en ningún lado — al recargar
// la página se pierde y vuelve a partir de los fondos de ejemplo.
// Por eso aquí el rol SÍ se puede alternar libremente con un botón: es
// para que puedas ver ambas vistas (Escritura/Revisor) mientras pruebas.
// La usa la ruta "/demo", que no existe en producción (ver app/demo/page.js).

const SAMPLE_FUNDS = [
  { id: "foresta", name: "Foresta", profile: ["inmobiliario"] },
  { id: "parque-ciudadano", name: "Parque Ciudadano", profile: ["securitizacion"] },
];

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function buildInitialNotes(profile) {
  const nucleo = NUCLEO_TEMPLATE.map((n) => ({ id: uid("nota"), kind: "nucleo", title: n.title, content: n.content, comments: [] }));
  const obligatorias = OBLIGATORIA_TEMPLATE.map((n) => ({ id: uid("nota"), kind: "obligatoria", title: n.title, content: n.content, comments: [] }));
  const condicionales = CONDICIONALES_DISPONIBLES.filter((c) => profile.includes(c.tag)).map((c) => ({
    id: uid("nota"), kind: "condicional", tag: c.tag, title: c.title, content: c.content, comments: [],
  }));
  return [...nucleo, ...obligatorias, ...condicionales];
}

function seedNotesByFund() {
  const map = {};
  for (const f of SAMPLE_FUNDS) map[f.id] = buildInitialNotes(f.profile);
  return map;
}

export default function EditorFondosDemo() {
  const [role, setRole] = useState("escritura");
  const [funds, setFunds] = useState(SAMPLE_FUNDS);
  const [notesByFund, setNotesByFund] = useState(seedNotesByFund);
  const [selectedFundId, setSelectedFundId] = useState(SAMPLE_FUNDS[0].id);
  const [showAddFund, setShowAddFund] = useState(false);
  const [newFundName, setNewFundName] = useState("");
  const [newFundProfile, setNewFundProfile] = useState([]);
  const [expandedNoteId, setExpandedNoteId] = useState(null);
  const [balanceByFund, setBalanceByFund] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});

  const canWrite = role === "escritura";
  const currentNotes = notesByFund[selectedFundId] || [];
  const currentFund = funds.find((f) => f.id === selectedFundId);
  const balance = balanceByFund[selectedFundId] || { activos: "", pasivos: "", patrimonio: "" };

  function addFund() {
    if (!newFundName.trim()) return;
    const id = uid("fondo");
    setFunds((prev) => [...prev, { id, name: newFundName.trim(), profile: newFundProfile }]);
    setNotesByFund((prev) => ({ ...prev, [id]: buildInitialNotes(newFundProfile) }));
    setSelectedFundId(id);
    setShowAddFund(false);
    setNewFundName("");
    setNewFundProfile([]);
  }

  function toggleProfileTag(tag) {
    if (!canWrite || !selectedFundId) return;
    setFunds((prev) => prev.map((f) => (f.id === selectedFundId ? { ...f, profile: f.profile.includes(tag) ? f.profile.filter((t) => t !== tag) : [...f.profile, tag] } : f)));
    setNotesByFund((prev) => {
      const current = prev[selectedFundId] || [];
      const already = current.some((n) => n.tag === tag);
      const def = CONDICIONALES_DISPONIBLES.find((c) => c.tag === tag);
      const updated = already
        ? current.filter((n) => n.tag !== tag)
        : [...current, { id: uid("nota"), kind: "condicional", tag, title: def.title, content: def.content, comments: [] }];
      return { ...prev, [selectedFundId]: updated };
    });
  }

  function updateNoteContent(noteId, field, value) {
    if (!canWrite) return;
    setNotesByFund((prev) => ({ ...prev, [selectedFundId]: prev[selectedFundId].map((n) => (n.id === noteId ? { ...n, [field]: value } : n)) }));
  }

  function addAdhocNote() {
    if (!canWrite || !selectedFundId) return;
    const note = { id: uid("nota"), kind: "adhoc", title: "Nueva nota ad-hoc", content: "", comments: [] };
    setNotesByFund((prev) => ({ ...prev, [selectedFundId]: [...prev[selectedFundId], note] }));
    setExpandedNoteId(note.id);
  }

  function moveNote(noteId, dir) {
    if (!canWrite) return;
    setNotesByFund((prev) => {
      const list = [...prev[selectedFundId]];
      const idx = list.findIndex((n) => n.id === noteId);
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= list.length) return prev;
      [list[idx], list[newIdx]] = [list[newIdx], list[idx]];
      return { ...prev, [selectedFundId]: list };
    });
  }

  function removeAdhocNote(noteId) {
    if (!canWrite) return;
    setNotesByFund((prev) => ({ ...prev, [selectedFundId]: prev[selectedFundId].filter((n) => n.id !== noteId) }));
  }

  function addComment(noteId) {
    const text = (commentDrafts[noteId] || "").trim();
    if (!text) return;
    setNotesByFund((prev) => ({
      ...prev,
      [selectedFundId]: prev[selectedFundId].map((n) =>
        n.id === noteId ? { ...n, comments: [...n.comments, { id: uid("com"), author: "Revisor", text, date: new Date().toLocaleDateString("es-CL") }] } : n
      ),
    }));
    setCommentDrafts((prev) => ({ ...prev, [noteId]: "" }));
  }

  function resolveComment(noteId, commentId) {
    if (!canWrite) return;
    setNotesByFund((prev) => ({
      ...prev,
      [selectedFundId]: prev[selectedFundId].map((n) => (n.id === noteId ? { ...n, comments: n.comments.filter((c) => c.id !== commentId) } : n)),
    }));
  }

  function setBalanceField(field, value) {
    setBalanceByFund((prev) => ({ ...prev, [selectedFundId]: { ...(prev[selectedFundId] || { activos: "", pasivos: "", patrimonio: "" }), [field]: value } }));
  }

  function exportPdf() {
    window.print();
  }

  const totalComentarios = currentNotes.reduce((acc, n) => acc + n.comments.length, 0);
  const mandatoryOk = currentNotes.filter((n) => n.kind === "obligatoria").length === OBLIGATORIA_TEMPLATE.length;
  const act = parseFloat(balance.activos) || 0;
  const pas = parseFloat(balance.pasivos) || 0;
  const pat = parseFloat(balance.patrimonio) || 0;
  const cuadra = Math.abs(act - (pas + pat)) < 0.01 && (act || pas || pat);

  return (
    <div className="eeff-root">
      <style>{estilosEditor}</style>

      <div className="eeff-demo-banner">MODO DEMO (solo local) — los datos no se guardan y se pierden al recargar la página. <a href="/login" style={{ color: "#fff", textDecoration: "underline" }}>Salir del modo demo</a></div>

      <aside className="eeff-sidebar" style={{ marginTop: 28 }}>
        <div className="eeff-brand eeff-serif">EEFF · Fondos de Inversión</div>
        {funds.map((f) => (
          <div key={f.id} className={`eeff-fund-item ${f.id === selectedFundId ? "active" : ""}`} onClick={() => setSelectedFundId(f.id)}>
            <div>{f.name}</div>
            <div className="eeff-fund-tags">{f.profile.length ? f.profile.map((t) => CONDICIONALES_DISPONIBLES.find((c) => c.tag === t)?.label).join(" · ") : "Sin perfil especial"}</div>
          </div>
        ))}
        <button className="eeff-add-fund-btn" disabled={!canWrite} onClick={() => setShowAddFund(true)}>+ Agregar fondo</button>
      </aside>

      <main className="eeff-main" style={{ marginTop: 28 }}>
        <div className="eeff-topbar">
          <div>
            <h1 className="eeff-doc-title eeff-serif">{currentFund ? currentFund.name : "Sin fondo seleccionado"}</h1>
            <div className="eeff-doc-sub">Estados Financieros · Circular N°1998 CMF</div>
          </div>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <div className="eeff-role-switch">
              <button className={`eeff-role-btn ${role === "escritura" ? "active" : ""}`} onClick={() => setRole("escritura")}>Escritura</button>
              <button className={`eeff-role-btn ${role === "revisor" ? "active" : ""}`} onClick={() => setRole("revisor")}>Revisor</button>
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
                  <input className="eeff-title-input" type="number" disabled={!canWrite} value={balance[f]} onChange={(e) => setBalanceField(f, e.target.value)} placeholder="0" />
                </div>
              ))}
            </div>

            <div className="eeff-section-label eeff-mono">Índice de notas</div>
            {currentNotes.map((note, idx) => {
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
                              <span>{c.author} · {c.date}</span>
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
      </main>

      {showAddFund && (
        <div className="eeff-modal-overlay" onClick={() => setShowAddFund(false)}>
          <div className="eeff-modal" onClick={(e) => e.stopPropagation()}>
            <div className="eeff-serif" style={{ fontSize: 17, marginBottom: 4 }}>Nuevo fondo</div>
            <input type="text" placeholder="Nombre del fondo" value={newFundName} onChange={(e) => setNewFundName(e.target.value)} />
            <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 8 }}>Perfil (activa notas condicionales)</div>
            <div className="eeff-modal-tags">
              {CONDICIONALES_DISPONIBLES.map((c) => (
                <button key={c.tag} className={`eeff-tag-toggle ${newFundProfile.includes(c.tag) ? "on" : ""}`} onClick={() => setNewFundProfile((prev) => (prev.includes(c.tag) ? prev.filter((t) => t !== c.tag) : [...prev, c.tag]))}>
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
