// Modèle de données du relevé de bâtiment.
// Principe : on documente des faits (matériaux, quantités, dimensions,
// présence/absence). Aucun champ ne qualifie l'état d'une composante.

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "radio"
  | "select"
  | "yesno"
  | "checkbox"
  | "checkbox-group"
  | "quantity-list"
  | "dims-list"
  | "measure"
  | "percentage-group";

export interface ShowIf {
  field: string;
  /** valeur exacte attendue */
  equals?: unknown;
  /** la valeur (string[] ou string) doit contenir cet élément */
  includes?: string;
  /** champ simplement non vide */
  truthy?: boolean;
  /** la valeur doit être dans cette liste */
  in?: unknown[];
  /** la valeur ne doit pas être dans cette liste (non saisi = visible) */
  notIn?: unknown[];
}

/** niveaux de divulgation : essentiel visible, détail à 1 tap, avancé caché */
export type FieldTier = "essential" | "detail" | "advanced";

export interface FormField {
  id: string;
  label: string;
  type: FieldType;
  options?: string[];
  /** ajoute une option « Autre » + champ de précision (stocké sous `${id}__autre`) */
  other?: boolean;
  /** suffixe d'unité affiché (ex. « pi ») */
  unit?: string;
  /** unités sélectionnables (type measure) */
  units?: string[];
  /** champ « référence » accompagnant une mesure */
  withReference?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  showIf?: ShowIf;
  /** quantity-list : afficher un champ note par item */
  withNote?: boolean;
  /** quantity-list : libellé du champ quantité (défaut « Qté ») */
  quantityLabel?: string;
  /** quantity-list : masquer le champ quantité (simple présence + note) */
  noQuantity?: boolean;
  required?: boolean;
  help?: string;
  /** niveau de divulgation (défaut : essential) */
  tier?: FieldTier;
  /** options proposées en chips rapides (listes longues) */
  frequent?: string[];
  /** préremplir avec la dernière valeur saisie (nouveau relevé) */
  rememberLast?: boolean;
}

/** Matrice de composition par étage (options × étages, valeurs en %) */
export interface MatrixDef {
  id: string;
  title: string;
  options: string[];
  other?: boolean;
  /** true : la somme par étage doit rester ≤ 100 % */
  validateSum?: boolean;
  help?: string;
}

export type SpecialSection = "floors" | "rooms" | "renovations" | "summary";

export type Phase = 1 | 2 | 3 | 4 | 5;

export interface PhaseDef {
  id: Phase;
  title: string;
  short: string;
}

/** Un module = une tâche = un écran de saisie. */
export interface ModuleDef {
  id: string;
  phase: Phase;
  /** titre = la tâche (« Étages du bâtiment ») */
  title: string;
  short: string;
  /** module opt-in : n'existe qu'après réponse « oui » à la question */
  optIn?: { question: string; fieldId: string };
  /** filtrage par profil (secteur / utilisation) — réactivable via « Ajouter » */
  visibleWhen?: ShowIf;
  fields?: FormField[];
  matrices?: MatrixDef[];
  special?: SpecialSection;
  help?: string;
}

export type ModuleStatus = "todo" | "in-progress" | "done" | "na";

// ---------------------------------------------------------------------------
// Données saisies
// ---------------------------------------------------------------------------

export const FLOOR_TYPES = [
  "Muret",
  "Vide sanitaire (moins de 5 pi)",
  "Sous-sol",
  "Rez-de-chaussée",
  "Étage",
  "Attique",
  "Mezzanine",
  "Autre",
] as const;

export type FloorType = (typeof FLOOR_TYPES)[number];

export interface FloorData {
  id: string;
  type: FloorType;
  /** libellé personnalisé (ex. « 2e étage ») */
  label: string;
  area?: number;
  perimeter?: number;
  height?: number;
  /** inclure dans l'aire totale */
  included: boolean;
}

export interface RoomData {
  id: string;
  /** id du type de pièce dans roomSchemas */
  type: string;
  label: string;
  floorId?: string;
  width?: number;
  depth?: number;
  area?: number;
  floorFinishes: string[];
  wallFinishes: string[];
  ceilingFinishes: string[];
  notes?: string;
  /** valeurs des champs spécifiques au type de pièce */
  specific: Record<string, unknown>;
  // Photos : prévu pour une version future (par pièce).
}

export interface RoomTypeDef {
  id: string;
  label: string;
  fields: FormField[];
}

export interface RenovationData {
  id: string;
  type: string;
  description?: string;
  year?: string;
  notes?: string;
}

/** item d'une quantity-list : présence + quantité + note */
export interface QuantityItem {
  checked: boolean;
  quantity?: string;
  note?: string;
}

/** item d'une dims-list : présence + dimensions */
export interface DimsItem {
  checked: boolean;
  length?: string;
  width?: string;
  area?: string;
  note?: string;
}

/** mesure avec unité et référence (ex. distance borne-fontaine) */
export interface MeasureValue {
  value?: string;
  unit?: string;
  reference?: string;
}

/** matrixId -> floorId -> option -> pourcentage */
export type MatrixValues = Record<string, Record<string, Record<string, number>>>;

export type FieldValue =
  | string
  | number
  | boolean
  | string[]
  | MeasureValue
  | Record<string, QuantityItem>
  | Record<string, DimsItem>
  | Record<string, number>
  | undefined;

export interface ReleveData {
  /** identifiant interne stable */
  id: string;
  /** référence lisible : numéro de dossier + date */
  reference: string;
  createdAt: string;
  updatedAt: string;
  values: Record<string, FieldValue>;
  floors: FloorData[];
  rooms: RoomData[];
  renovations: RenovationData[];
  matrices: MatrixValues;
}

export interface ReleveMeta {
  id: string;
  reference: string;
  updatedAt: string;
}
