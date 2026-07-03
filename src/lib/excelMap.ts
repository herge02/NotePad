// Cartographie relevé → cellules du fichier Excel original (Feuil3 de
// « Feuille relevé B.xlsm »). Les cases à cocher du classeur sont des « X »
// dans les colonnes A, C, E, G, I, K, M, O, à gauche des libellés.
// Chaque écriture cible une cellule précise relevée dans le modèle ;
// ce qui n'a pas de place dans le formulaire papier va dans la zone Notes.

import { getRoomSchema } from "./formSchema";
import type { DimsItem, FieldValue, MeasureValue, QuantityItem, ReleveData } from "./types";

export interface CellWrite {
  ref: string;
  value: string | number;
}

const X = "X";

// ---------------------------------------------------------------------------
// Accès aux valeurs
// ---------------------------------------------------------------------------

function str(v: FieldValue): string {
  return v === undefined || v === null ? "" : String(v);
}

function makeHelpers(r: ReleveData) {
  const v = r.values;
  return {
    v,
    text: (id: string) => str(v[id]),
    num: (id: string) => (v[id] === undefined ? undefined : Number(v[id])),
    yes: (id: string) => v[id] === "oui",
    no: (id: string) => v[id] === "non",
    radio: (id: string, opt: string) => v[id] === opt,
    inGroup: (id: string, opt: string) => Array.isArray(v[id]) && (v[id] as string[]).includes(opt),
    qty: (id: string, opt: string): QuantityItem | undefined => {
      const items = v[id] as Record<string, QuantityItem> | undefined;
      const item = items?.[opt];
      return item?.checked ? item : undefined;
    },
    dims: (id: string, opt: string): DimsItem | undefined => {
      const items = v[id] as Record<string, DimsItem> | undefined;
      const item = items?.[opt];
      return item?.checked ? item : undefined;
    },
    measure: (id: string): MeasureValue => (v[id] as MeasureValue) ?? {},
    autre: (id: string) => str(v[`${id}__autre`]),
  };
}

// ---------------------------------------------------------------------------
// Tables option → ligne (relevées dans le modèle)
// ---------------------------------------------------------------------------

const SECTEUR_ROWS: Record<string, number> = {
  Résidentiel: 13,
  Commercial: 14,
  Industriel: 15,
  Agricole: 16,
  "Para-industriel": 17,
  "De villégiature": 18,
  Autre: 19,
};

const UTILISATION_ROWS: Record<string, number> = {
  Résidentielle: 13,
  Commerciale: 14,
  "Mixte commerciale et résidentielle": 15,
  Industrielle: 16,
  Agricole: 17,
  "Para-industrielle": 18,
  Institutionnel: 19,
};

const UNITES_ROWS: Record<string, { row: number; label: string }> = {
  Studio: { row: 13, label: "studio" },
  "1½": { row: 14, label: "1½" },
  "2½": { row: 15, label: "2½" },
  "3½": { row: 16, label: "3½" },
  "4½": { row: 17, label: "4½" },
  "5½": { row: 18, label: "5½" },
  "6½": { row: 19, label: "6½" },
  Penthouse: { row: 20, label: "penthouse" },
};

const RENOVATION_ROWS: Record<string, number> = {
  Toiture: 52,
  Fenêtres: 53,
  Portes: 54,
  "Revêtements extérieurs": 55,
  Galeries: 56,
  Fondations: 57,
  "Sous-sol aménagé": 58,
  "Armoires de cuisine": 59,
  "Recouvrements de planchers": 60,
  Plomberie: 61,
  Chauffage: 62,
  Électricité: 63,
  Climatisation: 64,
  "Divisions intérieures": 65,
  Agrandissement: 66,
};

// colonnes des matrices par étage (jusqu'à 6 étages dans le formulaire papier)
const MATRIX_COLS = ["E", "G", "I", "K", "M", "O"];

const MATRIX_ROWS: Record<string, { headerRow?: number; autreRow?: number; autreLabelCell?: string; rows: Record<string, number> }> = {
  composition_planchers: {
    headerRow: 122,
    autreRow: 135,
    autreLabelCell: "A135",
    rows: {
      Asphalte: 123,
      "Béton sur pontage de bois mou": 124,
      "Dalle de béton sur le sol isolé ou non": 125,
      "Dalle de béton en radier": 126,
      "Dalle de béton sur pontage d'acier": 127,
      "Dalle structurale": 128,
      "Faux plancher": 129,
      "Gravier concassé": 130,
      "Mill-type": 131,
      "Pontage de bois mou sur ossature de bois mou": 132,
      "Pontage de bois mou sur pontage d'acier": 133,
      Insonorisation: 136,
    },
  },
  finition_planchers: {
    autreRow: 230,
    rows: {
      Aucun: 216,
      Ardoise: 217,
      "Bois dur": 218,
      Céramique: 219,
      Époxy: 220,
      Linoléum: 221,
      Marqueterie: 222,
      "Peinture sur dalle béton": 223,
      "Plancher flottant / ingénierie": 224,
      Prélart: 225,
      "Scellant sur béton": 226,
      Tapis: 227,
      "Tuiles de vinyle / composite": 228,
      "Tuiles de vinyle": 229,
    },
  },
  finition_plafonds: {
    autreRow: 244,
    autreLabelCell: "A244",
    rows: {
      Aucun: 233,
      Contreplaqué: 234,
      "Latte de bois": 235,
      Placoplâtre: 236,
      "Plafonds suspendus acoustique": 237,
      Plâtre: 238,
      "Stucco / texturé": 239,
      "Tôle acier émaillé": 240,
      "Tôle acier galvanisé": 241,
      "Tuiles de fibres pressées": 242,
      Vinyle: 243,
      Insonorisé: 246,
    },
  },
  finition_murs: {
    autreRow: 263,
    autreLabelCell: "A263",
    rows: {
      Aucun: 249,
      Brique: 250,
      Brute: 251,
      Céramique: 252,
      Contreplaqué: 253,
      Lambris: 254,
      "Latte de bois": 255,
      "Peinture sur blocs béton": 256,
      Pierre: 257,
      Placoplâtre: 258,
      Préfini: 259,
      "Tôle acier émaillé": 260,
      "Tôle acier galvanisé": 261,
      Vinyle: 262,
      Insonorisé: 264,
    },
  },
};

// revêtement des murs : 3 zones (colonnes C, E, G), lignes 160-179
const REVETEMENT_MURS_COLS = ["C", "E", "G"];
const REVETEMENT_MURS_ROWS: Record<string, number> = {
  "Acrylique sur béton": 160,
  "Acrylique sur isolation": 161,
  Agrégat: 162,
  "Bloc de béton à face éclatée": 163,
  Brique: 164,
  "Brique autoportante / Novabrick": 165,
  "Canexel / Smart / Goodfellow": 166,
  "Déclin aluminium": 167,
  "Déclin bois mou": 168,
  "Déclin fibres pressées": 169,
  "Déclin fibrociment": 170,
  "Déclin vinyle": 171,
  "Parement copolymère": 172,
  "Peinture sur": 173,
  "Pierre de": 174,
  "Tôle acier émaillé": 175,
  "Tôle acier galvanisé": 176,
  "Bloc architectural": 177,
  Autre: 178,
};

const REVETEMENT_TOITURE_ROWS: Record<string, number> = {
  Acier: 160,
  Ardoise: 161,
  "Bardeaux d'asphalte": 162,
  "Bardeaux de cèdre": 163,
  Béton: 164,
  Cuivre: 165,
  "Fibre de verre": 166,
  "Goudron et gravier": 167,
  "Membrane élastomère": 168,
  "Toiture permanente": 169,
  "Papier d'asphalte": 170,
  "Tôle à baguette": 171,
  "Tôle canadienne": 172,
  "Tôle acier émaillé": 173,
  "Tôle acier galvanisé": 174,
  "Tuiles de plastique": 175,
  "Toiture inversée": 176,
};

const PLOMBERIE_ROWS: Record<string, number> = {
  Abreuvoir: 369,
  "Bain thérapeutique": 370,
  "Bain tourbillon": 371,
  Bain: 372,
  "Bain-douche": 373,
  Bidet: 374,
  "Chauffe-eau": 375,
  "Chauffe-eau 40 gallons": 376,
  "Chauffe-eau 60 gallons": 377,
  "Cuve de lavage": 378,
  "Douche oculaire": 379,
  "Douche vapeur": 380,
  Douche: 381,
  "Évier de cuisine": 382,
  Fontaine: 383,
  Lavabo: 384,
  "Lavabo sur pied": 385,
  "Lavabo mural": 386,
  Sauna: 387,
  "Sortie boyau d'arrosage": 388,
  "Sortie laveuse-sécheuse": 389,
  "Spa intérieur": 390,
  Toilette: 391,
  "Tuyauterie seulement": 392,
  Urinoir: 393,
  Autre: 394,
};

const CHAUFFAGE_ROWS: Record<string, number> = {
  "Aérotherme vapeur": 326,
  "Aérotherme gaz naturel": 327,
  "Aérotherme propane": 328,
  "Aérotherme électrique": 329,
  "Air chaud alimenté par": 330,
  "Ventilo-convecteur": 331,
  "Géothermie (profondeur du puits en note)": 332,
  "Plinthe eau chaude alimentée par": 333,
  "Plinthes électriques": 334,
  "Radiant eau chaude alimenté par": 335,
  "Radiant électrique": 336,
  "Radiant suspendu": 337,
  Solaire: 338,
  "Thermopompe chauffage seulement": 339,
  "Thermopompe murale chauffage/climatisation": 340,
  "Unité refroidissement/chauffage combinés": 341,
  Aucun: 342,
};

const CLIMATISATION_ROWS: Record<string, number> = {
  "Air climatisé fenêtre": 349,
  "Thermopompe climatisation seulement": 350,
  "Unité de climatisation centrale": 351,
  "Unité murale": 352,
};

const VENTILATION_ROWS: Record<string, number> = {
  "Échangeur d'air": 358,
  "Récupérateur de chaleur": 359,
  "Système de déshumidification": 360,
  "Trappe de ventilation": 361,
  "Ventilateurs de plafond": 362,
  "Ventilateurs d'évacuation": 363,
  Humidification: 364,
};

// encastrements : trois groupes de colonnes — case A (libellés B),
// case E (libellés F), case K (libellés L). note → colonne libre à droite.
const ENCASTREMENTS_MAP: Record<string, { check: string; note?: string }> = {
  "Adoucisseur d'eau": { check: "A285", note: "D285" },
  "Armoires de cuisine en mélamine": { check: "A286", note: "D286" },
  "Ascenseur (capacité en note)": { check: "A287", note: "D287" },
  "Câble hydraulique (nb d'arrêts)": { check: "A288", note: "D288" },
  "Aspirateur central": { check: "A289", note: "D289" },
  "Bar (longueur en note)": { check: "A290", note: "D290" },
  Boiseries: { check: "A291", note: "D291" },
  Broyeur: { check: "A292", note: "D292" },
  "Câblage informatique": { check: "A293", note: "D293" },
  "Câblage téléphonique": { check: "A294", note: "D294" },
  "Casiers postaux": { check: "A295", note: "D295" },
  "Cheminée brique": { check: "A296", note: "D296" },
  "Cheminée métal": { check: "A297", note: "D297" },
  "Cheminée métal recouverte": { check: "A298", note: "D298" },
  "Cheminée pierre": { check: "A299", note: "D299" },
  "Cheminée blocs béton": { check: "A300", note: "D300" },
  "Chute à déchet": { check: "A301", note: "D301" },
  "Colonnes décoratives": { check: "A302", note: "D302" },
  Comptoir: { check: "A303", note: "D303" },
  "Cuisinière encastrée": { check: "A304", note: "D304" },
  "Escalier métal": { check: "A305", note: "D305" },
  "Escalier bois dur": { check: "A306", note: "D306" },
  "Four encastré": { check: "A307", note: "D307" },
  "Foyer bois": { check: "A308", note: "D308" },
  "Foyer gaz naturel": { check: "A309", note: "D309" },
  "Foyer propane": { check: "A310", note: "D310" },
  "Garde-robe de cèdre": { check: "A311", note: "D311" },
  Gorges: { check: "A312", note: "D312" },
  "Hotte suspendue (longueur en note)": { check: "A313", note: "D313" },
  "Îlot central": { check: "A314", note: "D314" },
  "Lave-vaisselle encastré": { check: "A315", note: "D315" },
  "Meubles encastrés": { check: "E285", note: "J285" },
  Mezzanine: { check: "E286", note: "J286" },
  Moulures: { check: "E287", note: "J287" },
  "Plaque de cuisson": { check: "E288", note: "J288" },
  "Poêle à bois": { check: "E289", note: "J289" },
  "Poêle à combustion lente": { check: "E290", note: "J290" },
  "Porte de voûte": { check: "E291", note: "J291" },
  "Portes françaises": { check: "E292", note: "J292" },
  "Portes intérieures embossées": { check: "E293", note: "J293" },
  "Portes-miroirs": { check: "E294", note: "J294" },
  "Puits de lumière": { check: "E295", note: "J295" },
  "Système d'alarme intrusion/feu": { check: "E296", note: "J296" },
  "Relié à centrale": { check: "E298", note: "J298" },
  "Détecteurs mouvement": { check: "E299", note: "J299" },
  "Caméras/moniteurs": { check: "E300", note: "J300" },
  "Système de son encastré": { check: "E301", note: "J301" },
  "Système de traitement d'eau": { check: "E302", note: "J302" },
  "Toit cathédrale": { check: "E303", note: "J303" },
  "Vanité salle de bain": { check: "E304", note: "J304" },
  "Comptoir stratifié": { check: "E305", note: "J305" },
  "Système intercom": { check: "E306", note: "J306" },
  "Contrôle d'accès": { check: "E307", note: "J307" },
};

const EQUIP_INDUSTRIELS_MAP: Record<string, { check: string; note?: string }> = {
  "Chambre à peinture": { check: "K286", note: "P286" },
  "Chambre froide": { check: "K287", note: "P287" },
  "Chambre réfrigérée": { check: "K288", note: "P288" },
  "Compacteur à déchet": { check: "K289", note: "P289" },
  Compresseur: { check: "K290", note: "P290" },
  "Congélateur/chambre réfrigérée": { check: "K291", note: "P291" },
  "Dévidoir d'huile": { check: "K292", note: "P292" },
  "Élévateur d'auto": { check: "K293", note: "P293" },
  "Élévateur hydraulique": { check: "K294", note: "P294" },
  Génératrice: { check: "K295", note: "P295" },
  "Ligne à air": { check: "K296", note: "P296" },
  "Pont roulant (longueur, largeur, capacité en note)": { check: "K297", note: "P297" },
  "Potence (portée en note)": { check: "K298", note: "P298" },
};

const PROTECTION_MAP: Record<string, string> = {
  "Cabinet avec boyau d'arrosage": "K305",
  "Déclencheur manuel": "K306",
  "Détecteur de chaleur": "K307",
  "Détecteurs de fumée": "K308",
  Extincteurs: "K309",
  "Lumières d'urgence": "K310",
  "Porte coupe-feu": "K311",
  Sirène: "K312",
  "Sortie d'urgence": "K313",
  "Système d'alarme incendie": "K314",
  "Détecteur de monoxyde de carbone": "K315",
};

// divers extérieur : libellés fusionnés B:D (case A), F:J (case E), L:P (case K)
const DIVERS_MAP: Record<string, string> = {
  "Abri d'auto": "A400",
  "Auvent (grandeur en note)": "A401",
  "Balcon en": "A402",
  Balustrades: "A403",
  "Barrières anti-chute glace/neige": "A404",
  "BBQ encastré": "A405",
  "Borne de protection": "A406",
  "Colonnes décoratives": "A407",
  Cloche: "A408",
  "Clocher (hauteur en note)": "A409",
  "Dalle béton sur sol (dimensions en note)": "A410",
  "Échelle extérieure (hauteur en note)": "A411",
  "Échelle extérieure avec crinoline": "A412",
  "Enseigne murale (dimensions en note)": "A413",
  "Entrée cave": "E400",
  "Escalier extérieur en": "E401",
  "Galerie en": "E402",
  Gargouilles: "E403",
  "Garde-corps en": "E404",
  Gazebo: "E405",
  Girouettes: "E406",
  "Gouttières et descentes (longueur en note)": "E407",
  "Horloge (grandeur en note)": "E408",
  "Lettrage (hauteur en note)": "E409",
  Lucarnes: "E410",
  Marquise: "E411",
  Ornementation: "E412",
  "Patios en": "E413",
  "Perrons de béton": "K400",
  "Quais de chargement": "K401",
  "Rampes handicapées": "K402",
  "Remises annexées": "K403",
  Sentinelles: "K404",
  "Tableaux lumineux (dimensions en note)": "K405",
  "Terrasses en": "K406",
  "Toits de galerie": "K407",
  Verrière: "K408",
};

const AMENAGEMENTS_ROWS: Record<string, number> = {
  Gazon: 421,
  "Système d'arrosage": 423,
  Asphalte: 426,
  Concassé: 428,
  Béton: 430,
  "Pavé interbloc": 432,
  "Trottoir en": 434,
};

// ---------------------------------------------------------------------------
// Construction des écritures
// ---------------------------------------------------------------------------

export function buildCellWrites(r: ReleveData): CellWrite[] {
  const h = makeHelpers(r);
  const writes: CellWrite[] = [];
  const notes: string[] = [];
  const put = (ref: string, value: string | number | undefined) => {
    if (value !== undefined && value !== "") writes.push({ ref, value });
  };
  const check = (ref: string, cond: boolean, content: string = X) => {
    if (cond) writes.push({ ref, value: content });
  };

  // ── En-tête / identification ────────────────────────────────────────────
  put("C3", h.text("no_dossier"));
  put("C6", h.text("personnes_rencontrees"));
  put("C9", h.text("inspecte_par"));
  put("K9", h.text("date_releve"));
  for (const [opt, row] of Object.entries(SECTEUR_ROWS)) {
    check(`A${row}`, h.radio("secteur", opt));
  }
  if (h.radio("secteur", "Autre") && h.autre("secteur")) notes.push(`Secteur autre : ${h.autre("secteur")}`);
  for (const [opt, row] of Object.entries(UTILISATION_ROWS)) {
    check(`C${row}`, h.radio("utilisation", opt));
  }
  for (const [opt, { row, label }] of Object.entries(UNITES_ROWS)) {
    const item = h.qty("types_unites", opt);
    if (item) put(`M${row}`, `${item.quantity ?? "X"} x ${label}`);
  }
  if (h.num("nb_logements") !== undefined) put("D20", `Nombre de logements  (  ${h.num("nb_logements")}  )`);
  if (h.num("nb_condominiums") !== undefined) put("D21", `Nombre de condominiums  (  ${h.num("nb_condominiums")}  )`);
  if (h.num("nb_commerces") !== undefined) put("D22", `Nombre de commerces  (  ${h.num("nb_commerces")}  )`);
  put("A25", h.text("type_entreprise"));
  put("A28", h.text("unites_visitees"));
  put("C30", h.num("annee_construction"));
  check("E29", h.yes("important"));
  check("I29", h.v["annee_non_confirmee"] === true);
  if (h.text("notes_generales")) notes.push(`Notes générales : ${h.text("notes_generales")}`);

  // ── Site, accès & conformité ─────────────────────────────────────────────
  const distances: [string, number][] = [
    ["dist_borne_fontaine", 32],
    ["dist_caserne", 33],
    ["dist_point_eau", 34],
  ];
  for (const [id, row] of distances) {
    const m = h.measure(id);
    if (m.value) put(m.unit === "km" ? `E${row}` : `C${row}`, m.value);
    put(`K${row}`, m.reference);
  }
  const ACCESS_ROWS: Record<string, number> = { Facile: 37, Moyenne: 38, Difficile: 39, Autre: 40 };
  for (const [opt, row] of Object.entries(ACCESS_ROWS)) check(`A${row}`, h.radio("accessibilite", opt));
  if (h.autre("accessibilite")) put("D40", h.autre("accessibilite"));
  check("E37", h.yes("plans_architecte"));
  put("K37", h.text("plans_architecte_nom"));
  check("E39", h.yes("plans_ingenieur"));
  put("K39", h.text("plans_ingenieur_nom"));
  check("E41", h.yes("plans_evacuation"));
  check("A44", h.yes("avis_non_conformite"));
  check("A45", h.no("avis_non_conformite"));
  put("B47", h.text("avis_non_conformite_batiment"));
  put("B48", h.text("avis_non_conformite_reference"));
  check("E44", h.yes("ordonnance_decontamination"));
  check("E45", h.no("ordonnance_decontamination"));
  put("E47", h.text("ordonnance_batiment"));
  put("E48", h.text("ordonnance_reference"));
  check("K44", h.yes("fiche_reference"));
  check("K45", h.no("fiche_reference"));

  // ── Rénovations ───────────────────────────────────────────────────────────
  const usedRenoRows = new Set<number>();
  for (const reno of r.renovations) {
    const row = RENOVATION_ROWS[reno.type];
    const detail = [reno.description, reno.notes].filter(Boolean).join(" — ");
    if (row && !usedRenoRows.has(row)) {
      usedRenoRows.add(row);
      put(`F${row}`, reno.year);
      put(`H${row}`, detail);
    } else {
      notes.push(`Rénovation ${reno.type}${reno.year ? ` (${reno.year})` : ""}${detail ? ` : ${detail}` : ""}`);
    }
  }

  // ── Étages & dimensions ───────────────────────────────────────────────────
  put("C68", h.num("nb_etages") ?? (r.floors.length || undefined));
  put("E72", h.num("largeur_batiment"));
  put("I72", h.num("profondeur_batiment"));
  check("M72", h.yes("dimensions_irregulieres"));
  put("P79", h.num("aire_bureau"));
  put("P80", h.num("aire_totale_batiment_industriel"));
  const bureau = h.num("aire_bureau");
  const totalInd = h.num("aire_totale_batiment_industriel");
  if (bureau !== undefined && totalInd) {
    put("O83", Math.round((bureau / totalInd) * 1000) / 10);
    put("O84", Math.round((1 - bureau / totalInd) * 1000) / 10);
  }

  // tableau superficie : lignes réservées par type d'étage
  const pools: Record<string, number[]> = {
    Muret: [77],
    "Vide sanitaire (moins de 5 pi)": [78],
    "Sous-sol": [79, 80],
    "Rez-de-chaussée": [81],
    Étage: [82, 83, 84, 85, 86, 87, 88, 89, 90, 91],
    Attique: [92],
    Mezzanine: [93],
  };
  const etagePool = pools["Étage"];
  for (const floor of r.floors) {
    const pool = pools[floor.type] ?? etagePool;
    const row = pool.shift() ?? etagePool.shift();
    if (row === undefined) {
      notes.push(`Étage non transcrit (tableau plein) : ${floor.label}`);
      continue;
    }
    if (floor.label && floor.label !== floor.type) put(`A${row}`, floor.label);
    put(`C${row}`, floor.area);
    put(`E${row}`, floor.perimeter);
    put(`G${row}`, floor.height);
    if (!floor.included) notes.push(`Étage exclu de l'aire totale : ${floor.label}`);
  }

  // ── Fondations ────────────────────────────────────────────────────────────
  const EXC_ROWS: Record<string, number> = {
    "En masse dans le sol": 102,
    "En tranchée dans le sol": 103,
    Aucune: 104,
    "Nivellement seulement": 105,
  };
  for (const [opt, row] of Object.entries(EXC_ROWS)) check(`A${row}`, h.inGroup("excavation", opt));
  const ASSISES_ROWS: Record<string, number> = { "Béton armé": 102, "Pierre sèche": 103, "Bois traité": 104, Aucune: 105 };
  for (const [opt, row] of Object.entries(ASSISES_ROWS)) check(`G${row}`, h.inGroup("assises", opt));
  const FOND_MAP: Record<string, string> = {
    "Béton coulé": "A109",
    "Béton armé": "A110",
    "Blocs de béton": "A111",
    "Pierres et mortiers": "A112",
    Imperméabilisant: "A113",
    "Isolation par extérieur": "A114",
    "Piliers excavés": "E109",
    "Techno-pieux": "E110",
    "Pieux d'enfoncement": "E111",
    "Colonnes stationnement souterrain": "E112",
  };
  for (const [opt, ref] of Object.entries(FOND_MAP)) check(ref, h.inGroup("fondations", opt));
  if (h.text("fondations_notes")) notes.push(`Fondations : ${h.text("fondations_notes")}`);

  // ── Structure ─────────────────────────────────────────────────────────────
  const STRUCT_MAP: Record<string, { check: string; pct: string }> = {
    Bois: { check: "A118", pct: "C118" },
    "Bois post & beam": { check: "A119", pct: "C119" },
    "Mill type": { check: "A120", pct: "C120" },
    Béton: { check: "E118", pct: "I118" },
    "Béton préfabriqué": { check: "E119", pct: "I119" },
    "Blocs de béton": { check: "E120", pct: "I120" },
    Acier: { check: "K118", pct: "O118" },
    "Acier léger": { check: "K119", pct: "O119" },
    "Acier préfabriqué": { check: "K120", pct: "O120" },
  };
  const structure = (h.v["structure_batiment"] as Record<string, number>) ?? {};
  for (const [opt, pct] of Object.entries(structure)) {
    const m = STRUCT_MAP[opt];
    if (m) {
      check(m.check, true);
      put(m.pct, pct);
    }
  }

  const MURS_EXT_MAP: Record<string, string> = {
    "Montant de bois": "A140",
    "Bois post & beam": "A141",
    "Pièce sur pièce": "A142",
    Béton: "A143",
    "Béton préfabriqué": "A144",
    "Blocs de béton": "C140",
    "Montant métallique": "C141",
    "Acier léger": "C142",
    "Acier préfabriqué": "C143",
  };
  for (const [opt, ref] of Object.entries(MURS_EXT_MAP)) check(ref, h.inGroup("murs_exterieurs", opt));
  const MITOYENS_ROWS: Record<string, number> = { Bois: 140, Béton: 141, "Blocs de béton": 142, Maçonnerie: 143, Aucun: 144 };
  for (const [opt, row] of Object.entries(MITOYENS_ROWS)) check(`G${row}`, h.inGroup("murs_mitoyens", opt));
  const ISO_ROWS: Record<string, number> = { "Présumé standard": 140, Aucune: 141, Novoclimat: 142, Autre: 143 };
  for (const [opt, row] of Object.entries(ISO_ROWS)) check(`M${row}`, h.radio("isolation", opt));
  put("N144", h.autre("isolation"));

  // toiture
  put("I149", h.num("toiture_pente_pct"));
  put("G149", h.num("toiture_pente_ratio"));
  put("N147", h.num("toiture_plate_pct"));
  const TOIT_STRUCT_MAP: Record<string, string> = {
    "Fermes préfabriquées en bois": "A149",
    "Structure de bois": "A150",
    "Structure d'acier": "A151",
    "Structure béton": "A152",
    "Structure acier avec dalle béton": "K151",
  };
  for (const [opt, ref] of Object.entries(TOIT_STRUCT_MAP)) check(ref, h.inGroup("toiture_structure", opt));

  // ── Matrices par étage ────────────────────────────────────────────────────
  const floorIds = r.floors.map((f) => f.id);
  const floorCol = (floorId: string) => {
    const idx = floorIds.indexOf(floorId);
    return idx >= 0 && idx < MATRIX_COLS.length ? MATRIX_COLS[idx] : undefined;
  };
  // en-têtes de colonnes = libellés d'étages (les sections miroirs suivent par formule)
  r.floors.slice(0, MATRIX_COLS.length).forEach((f, i) => put(`${MATRIX_COLS[i]}122`, f.label));

  for (const [matrixId, def] of Object.entries(MATRIX_ROWS)) {
    const perFloor = r.matrices[matrixId] ?? {};
    for (const [floorId, opts] of Object.entries(perFloor)) {
      const col = floorCol(floorId);
      if (!col) {
        if (Object.keys(opts).length > 0) {
          notes.push(`Matrice ${matrixId} : étage hors formulaire papier (7e étage et +)`);
        }
        continue;
      }
      for (const [opt, pct] of Object.entries(opts)) {
        const row = def.rows[opt] ?? (opt === "Autre" ? def.autreRow : undefined);
        if (row === undefined) continue;
        if (opt === "Autre" && def.autreLabelCell) put(def.autreLabelCell, "Autre");
        put(`${col}${row}`, pct);
      }
    }
  }

  // revêtement des murs (3 zones max dans le papier)
  const revMurs = r.matrices["revetement_murs"] ?? {};
  for (const [floorId, opts] of Object.entries(revMurs)) {
    const idx = floorIds.indexOf(floorId);
    if (idx < 0 || idx >= REVETEMENT_MURS_COLS.length) {
      if (Object.keys(opts).length > 0) {
        const label = r.floors.find((f) => f.id === floorId)?.label ?? floorId;
        notes.push(
          `Revêtement murs — ${label} : ${Object.entries(opts)
            .map(([o, p]) => `${o} ${p} %`)
            .join(", ")}`
        );
      }
      continue;
    }
    const col = REVETEMENT_MURS_COLS[idx];
    for (const [opt, pct] of Object.entries(opts)) {
      const row = REVETEMENT_MURS_ROWS[opt];
      if (row !== undefined) put(`${col}${row}`, pct);
    }
  }

  // revêtement de toiture (X devant le libellé)
  for (const [opt, row] of Object.entries(REVETEMENT_TOITURE_ROWS)) {
    check(`I${row}`, h.inGroup("revetement_toiture", opt));
  }
  if (h.inGroup("revetement_toiture", "Autre")) {
    check("I177", true);
    put("J177", h.autre("revetement_toiture") || "Autre");
  }

  // ── Ouvertures ────────────────────────────────────────────────────────────
  const FENETRES_MAP: Record<string, string> = {
    Acier: "A185",
    Aluminium: "A186",
    PVC: "A187",
    Bois: "A188",
    Hybride: "C185",
    Volet: "C186",
    "Grillage de sécurité": "C187",
  };
  for (const [opt, ref] of Object.entries(FENETRES_MAP)) check(ref, h.inGroup("fenetres", opt));
  put("F185", h.text("fenetres_hybride_precision"));
  if (h.inGroup("fenetres", "Autre")) {
    check("C189", true);
    put("F189", h.autre("fenetres") || "Autre");
  }
  const GARAGE_MAP: Record<string, string> = {
    Bois: "I185",
    Aluminium: "I186",
    "Ouvre-porte automatique": "I187",
    Acier: "I188",
  };
  for (const [opt, ref] of Object.entries(GARAGE_MAP)) check(ref, h.inGroup("portes_garage", opt));
  if (h.inGroup("portes_garage", "Autre")) {
    check("I189", true);
    put("L189", h.autre("portes_garage") || "Autre");
  }
  const PIETONNES_MAP: Record<string, string> = {
    Acier: "A193",
    Aluminium: "A194",
    "Verre thermos patio": "A195",
    Bois: "A196",
  };
  for (const [opt, ref] of Object.entries(PIETONNES_MAP)) check(ref, h.inGroup("portes_pietonnes", opt));
  if (h.inGroup("portes_pietonnes", "Autre")) {
    check("A197", true);
    put("D197", h.autre("portes_pietonnes") || "Autre");
  }
  const COULISSANTES_MAP: Record<string, string> = {
    Bois: "I193",
    Aluminium: "I194",
    PVC: "I195",
    Toiles: "H197",
    Transparente: "I199",
    "À rouleaux": "I201",
  };
  for (const [opt, ref] of Object.entries(COULISSANTES_MAP)) check(ref, h.inGroup("portes_coulissantes", opt));
  if (h.inGroup("portes_coulissantes", "Autre")) {
    check("I200", true);
    put("L200", h.autre("portes_coulissantes") || "Autre");
  }

  // ── Finition intérieure (hors matrices) ───────────────────────────────────
  check("C269", h.radio("sous_sol_pourtour", "Non fini"));
  if (h.radio("sous_sol_pourtour", "Fini à %")) put("D269", h.num("sous_sol_pourtour_pct") ?? X);
  check("E269", h.radio("sous_sol_pourtour", "Isolé seulement"));
  check("I269", h.radio("sous_sol_pourtour", "Isolé et latté"));
  check("M269", h.radio("sous_sol_pourtour", "Placoplâtre sans finition"));
  const DIV_ROWS: Record<string, number> = {
    "Colombage bois": 273,
    "Colombage métallique": 274,
    "Blocs béton": 275,
    Béton: 276,
    "Blocs de verre": 277,
    Vitrine: 278,
  };
  for (const [opt, row] of Object.entries(DIV_ROWS)) check(`A${row}`, h.inGroup("composition_divisions", opt));
  if (h.inGroup("composition_divisions", "Autre")) {
    check("C273", true);
    put("E273", h.autre("composition_divisions") || "Autre");
  }
  if (h.text("finition_notes")) notes.push(`Finition intérieure : ${h.text("finition_notes")}`);

  // ── Encastrements / équipements / protection ─────────────────────────────
  const fillQtyMap = (
    fieldId: string,
    map: Record<string, { check: string; note?: string } | string>
  ) => {
    for (const [opt, target] of Object.entries(map)) {
      const item = h.qty(fieldId, opt);
      if (!item) continue;
      const t = typeof target === "string" ? { check: target } : target;
      put(t.check, item.quantity ?? X);
      if (item.note) {
        if (t.note) {
          put(t.note, item.note);
        } else {
          notes.push(`${opt} : ${item.note}`);
        }
      }
    }
  };
  fillQtyMap("encastrements", ENCASTREMENTS_MAP);
  fillQtyMap("equipements_industriels", EQUIP_INDUSTRIELS_MAP);
  fillQtyMap("protection_incendie", PROTECTION_MAP);

  // ── Électricité / chauffage / ventilation / plomberie ─────────────────────
  check("B320", h.v["interrupteur_principal"] === true, "Oui");
  const amp = h.text("amperage") === "Autre" ? h.autre("amperage") : h.text("amperage");
  put("A321", amp ? `${amp} A` : undefined);
  put("C321", h.text("voltage"));
  const ELEC_MAP: Record<string, string> = {
    Fusibles: "C320",
    Disjoncteurs: "E320",
    "Relié au bâtiment principal": "E321",
    "Éclairage LED": "E322",
    Fluorescents: "E323",
    Transformateur: "K321",
    "Câblage souterrain": "K322",
    "Inverseur automatique pour génératrice": "K323",
  };
  for (const [opt, ref] of Object.entries(ELEC_MAP)) check(ref, h.inGroup("electricite_options", opt));

  const fillRowQty = (fieldId: string, rows: Record<string, number>, col: string) => {
    for (const [opt, row] of Object.entries(rows)) {
      const item = h.qty(fieldId, opt);
      if (!item) continue;
      put(`${col}${row}`, item.quantity ?? X);
      if (item.note) notes.push(`${opt} : ${item.note}`);
    }
  };
  fillRowQty("chauffage", CHAUFFAGE_ROWS, "E");
  fillRowQty("climatisation", CLIMATISATION_ROWS, "E");
  fillRowQty("ventilation", VENTILATION_ROWS, "E");

  for (const [opt, row] of Object.entries(PLOMBERIE_ROWS)) {
    const item = h.qty("plomberie", opt);
    if (!item) continue;
    put(`A${row}`, `(  ${item.quantity ?? "X"}  )`);
    if (opt === "Autre" && item.note) put("D394", item.note);
  }

  if (h.yes("gicleurs_presents")) {
    const types = (h.v["gicleurs"] as string[]) ?? [];
    put("E397", types.length ? types.map((t) => t.replace("Gicleurs ", "")).join(", ") : "Oui");
    if (h.text("gicleurs_notes")) notes.push(`Gicleurs : ${h.text("gicleurs_notes")}`);
  }

  // ── Divers extérieur ──────────────────────────────────────────────────────
  for (const [opt, ref] of Object.entries(DIVERS_MAP)) {
    const item = h.qty("divers_exterieur", opt);
    if (!item) continue;
    put(ref, item.quantity ?? X);
    if (item.note) notes.push(`${opt} : ${item.note}`);
  }

  // ── Aménagements ──────────────────────────────────────────────────────────
  for (const [opt, row] of Object.entries(AMENAGEMENTS_ROWS)) {
    const item = h.dims("amenagements", opt);
    if (!item) continue;
    check(`A${row}`, true);
    put(`D${row}`, item.length);
    put(`H${row}`, item.width);
    put(`L${row}`, item.area);
  }
  const arbres = h.qty("vegetation", "Arbres");
  if (arbres) {
    check("A436", true);
    put("D436", arbres.quantity);
    put("J436", arbres.note);
  }
  const haie = h.qty("vegetation", "Haie");
  if (haie) {
    check("G436", true);
    if (haie.quantity || haie.note) notes.push(`Haie : ${[haie.quantity, haie.note].filter(Boolean).join(" — ")}`);
  }

  // ── Services ──────────────────────────────────────────────────────────────
  check("C438", h.yes("services_municipaux"));
  if (h.no("services_municipaux")) put("E438", "Non");
  check("A440", h.v["puits"] === true);
  const FOSSE_MAP: Record<string, string> = { Standard: "C442", "Bio-tourbe": "E442", Roseau: "G442" };
  for (const [opt, ref] of Object.entries(FOSSE_MAP)) check(ref, h.radio("fosse_septique", opt));
  if (h.radio("fosse_septique", "Autre")) put("K442", h.autre("fosse_septique") || "X");
  check("A444", h.v["champ_epuration"] === true);
  check("A446", h.v["enseigne_sur_pied"] === true);
  put("E446", h.text("enseigne_grandeur"));
  put("K446", h.text("enseigne_hauteur_poteau"));
  if (h.num("lampadaires_quantite") !== undefined) {
    check("A448", true);
    put("C448", h.num("lampadaires_quantite"));
    put("E448", h.num("lampadaires_hauteur"));
    put("K448", h.num("lampadaires_nb_lumieres"));
  }
  check("A449", h.v["pancarte_contreplaque"] === true);
  check("G449", h.v["poteaux"] === true);

  // ── Piscine / SPA / chauffage piscine ─────────────────────────────────────
  if (h.yes("piscine")) {
    const PAROIS_CREUSEE: Record<string, string> = { Acier: "A453", "Résine de synthèse": "A454", Béton: "A455" };
    for (const [opt, ref] of Object.entries(PAROIS_CREUSEE)) check(ref, h.radio("piscine_parois_creusee", opt));
    const PAROIS_HT: Record<string, string> = { Acier: "C453", "Aluminium/résine": "C454" };
    for (const [opt, ref] of Object.entries(PAROIS_HT)) check(ref, h.radio("piscine_parois_horsterre", opt));
    if (h.radio("piscine_parois_creusee", "Autre")) notes.push(`Parois piscine : ${h.autre("piscine_parois_creusee")}`);
    if (h.radio("piscine_parois_horsterre", "Autre")) notes.push(`Parois piscine : ${h.autre("piscine_parois_horsterre")}`);
    const forme = h.text("piscine_forme") === "Autre" ? h.autre("piscine_forme") : h.text("piscine_forme");
    put("J455", forme);
    put("Q453", h.num("piscine_quantite"));
    check("O454", h.v["piscine_eclairage"] === true);
    check("O457", h.v["piscine_glissoire"] === true);
    const CHAUFF_PISCINE: Record<string, string> = {
      "Thermopompe 70–85 MBH": "A463",
      "Thermopompe 107–140 MBH": "A465",
      "Chauffe-eau gaz 125–250 MBH": "A467",
      "Chauffe-eau gaz 250–400 MBH": "A469",
      "Panneau solaire": "I463",
      "Chauffe-eau huile": "I465",
      "Chauffe-eau bois": "I467",
    };
    for (const [opt, ref] of Object.entries(CHAUFF_PISCINE)) check(ref, h.inGroup("chauffage_piscine", opt));
  }
  if (h.yes("spa")) {
    put("A459", h.num("spa_places"));
    check("C459", h.radio("spa_niveau", "Normal"));
    check("E459", h.radio("spa_niveau", "Standard"));
    check("G459", h.radio("spa_niveau", "Supérieur"));
  }

  // ── Clôture / soutènement / foyer extérieur ───────────────────────────────
  if (h.yes("cloture_presente")) {
    const types = (h.v["cloture_type"] as string[]) ?? [];
    check("A472", true);
    const typesText = [...types.filter((t) => t !== "Autre"), h.autre("cloture_type")].filter(Boolean).join(", ");
    put("B473", typesText);
    const haut = h.text("cloture_hauteur");
    check("K472", haut === "4 pi");
    check("K474", haut === "5 pi");
    check("K476", haut === "6 pi");
    if (haut === "Autre") notes.push(`Clôture hauteur : ${h.autre("cloture_hauteur")}`);
    put("O472", h.num("cloture_longueur"));
  }
  if (h.yes("soutenement_present")) {
    put("D479", h.num("soutenement_longueur"));
    put("H479", h.num("soutenement_largeur"));
    put("L479", h.num("soutenement_aire"));
    put("E482", h.num("soutenement_quantite"));
  }
  if (h.yes("foyer_exterieur")) {
    put("C483", "Oui");
    if (h.text("foyer_exterieur_notes")) notes.push(`Foyer extérieur : ${h.text("foyer_exterieur_notes")}`);
  }

  // ── Pièces (absentes du formulaire papier) ────────────────────────────────
  if (r.rooms.length > 0) {
    const parType = new Map<string, number>();
    for (const room of r.rooms) {
      const label = getRoomSchema(room.type)?.label ?? room.type;
      parType.set(label, (parType.get(label) ?? 0) + 1);
    }
    notes.push(
      `Relevé par pièce (${r.rooms.length}) : ${[...parType.entries()]
        .map(([t, n]) => `${t} × ${n}`)
        .join(", ")} — détail dans l'export JSON/CSV`
    );
  }

  // ── Zone Notes (2 lignes fusionnées A416 / A417) ──────────────────────────
  if (notes.length > 0) {
    const all = notes.join("  |  ");
    const cut = all.length > 220 ? all.lastIndexOf("|", 220) : -1;
    if (cut > 0) {
      put("A416", all.slice(0, cut).trim());
      put("A417", all.slice(cut + 1).trim());
    } else {
      put("A416", all);
    }
  }

  return writes;
}
