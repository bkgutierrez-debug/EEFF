// Estilos visuales del editor de notas EEFF (colores, tipografías, espaciados).
// Se guardan aquí, separados de la lógica, para que "editor-fondos.jsx" y
// "editor-fondos-demo.jsx" no sean archivos gigantes: ambos importan este
// mismo texto y lo insertan dentro de una etiqueta <style>.
//
// Nota: hay clases usadas solo por la versión real (ej. .eeff-session) y
// otras usadas solo por la versión de prueba/demo (ej. .eeff-role-switch,
// .eeff-demo-banner). Tenerlas todas juntas aquí no genera ningún problema,
// cada página solo aplica las clases que realmente usa en su HTML.
export const estilosEditor = `
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
  .eeff-demo-banner { position: fixed; top: 0; left: 0; right: 0; background: var(--danger); color: #fff; text-align: center; padding: 6px; font-size: 12px; z-index: 100; }

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

  .eeff-role-switch { display: flex; border: 1px solid var(--line); border-radius: 999px; overflow: hidden; }
  .eeff-role-btn { padding: 6px 16px; font-size: 12.5px; cursor: pointer; background: var(--panel); border: none; color: var(--ink-soft); }
  .eeff-role-btn.active { background: var(--ink); color: #fff; }

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

  /* Estilos especiales que solo aplican al imprimir / exportar a PDF:
     ocultan botones y controles para que quede solo el documento. */
  @media print {
    .eeff-sidebar, .eeff-topbar, .eeff-actions, .eeff-add-note-btn, .eeff-comments, .eeff-validation, .eeff-profile-tags, .eeff-demo-banner { display: none !important; }
    .eeff-main { max-width: 100%; padding: 0; }
    .eeff-note { border: none; border-bottom: 1px solid #ccc; border-radius: 0; break-inside: avoid; }
    .eeff-note-head { cursor: default; }
    body { background: #fff; }
  }
`;
