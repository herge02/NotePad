# Relevé de bâtiment — application terrain iPad

Application web (PWA hors ligne) de **relevé de valeur assurable / inspection bâtiment**,
remplaçant le formulaire Excel `Feuille relevé B(2).xlsm`. Pensée pour être remplie
debout sur le terrain, sur iPad.

## Principe directeur : documenter, pas qualifier

L'application documente des **faits** : matériaux, compositions, quantités, dimensions,
présence/absence, systèmes installés. **Aucun champ ne qualifie l'état ou la condition
d'une composante** (pas de « Bon / Moyen / Médiocre », pas de note de vétusté — le champ
« État du bâtiment » de l'ancien formulaire est volontairement retiré).

## Démarrage

```bash
npm install
npm run dev        # développement — http://localhost:3000
npm run build && npm start   # production (le service worker hors ligne s'active en prod)
```

## UX : flux guidé, divulgation progressive

Refonte complète documentée dans `docs/REFONTE-UX.md` (diagnostic, wireframes, spec) :

- **Mes relevés** : reprendre, créer, dupliquer, exporter un dossier (jauge de
  complétude, badge d'anomalies).
- **5 phases** (stepper permanent) : Identification → Site → Bâtiment →
  Intérieur & systèmes → Extérieur & clôture du dossier.
- **Hub de modules** par phase : cartes avec statut (`À faire / En cours /
  Complet / Sans objet`), bouton **« Continuer → prochaine tâche »**, questions
  **opt-in** (Piscine ? SPA ? Clôture ? Gicleurs ?…) qui ne déploient un module
  qu'après « Oui », modules filtrés par **profil** (secteur/utilisation) et
  réactivables.
- **Écran de module = une tâche** : champs essentiels visibles, « Plus de
  détails » replié, navigation Précédent/Suivant collée en bas, autosave.
- **Listes « sélections d'abord »** : ce qui est coché + 8 chips fréquentes
  (apprises de l'usage local) + recherche + « Voir tout » en panneau — fini
  l'inventaire de 53 cases vides.
- **Matrices par étage** : un étage à la fois (chips avec jauge), « Copier de
  l'étage précédent », « 100 % », « Compléter à 100 % » ; somme > 100 % signalée
  sans bloquer.
- **Étages en cartes** avec préréglages (SS + RDC + 1 étage…), aire totale vivante.
- **Pièces** : type en chips, aire auto L×P, revêtements en lignes-résumé
  (sélecteur à la demande, listes DRY de la finition), « Enregistrer et +1 pièce »,
  étage prérempli du dernier choix.
- **Validation près du champ**, non bloquante (requis au blur, bornes numériques).
- **Vérification** : uniquement anomalies, requis manquants, questions sans
  réponse et modules jamais ouverts (acquittables « Sans objet »), totaux,
  export JSON/CSV (averti, jamais interdit).

## Architecture

```
src/lib/formSchema.ts        phases, modules (tier/optIn/visibleWhen), options, roomSchemas
src/lib/types.ts             ModuleDef, FormField (tier, frequent, rememberLast), données
src/lib/fieldLogic.ts        visibilité, statuts de modules, anomalies, prochaine tâche
src/lib/lastUsed.ts          dernier choix utilisé + fréquence locale des options
src/lib/storage.ts           IndexedDB + repli localStorage
src/lib/export.ts            export JSON / CSV
src/components/FormRenderer.tsx   rendu générique des champs (schema-driven)
src/components/QuickSelect.tsx    listes « sélections d'abord » + chips + panneau
src/components/MatrixBlock.tsx    matrices par étage (copie, 100 %, jauges)
src/components/FloorCards.tsx     étages en cartes + préréglages
src/components/RoomList.tsx       relevé par pièce
src/components/PhaseStepper.tsx   stepper 5 phases
src/components/ModuleHub.tsx      cartes de modules, opt-in, sans objet
src/components/ModuleScreen.tsx   écran une-tâche + navigation basse
src/components/ReviewScreen.tsx   vérification & export
src/components/ReleveList.tsx     écran « Mes relevés »
src/app/page.tsx             orchestration (vues, autosave, duplication)
```

Toute évolution du formulaire (option, type de pièce, module, question opt-in,
règle de profil) se fait dans `formSchema.ts` — les composants s'adaptent.
Les ids de champs sont stables : les relevés existants restent lisibles.
