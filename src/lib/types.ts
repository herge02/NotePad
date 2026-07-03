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
}

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

export interface FormSection {
  id: string;
  num: number;
  title: string;
  short: string;
  group: string;
  fields?: FormField[];
  matrices?: MatrixDef[];
  special?: SpecialSection;
}

export interface FormGroup {
  id: string;
  title: string;
}

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
