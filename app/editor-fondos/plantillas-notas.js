// Plantillas de notas: se usan para poblar un fondo nuevo con su
// listado inicial de notas (núcleo + obligatorias + condicionales
// según el perfil elegido). Lo usan tanto el editor real
// (editor-fondos.jsx) como el de prueba (editor-fondos-demo.jsx).

export const NUCLEO_TEMPLATE = [
  { title: "Declaración de cumplimiento normativo", content: "Los presentes estados financieros han sido preparados de acuerdo con Normas Internacionales de Información Financiera (NIIF/IFRS) e instrucciones de la Comisión para el Mercado Financiero (CMF), en concordancia con la Circular N°1998 de 2010." },
  { title: "Bases de medición", content: "Los estados financieros han sido preparados sobre la base de costo histórico, con excepción de los instrumentos financieros medidos a valor razonable con cambios en resultados." },
  { title: "Moneda funcional y de presentación", content: "La moneda funcional y de presentación del Fondo es el peso chileno, por corresponder a la moneda del entorno económico principal en que opera." },
  { title: "Nuevos pronunciamientos NIIF", content: "Se presentan las normas e interpretaciones emitidas por el IASB que se encuentran vigentes y aquellas emitidas pero no vigentes a la fecha de estos estados financieros, evaluando su impacto en las políticas contables del Fondo." },
];

export const OBLIGATORIA_TEMPLATE = [
  { title: "Información general del fondo", content: "" },
  { title: "Política de inversión, liquidez y endeudamiento", content: "" },
  { title: "Administración de riesgos financieros", content: "" },
  { title: "Activos financieros — clasificación NIIF 9", content: "" },
  { title: "Cuotas emitidas y en circulación", content: "" },
  { title: "Reparto de beneficios", content: "" },
  { title: "Rentabilidad de la serie", content: "" },
  { title: "Custodia de activos", content: "" },
  { title: "Partes relacionadas", content: "" },
  { title: "Garantías Ley N°20.712", content: "" },
  { title: "Información estadística", content: "" },
  { title: "Sanciones", content: "" },
  { title: "Hechos posteriores", content: "" },
];

export const CONDICIONALES_DISPONIBLES = [
  { tag: "inmobiliario", label: "Inmobiliario", title: "Propiedades de inversión y tasación", content: "Detalle de propiedades de inversión, método de tasación y variación de valor razonable durante el período." },
  { tag: "securitizacion", label: "Deuda securitizada", title: "Títulos de deuda de securitización", content: "Detalle de los títulos de deuda emitidos en procesos de securitización, tasa de interés efectiva y clasificación de riesgo." },
  { tag: "derivados", label: "Derivados", title: "Instrumentos financieros derivados y coberturas", content: "Detalle de contratos derivados vigentes, valor razonable, contraparte y política de cobertura aplicada." },
  { tag: "consolidado", label: "Consolidado", title: "Consolidación de subsidiarias", content: "Detalle línea a línea de los estados financieros de las subsidiarias consolidadas y ajustes de eliminación." },
];

export const KIND_LABEL = { nucleo: "Núcleo", obligatoria: "Obligatoria", condicional: "Condicional", adhoc: "Ad-hoc" };

// Construye las filas de notas (sin id, lo asigna Supabase) listas para
// insertar en la base de datos cuando se crea un fondo nuevo.
// La usa únicamente editor-fondos.jsx (el editor real).
export function buildInitialNoteRows(fundId, profile) {
  let position = 0;
  const rows = [];

  for (const n of NUCLEO_TEMPLATE) {
    rows.push({ fund_id: fundId, kind: "nucleo", title: n.title, content: n.content, position: position++ });
  }
  for (const n of OBLIGATORIA_TEMPLATE) {
    rows.push({ fund_id: fundId, kind: "obligatoria", title: n.title, content: n.content, position: position++ });
  }
  for (const c of CONDICIONALES_DISPONIBLES.filter((c) => profile.includes(c.tag))) {
    rows.push({ fund_id: fundId, kind: "condicional", tag: c.tag, title: c.title, content: c.content, position: position++ });
  }
  return rows;
}
