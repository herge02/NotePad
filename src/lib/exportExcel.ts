// Remplit le fichier Excel original (modele_releve.xlsm) avec les données du
// relevé, sans rien reconstruire : on modifie les cellules directement dans le
// XML du classeur (JSZip + DOMParser). Styles, cellules fusionnées et macro
// VBA (double-clic = X) sont intégralement préservés — le fichier téléchargé
// reste un .xlsm identique à l'original, mais rempli.

import JSZip from "jszip";
import { buildCellWrites } from "./excelMap";
import type { ReleveData } from "./types";

const TEMPLATE_URL = "/modele_releve.xlsm";
// Feuil3 (feuille de relevé) = rId1 → xl/worksheets/sheet1.xml dans le modèle
const SHEET_PATH = "xl/worksheets/sheet1.xml";

function colToIndex(col: string): number {
  let n = 0;
  for (const ch of col) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

function splitRef(ref: string): { col: string; row: number } {
  const m = /^([A-Z]+)(\d+)$/.exec(ref);
  if (!m) throw new Error(`Référence de cellule invalide : ${ref}`);
  return { col: m[1], row: Number(m[2]) };
}

/** écrit une valeur dans une cellule du XML de feuille (créée au besoin) */
function setCell(doc: Document, sheetData: Element, ref: string, value: string | number) {
  const ns = doc.documentElement.namespaceURI;
  const { row } = splitRef(ref);

  // trouver / créer la ligne, dans l'ordre
  let rowEl: Element | null = null;
  let insertBefore: Element | null = null;
  for (const el of Array.from(sheetData.children)) {
    const rAttr = Number(el.getAttribute("r"));
    if (rAttr === row) {
      rowEl = el;
      break;
    }
    if (rAttr > row) {
      insertBefore = el;
      break;
    }
  }
  if (!rowEl) {
    rowEl = doc.createElementNS(ns, "row");
    rowEl.setAttribute("r", String(row));
    sheetData.insertBefore(rowEl, insertBefore);
  }

  // trouver / créer la cellule, dans l'ordre des colonnes
  const colIdx = colToIndex(splitRef(ref).col);
  let cell: Element | null = null;
  let cellBefore: Element | null = null;
  for (const el of Array.from(rowEl.children)) {
    const r = el.getAttribute("r");
    if (!r) continue;
    const idx = colToIndex(splitRef(r).col);
    if (r === ref) {
      cell = el;
      break;
    }
    if (idx > colIdx) {
      cellBefore = el;
      break;
    }
  }
  if (!cell) {
    cell = doc.createElementNS(ns, "c");
    cell.setAttribute("r", ref);
    rowEl.insertBefore(cell, cellBefore);
  }

  // remplacer le contenu (on garde l'attribut de style s)
  while (cell.firstChild) cell.removeChild(cell.firstChild);
  if (typeof value === "number" && Number.isFinite(value)) {
    cell.removeAttribute("t");
    const v = doc.createElementNS(ns, "v");
    v.textContent = String(value);
    cell.appendChild(v);
  } else {
    cell.setAttribute("t", "inlineStr");
    const is = doc.createElementNS(ns, "is");
    const t = doc.createElementNS(ns, "t");
    t.setAttribute("xml:space", "preserve");
    t.textContent = String(value);
    is.appendChild(t);
    cell.appendChild(is);
  }
}

export async function exportExcelTemplate(releve: ReleveData): Promise<void> {
  const res = await fetch(TEMPLATE_URL);
  if (!res.ok) throw new Error("Modèle Excel introuvable (modele_releve.xlsm)");
  const zip = await JSZip.loadAsync(await res.arrayBuffer());

  // 1. remplir la feuille
  const sheetXml = await zip.file(SHEET_PATH)!.async("string");
  const doc = new DOMParser().parseFromString(sheetXml, "application/xml");
  const sheetData = doc.getElementsByTagName("sheetData")[0] as Element;
  for (const w of buildCellWrites(releve)) {
    setCell(doc, sheetData, w.ref, w.value);
  }
  zip.file(SHEET_PATH, new XMLSerializer().serializeToString(doc));

  // 2. forcer le recalcul à l'ouverture (les formules d'en-têtes miroirs, les
  //    sommes d'aires, etc. se mettent à jour)
  const wbXml = await zip.file("xl/workbook.xml")!.async("string");
  const wbDoc = new DOMParser().parseFromString(wbXml, "application/xml");
  let calcPr = wbDoc.getElementsByTagName("calcPr")[0] as Element | undefined;
  if (!calcPr) {
    calcPr = wbDoc.createElementNS(wbDoc.documentElement.namespaceURI, "calcPr");
    wbDoc.documentElement.appendChild(calcPr);
  }
  calcPr.setAttribute("fullCalcOnLoad", "1");
  zip.file("xl/workbook.xml", new XMLSerializer().serializeToString(wbDoc));

  // 3. télécharger en .xlsm (macro préservée)
  const blob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.ms-excel.sheet.macroEnabled.12",
    compression: "DEFLATE",
  });
  const safe = (releve.reference || releve.id).replace(/[^\w.-]+/g, "_");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `releve_${safe}.xlsm`;
  a.click();
  URL.revokeObjectURL(url);
}
