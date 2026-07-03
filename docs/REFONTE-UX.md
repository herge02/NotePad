# Refonte UX — Relevé de bâtiment (iPad / terrain)

> Spécification exploitable pour refactoriser l'application existante
> (Next.js + formSchema.ts). Objectif : saisie rapide, claire, fiable, peu
> fatigante — n'afficher que ce qui est nécessaire au moment présent.

---

## A. Diagnostic UX de l'application actuelle

Audit chiffré du schéma réel (`src/lib/formSchema.ts`) :

| # | Section | Champs | Options visibles | Conditionnels | Requis |
|---|---|---|---|---|---|
| 1 | Dossier | 7 | 0 | 0 | 3 |
| 2 | Identification | 9 | 21 | 0 | 2 |
| 3 | Site & conformité | 16 | 3 | 6 | 0 |
| 4 | Dimensions | 6 | 0 | 0 | 0 |
| 5 | Fondations | 4 | 18 | 0 | 0 |
| 6 | Superstructure | 8 | 31 + matrice 12 | 1 | 0 |
| 7 | Enveloppe | 6 | 38 + matrice 18 | 1 | 0 |
| 8 | Finition int. | 4 | 11 + 3 matrices (41) | 1 | 0 |
| 10 | Méc./élec./plomb. | 10 | **68** | 0 | 0 |
| 11 | Équipements | 3 | **77** | 0 | 0 |
| 12 | Extérieur | **36** | **83** | 17 | 0 |

### Problèmes CRITIQUES

1. **Listes exhaustives affichées en permanence.** Les `quantity-list`
   (encastrements : 53 items, plomberie : 25, divers extérieur : 36) affichent
   *toutes* les options, cochées ou non. Sur le terrain, 95 % des lignes sont
   du bruit : l'inspecteur cherche 3-4 items dans une mer de cases vides.
   *Impact : lenteur, fatigue oculaire, risque d'oubli par saturation.*

2. **Aucune adaptation au contexte du bâtiment.** Un relevé « Résidentiel »
   affiche quand même pont roulant, quais de chargement, chambre à peinture,
   gicleurs, % espace usine. Le choix Secteur/Utilisation (section 2) ne
   filtre rien. *Impact : ~30 % des contrôles ne s'appliquent jamais au
   dossier en cours.*

3. **Sections monolithiques.** La section 12 (Extérieur) empile 36 champs,
   6 sous-thèmes (divers, aménagements, services, piscine, clôture,
   soutènement) dans un seul déroulé — plusieurs écrans de scroll pour une
   « section ». *Impact : perte de repère, la barre de progression (binaire
   commencé/vide) ne dit pas ce qui reste à faire.*

4. **Pas de flux guidé ni de notion de « complet ».** La pastille verte
   signifie « au moins une donnée », jamais « terminé ». L'utilisateur ne
   sait ni où il en est, ni quelle est la prochaine action utile.

### Problèmes IMPORTANTS

5. **Validation reportée à la fin.** Les 5 champs requis ne sont signalés
   qu'au Résumé (section 14). Aucune validation près du champ, aucun état
   d'erreur inline. Les alertes >100 % apparaissent dans la matrice mais ne
   remontent nulle part tant qu'on n'ouvre pas le Résumé.

6. **Tableau d'étages dense en saisie directe** (7 colonnes). Correct en
   paysage, pénible en portrait et hostile au pouce (cellules étroites).

7. **Aucun raccourci de répétition.** Les finitions se ressemblent d'un étage
   à l'autre : il faut re-chercher et re-saisir chaque matériau et chaque %
   pour chaque étage et chaque matrice (jusqu'à 3 matrices × N étages).
   Pas de « copier de l'étage précédent », pas de « dernier choix utilisé »,
   pas de raccourci « 100 % ».

8. **Modules rares toujours déployés.** Piscine, SPA, clôture, soutènement,
   gicleurs : présents dans 1 dossier sur N, mais leurs déclencheurs et
   champs occupent l'écran de tous les dossiers.

### Problèmes MINEURS

9. Actions dupliquées (Exporter en topbar *et* au résumé) ; « Brouillon »
   ambigu (c'est un bouton *Sauvegarder*).
10. Types de pièces en liste plate de 11 boutons sans hiérarchie de fréquence.
11. Textes d'aide toujours visibles (ex. sous-titres de sections répétables)
    au lieu d'être disponibles à la demande.

---

## B. Nouvelle structure de l'application

### Principe : un hub de modules + des écrans de saisie focalisés

On remplace « 14 sections égales dans une longue page » par **deux niveaux** :

1. **Hub du relevé** (écran d'accueil du dossier) : cartes de modules avec
   statut clair — la carte dit *quoi faire ensuite*, pas *tout ce qui existe*.
2. **Écran de module** : une tâche à la fois, plein écran, navigation
   Précédent / Suivant, actions toujours visibles en bas.

### Les 5 phases (stepper léger, toujours visible)

| Phase | Modules | Pourquoi cette phase existe |
|---|---|---|
| **1. Identification** | Dossier + usage du bâtiment (fusion sections 1-2) | 90 s au départ : identifie le dossier **et** configure le profil (secteur/utilisation) qui filtre tout le reste. |
| **2. Site** | Distances, accès, conformité (section 3) | Se remplit en arrivant sur place, avant d'entrer. Regroupé car même moment de collecte. |
| **3. Bâtiment** | Étages & dimensions → Fondations → Structure → Enveloppe → Finitions | L'ordre physique du relevé (du sol vers le haut). Les étages d'abord : ils génèrent les matrices. |
| **4. Intérieur & systèmes** | Pièces · Méc./élec./plomberie · Équipements | Le tour intérieur. Filtré par profil (résidentiel ≠ industriel). |
| **5. Extérieur & clôture du dossier** | Extérieur (sous-modules opt-in) · Rénovations · **Vérification** | Le tour extérieur, puis la revue finale avant export. |

### Visibilité des champs — trois niveaux partout

- **a) Essentiel (visible par défaut)** : ce qui est rempli dans ≥ 80 % des
  dossiers. Ex. phase 1 : n° dossier, date (préremplie), inspecté par
  (mémorisé), secteur, utilisation, année de construction. 6 contrôles.
- **b) Utile (1 tap)** : bloc « Plus de détails » replié dans chaque écran.
  Ex. personnes rencontrées, unités visitées, types d'unités avec quantités,
  nb condos/commerces.
- **c) Avancé / rare (opt-in)** : modules entiers derrière une question.
  Ex. « Piscine ? Oui/Non » — le module n'existe pas tant que la réponse
  n'est pas Oui. Idem SPA, clôture, soutènement, gicleurs, équipements
  industriels, avis de non-conformité, ordonnance.

### Filtrage par profil (décision de la phase 1)

| Profil (secteur/utilisation) | Masqué d'office (réactivable via « Ajouter un module ») |
|---|---|
| Résidentiel | Équipements industriels, gicleurs, quais, % bureaux/usine, aire bureau |
| Commercial / Institutionnel | Types d'unités résidentielles (studio…penthouse) |
| Industriel | Types d'unités ; ajoute aire bureau/usine dans Dimensions |
| Agricole / villégiature | Équipements industriels, casiers postaux, ascenseur |

Un module masqué reste accessible : bouton « + Ajouter un module » en bas du
hub (liste des modules "sans objet"). Rien n'est supprimé, tout est déplacé.

---

## C. Règles d'affichage conditionnel

Logique plate — **jamais plus de 2 niveaux** (question → champs, ou
choix → précision). Notation : `si X → afficher Y`.

### Règles de profil (évaluées en continu)
- `secteur = Résidentiel` → masquer modules {équip. industriels, gicleurs},
  masquer champs {aire_bureau, aire_totale_industrielle}.
- `utilisation ∈ {Industrielle}` → afficher {aire_bureau, aire_totale}, masquer {types_unites}.
- `secteur = Autre` → afficher champ précision (déjà en place).

### Règles opt-in (une question = un module)
- `piscine? = oui` → module Piscine (type, parois selon type, forme, qté, options, chauffage).
- `piscine_type = Creusée` → parois creusée ; `= Hors-terre` → parois hors-terre. *(Fin de la profondeur.)*
- `spa? = oui` → places, niveau produit.
- `clôture? = oui` → type, hauteur, longueur.
- `soutènement? = oui` → L/l/aire/qté.
- `avis de non-conformité = oui` → bâtiment + référence. Idem ordonnance.
- `plans architecte = oui` → nom. Idem ingénieur.
- `chauffe-eau présent = oui` (buanderie) → capacité.

### Règles de génération (déjà en place, conservées)
- Étages saisis (phase 3) → génèrent les matrices et le menu « étage » des pièces.
- Type de pièce → champs spécifiques du type (roomSchemas).
- L × P saisies → aire calculée (modifiable).

### Se repérer (toujours à l'écran)
- **Stepper 5 phases** en haut : phase courante en gras, phases complètes
  cochées. Un tap = retour au hub de la phase.
- **Titre d'écran = tâche** (« Étages du bâtiment », « Finitions — RDC »).
- **Barre basse** : Précédent · état de sauvegarde · Suivant. « Suivant »
  mène toujours à la prochaine tâche incomplète.

---

## D. Wireframes textuels

### Écran 0 — Mes relevés
- **Objectif** : reprendre ou créer un dossier.
- **Visible** : bouton « + Nouveau relevé » (primaire), liste des relevés
  (référence, date, jauge de complétude, badge « anomalies » si >100 % ou requis manquants).
- **Actions** : ouvrir, dupliquer (nouveau dossier prérempli des choix stables), supprimer (confirmation), exporter.
- **Masqué** : rien — cet écran n'a qu'une décision.

### Écran 1 — Hub du relevé
- **Objectif** : voir où on en est, aller à la prochaine tâche.
- **Visible** : stepper 5 phases ; cartes de modules de la phase courante,
  chacune avec statut (`À faire` / `En cours 3/7` / `✓ Complet` / `Sans objet`)
  et sous-texte d'une ligne (« 2 étages · 2 300 pi² ») ; bouton contextuel
  **« Continuer → [prochaine tâche] »** en haut.
- **Actions** : tap carte → écran module ; « + Ajouter un module » (liste des sans-objet).
- **Validations** : badge rouge sur carte si anomalie (ex. matrice > 100 %).
- **Masqué** : tout le contenu des modules.

### Écran 2 — Identification (phase 1)
- **Objectif** : identifier le dossier et fixer le profil. < 2 minutes.
- **Visible (6 contrôles)** : n° dossier* (clavier visible d'office), date*
  (préremplie aujourd'hui), inspecté par* (prérempli dernier utilisé),
  secteur* (chips radio), utilisation* (chips radio), année de construction
  (+ case « non confirmée » inline).
- **Repli « Plus de détails »** : personnes rencontrées, type d'entreprise,
  unités visitées, types d'unités avec quantités, nb logements/condos/commerces, important, notes.
- **Actions** : barre basse Précédent / Suivant. Autosave continue.
- **Validations** : requis marqués `*`, contrôle inline au blur (n° dossier
  vide → message sous le champ « Requis pour générer la référence »). Non bloquant.

### Écran 3 — Étages & dimensions (phase 3, première tâche)
- **Objectif** : établir la liste des niveaux (source des matrices).
- **Visible** : préréglages en chips (« SS + RDC », « SS + RDC + 1 », « RDC seul », « + personnalisé ») ;
  liste de **cartes d'étage** (une ligne : libellé, aire, inclus ✓ ; tap = détail périmètre/hauteur) ;
  total vivant « Aire totale : 2 300 pi² » épinglé.
- **Repli** : largeur/profondeur hors-tout, irrégulier/croquis, aires industrielles (si profil industriel).
- **Actions** : + Étage, dupliquer, réordonner (poignée), supprimer.
- **Validations** : aire non numérique impossible (clavier numérique) ; étage sans aire = carte marquée « aire manquante » (jaune, non bloquant).
- **Masqué** : périmètre/hauteur (dans le détail de carte) — rarement saisis pour tous les niveaux.

### Écran 4 — Matrice de finition (1 matrice × 1 étage par écran)
- **Objectif** : composer un étage sans bruit.
- **Visible** : titre « Finition des planchers — RDC » ; chips des étages en
  haut (RDC actif) ; **sélections actuelles** (lignes matériau + % + stepper) ;
  jauge de somme (vert ≤ 100, rouge > 100) ; champ « Ajouter un matériau »
  (recherche + 6 suggestions : derniers utilisés puis fréquents).
- **Raccourcis** : chip « 100 % » sur la première sélection ; « Répartir le
  reste » ; bouton **« Copier de [étage précédent] »** si vide.
- **Actions** : chips étage pour passer au suivant ; Suivant → matrice suivante.
- **Validations** : somme > 100 % = jauge rouge + message court « 160 % — retirez 60 % ». Jamais bloquant.
- **Masqué** : la liste complète des 14-18 matériaux (accessible en tapant dans la recherche).

### Écran 5 — Listes à quantités (plomberie, encastrements, protection…)
- **Objectif** : cocher ce qui est présent, pas parcourir un inventaire.
- **Visible** : **sélections déjà faites** (ligne : nom, qté ±, note) ;
  champ de recherche ; **8 chips fréquentes** (ex. plomberie : Toilette,
  Lavabo, Douche, Bain, Chauffe-eau, Évier, Cuve, Sortie L-S).
- **« Voir toute la liste »** → panneau (bottom sheet) avec les 25-53 options + recherche.
- **Actions** : tap chip = ajout qté 1 ; ± pour ajuster ; balayer/✕ pour retirer.
- **Validations** : quantité clavier numérique ; rien de bloquant.
- **Masqué** : les options non sélectionnées (l'inverse d'aujourd'hui).

### Écran 6 — Pièce (fiche)
- **Objectif** : une pièce = un écran court.
- **Visible** : type (chips triées par fréquence : Cuisine, SdB, Chambre,
  Salon en premier), nom (prérempli « Chambre 2 »), étage (chips, prérempli
  = dernier utilisé), L × P → aire auto ; champs spécifiques du type ;
  revêtements en 3 lignes-résumé (« Plancher : Bois dur » — tap = sélecteur).
- **Repli** : notes.
- **Actions** : « Enregistrer et + 1 pièce » (enchaînement rapide), « Dupliquer », « Terminer ».
- **Validations** : aucune obligatoire — une pièce sans dimensions reste valide, marquée « dimensions manquantes » dans la liste.
- **Masqué** : listes complètes de revêtements (sélecteur à la demande, listes DRY de la section finitions).

### Écran 7 — Extérieur (phase 5)
- **Objectif** : tour extérieur sans inventaire.
- **Visible** : recherche + chips fréquentes (balcon, galerie, gouttières,
  perron, remise…) ; sélections avec note/dimension inline ; **questions
  opt-in en fin d'écran** : Piscine ? SPA ? Clôture ? Soutènement ? Foyer ext. ?
  (segmented Oui/Non, Non par défaut ne déploie rien).
- **Actions/validations** : comme écran 5.
- **Masqué** : les 36 items divers non cochés ; les 5 modules opt-in tant que « Non ».

### Écran 8 — Vérification (remplace « Résumé »)
- **Objectif** : ne montrer QUE ce qui mérite attention avant export.
- **Visible** : ① anomalies (sommes > 100 % avec lien direct), ② requis
  manquants (lien direct), ③ modules « À faire » jamais ouverts (avec bouton
  « Sans objet » pour les acquitter), ④ 3 totaux (aire, pièces, étages).
- **Actions** : Exporter JSON / CSV (actifs même avec anomalies — avertis, pas bloqués) ; « Corriger » à côté de chaque item → ouvre l'écran concerné, retour direct ici.
- **Masqué** : la relecture exhaustive des données (disponible via « Voir tout le relevé », lecture seule).

---

## E. Recommandations UI concrètes

**À utiliser** (chaque composant réduit la charge, les erreurs ou les taps) :

| Composant | Où | Justification |
|---|---|---|
| Stepper 5 phases (chips) | En-tête | Repérage permanent, remplace 14 entrées de sidebar. |
| Carte de module avec statut | Hub | Transforme « tout est affiché » en « voici quoi faire ». |
| Bouton « Continuer → » | Hub | La prochaine action utile, zéro décision. |
| Chips de choix rapide | Secteur, étages, types de pièce, items fréquents | 1 tap au lieu de dropdown + scroll. |
| Segmented Oui / Non | Toutes les questions opt-in | Gros, non ambigu, remplace 2 checkboxes. |
| Recherche + sélections d'abord | Toutes les listes ≥ 10 options | Affiche 3-8 lignes au lieu de 25-53. |
| Bottom sheet « Voir tout » | Listes longues | La liste complète existe, mais à la demande. |
| Stepper numérique ± | Quantités, % | Saisie au pouce sans clavier. |
| Chip « 100 % » / « Copier de l'étage » | Matrices | Cas majoritaire en 1 tap. |
| Barre d'action basse sticky | Écrans de module | Précédent/Suivant toujours sous le pouce. |
| Badge d'état (✓ / 3/7 / ⚠) | Cartes, stepper | Statut sans texte. |
| Accordéon « Plus de détails » | Chaque écran | Niveau b) accessible, jamais imposé. |

**À éviter** : tableau 7 colonnes en saisie (remplacé par cartes d'étage) ;
sidebar 14 entrées (redondante avec le stepper + hub) ; double emplacement
d'export ; toute couleur non porteuse de statut (on garde : bleu = action,
vert = complet/sauvegardé, jaune = incomplet, rouge = anomalie).

**Lisibilité terrain** : conserver mode sombre ; contraste AA minimum ;
texte ≥ 14 px (16 px champs tactiles, déjà en place) ; pas de gris < 4.5:1
pour l'information utile.

---

## F. Spécification code-ready

### F.1 Extensions du schéma (`src/lib/formSchema.ts` / `types.ts`)

Le moteur schema-driven est conservé. Ajouts rétro-compatibles :

```ts
// types.ts
export interface FormField {
  // … existant …
  tier?: "essential" | "detail" | "advanced"; // défaut "essential"
  frequent?: boolean;      // apparaît dans les chips rapides des listes
  rememberLast?: boolean;  // préremplir avec la dernière valeur saisie (ex. inspecte_par)
  defaultValue?: FieldValue;
}

export interface ModuleDef {           // remplace/enrichit FormSection
  id: string;
  phase: 1 | 2 | 3 | 4 | 5;
  title: string;           // = la tâche (« Étages du bâtiment »)
  short: string;
  optIn?: { question: string; fieldId: string };   // module derrière Oui/Non
  visibleWhen?: ShowIf;    // filtrage par profil (secteur/utilisation)
  fields?: FormField[];
  matrices?: MatrixDef[];
  special?: SpecialSection;
  /** critère de complétude : requis remplis + prédicat optionnel */
  isComplete?: (releve: ReleveData) => boolean;
}

export type ModuleStatus = "todo" | "in-progress" | "done" | "na";
```

Découpage de l'actuelle section 12 en modules :
`exterieur-divers`, `amenagements`, `services`, `piscine` (optIn),
`spa` (optIn), `cloture` (optIn), `soutenement` (optIn), `foyer-ext` (optIn).
Fusion des sections 1+2 en `identification` (champs tier:"detail" pour
l'ancien contenu secondaire). Les données restent stockées sous les mêmes
ids de champs → **aucune migration de données**.

### F.2 Arbre de composants

```
<App>
 ├─ <ReleveListScreen>            // écran 0 (liste + création + duplication)
 └─ <ReleveShell>                 // topbar mince : référence · save · menu
     ├─ <PhaseStepper phases statuses onSelect>
     ├─ <ModuleHub phase>         // cartes <ModuleCard status summary badge>
     │    └─ <ContinueButton nextTask>
     ├─ <ModuleScreen module>     // 1 tâche
     │    ├─ <FormRenderer tier="essential">      // existant, filtré par tier
     │    ├─ <DetailsAccordion> <FormRenderer tier="detail"> </>
     │    ├─ variantes : <FloorCards> | <MatrixScreen> | <QuickSelectList>
     │    │              | <RoomWizard> | <ReviewScreen>
     │    └─ <StickyNav onPrev onNext saveState>
     └─ <BottomSheet>             // « Voir toute la liste », sélecteurs de revêtements
```

Composants nouveaux (les existants `FormRenderer`, `PercentageMatrix`,
`storage`, `export`, `fieldLogic` sont réutilisés tels quels ou légèrement adaptés) :

| Composant | Props clés | États |
|---|---|---|
| `PhaseStepper` | `statuses: Record<phase, ModuleStatus>` | phase active |
| `ModuleHub` | `phase, modules, statuses, onOpen` | — |
| `ModuleCard` | `module, status, summary, anomalies` | — |
| `QuickSelectList` | `field, values, lastUsed` | recherche, sheetOpen |
| `MatrixScreen` | `matrix, floors, values` | étage actif ; actions copyFromFloor(), fill100(), distributeRest() |
| `FloorCards` | `floors` | carte étendue ; préréglages |
| `RoomWizard` | `rooms, floors` | pièce ouverte ; action saveAndAddAnother() |
| `ReviewScreen` | `releve` | — (dérive anomalies/manquants/todo) |
| `StickyNav` | `onPrev, onNext, saveState` | — |
| `BottomSheet` | `open, onClose` | — |

### F.3 Logique d'état

```ts
// lib/moduleStatus.ts
function moduleStatus(m: ModuleDef, r: ReleveData): ModuleStatus {
  if (m.visibleWhen && !isVisible(m.visibleWhen, r.values)) return "na";
  if (m.optIn && r.values[m.optIn.fieldId] !== "oui")
    return r.values[m.optIn.fieldId] === "non" ? "na" : "todo";
  if (m.isComplete?.(r)) return "done";
  return sectionStarted(m, r) ? "in-progress" : "todo";
}
// prochaine tâche = premier module (ordre phase, ordre déclaration)
// avec status "todo" | "in-progress".
```

Complétude par défaut (`isComplete` absent) : tous les champs `required`
visibles sont remplis **et** aucune anomalie de somme dans le module.

```ts
// lib/lastUsed.ts — « dernier choix utilisé »
getLast(fieldId): FieldValue | undefined   // localStorage, clé "last:<fieldId>"
setLast(fieldId, value)                    // appelé par FormRenderer si field.rememberLast
topOptions(fieldId, options, n=8)          // fréquence locale d'usage → chips rapides
```

### F.4 Validation (inline, non bloquante)

| Règle | Où | Comportement |
|---|---|---|
| requis vide | au blur du champ | message court sous le champ, bordure ambre ; jamais de blocage de navigation |
| % individuel | à la saisie | clamp 0–100 (existant) |
| somme matrice > 100 | à la saisie | jauge rouge + « retirez X % » ; badge ⚠ sur la carte module et au stepper |
| année hors 1600–2100 | au blur | « Vérifiez l'année » |
| export avec anomalies | Vérification | dialogue « Exporter malgré 2 anomalies ? » — averti, pas interdit |

### F.5 Données & hors ligne (inchangés)

`ReleveData`, IndexedDB + repli localStorage, autosave 500 ms, PWA : conservés.
Ajouts : store `lastUsed`, champ dérivé `status` **calculé** (jamais stocké).

### F.6 Plan de refactorisation par lots

1. **Lot 1 — sans changement visuel** : `tier` sur les champs, `ModuleDef`,
   découpage section 12, statuts calculés. (Schéma seulement.)
2. **Lot 2 — listes** : `QuickSelectList` (sélections d'abord + chips +
   bottom sheet) remplace le rendu `quantity-list`/`dims-list`. Plus gros gain, isolé.
3. **Lot 3 — navigation** : `PhaseStepper` + `ModuleHub` + `StickyNav`
   remplacent sidebar + page unique. `ReviewScreen` remplace Résumé.
4. **Lot 4 — raccourcis** : copier d'étage, 100 %, préréglages d'étages,
   rememberLast, duplication de relevé, « Enregistrer et +1 pièce ».
5. **Lot 5 — validation inline** + badges d'anomalie remontés.

Chaque lot est livrable et testable seul (les tests Playwright existants
couvrent déjà autosave, matrices, pièces, exports).

---

*Toutes les décisions ci-dessus se justifient par au moins l'un des trois
critères : réduction de la charge cognitive (montrer moins), prévention des
erreurs (valider près du champ, statuts explicites), accélération de la
saisie (moins de taps, mémoire des choix, duplication).*
