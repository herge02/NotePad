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

## Organisation du formulaire

Navigation à deux niveaux (groupes → sections), du sol vers le haut :

| Groupe | Sections |
|---|---|
| Dossier | 1. Dossier |
| Bâtiment | 2. Identification · 3. Site & conformité · 4. Dimensions |
| Structure & enveloppe | 5. Fondations · 6. Superstructure · 7. Enveloppe extérieure |
| Intérieur | 8. Finition intérieure · 9. Relevé par pièce |
| Systèmes & équipements | 10. Méc./élec./plomberie · 11. Équipements & protection incendie |
| Extérieur | 12. Extérieur & aménagements |
| Suivi | 13. Rénovations · 14. Résumé & export |

Points clés :

- Les **étages** définis en section 4 sont la source de vérité : toutes les matrices de
  composition par étage (planchers, revêtements, finitions) se génèrent à partir d'eux,
  et le module par pièce y rattache chaque pièce.
- Les **matrices en pourcentage** valident 0–100 par champ et signalent toute somme
  dépassant 100 % (dans la matrice et au résumé).
- Le module **Relevé par pièce** génère ses champs selon le type de pièce
  (`roomSchemas` dans le schéma) et réutilise les listes de revêtements de la section 8.
- **Autosave** continu dans IndexedDB (repli localStorage), gestion de brouillons,
  identifiant de relevé basé sur numéro de dossier + date.
- **Export JSON et CSV** (UTF-8 avec BOM pour Excel) ; la structure aplatie est prête
  pour un futur export PDF.
- Photos par section et par pièce : prévues dans une version future.

## Architecture

```
src/lib/formSchema.ts        sections, champs, options, matrices, roomSchemas
src/lib/types.ts             types du schéma et du modèle de données
src/lib/fieldLogic.ts        visibilité conditionnelle, progression, sommes %
src/lib/storage.ts           IndexedDB + repli localStorage
src/lib/export.ts            export JSON / CSV
src/components/FormRenderer.tsx      rendu générique des champs (schema-driven)
src/components/SectionTabs.tsx       navigation deux niveaux, sticky, progression
src/components/PercentageMatrix.tsx  matrices par étage (recherche + %)
src/components/FloorsTable.tsx       tableau d'étages (source des matrices)
src/components/RoomList.tsx          module par pièce (ajout/duplication/réordonnancement)
src/components/RepeatableList.tsx    rénovations
src/components/SummarySection.tsx    résumé, alertes, export
src/app/page.tsx             application principale (état, autosave, brouillons)
```

Toute évolution du formulaire (nouvelle option de matériau, nouveau type de pièce,
nouvelle section) se fait dans `formSchema.ts` — les composants s'adaptent.
