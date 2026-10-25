## ✅ FAIT — Ce qui est implémenté

### Base technique (héritée + fusion)
- [x] Rendu Three.js 0.160.0, WebGL, WebXR-ready
- [x] Planète procédurale (IcosahedronGeometry détaillé, bruit analytique 4 octaves)
- [x] Physique sphérique (gravité orientée, `state.up` dynamique)
- [x] Caméra orbitale sphérique (tangente + up, lerp)
- [x] Étoiles en fond, atmosphère additive
- [x] Éclairage directionnel + hémisphérique + ambient
- [x] Écureuil low-poly avec membranes déployables, queue animée, pattes animées
- [x] Ombre projetée au sol

### Arbres
- [x] Générateur fractal (branches récursives avec cylindres 5-faces)
- [x] Touffes de feuilles (2 plans croisés par touffe)
- [x] 13 types d'arbres paramétrés (`TREE_TYPES`)
- [x] Fourchettes min/max par type (trunkH, trunkR, branches, depth, feuilles, tilt, couleurs)
- [x] 5 biomes (glacier, tempéré, tropical, désert, marais)
- [x] Poids par biome pour le choix du type (`BIOME_TREE_WEIGHTS`)
- [x] Animation de balancement via shader (`aSway` + `uTime`)
- [x] Merge de tous les arbres en un seul mesh pour perf
- [x] Segments stockés en repère monde (`tree.segments`) pour la grimpe

### Grimpe
- [x] Détection point-segment sur tous les segments de tous les arbres
- [x] Entrée en grimpe par contact + direction
- [x] Progression le long du segment (t 0→1)
- [x] Transition automatique parent ↔ enfant (sommet → rameau, retour au tronc)
- [x] Préservation de l'angle radial lors des transitions
- [x] Saut depuis l'arbre (impulsion radiale + le long du segment)
- [x] Orientation du modèle pendant la grimpe

### Vol
- [x] Plané (maintien saut en l'air)
- [x] Contrôle de direction par joystick/caméra
- [x] Transition vol ↔ sol
- [x] Vitesse et chute réglables

### Boucle graines & plantation
- [x] 25 graines placées au sommet d'arbres existants
- [x] Halo + faisceau de lumière vertical sur les graines
- [x] Flottement animé (bob + rotation)
- [x] Collecte au contact (rayon 1.4 m)
- [x] 40 souches vides à des emplacements dégagés
- [x] Anneau vert clignotant sur les souches
- [x] Plantation cérémonielle (maintenir E 1.2 s, bague de progression)
- [x] Croissance animée d'un arbre planté (5 s)
- [x] Type d'arbre planté choisi selon le biome local

### Valorisation v4 (les 8 leviers)
- [x] 1. Graines flottantes + faisceau vertical (méritées)
- [x] 2. Combo de ramassage (timer 2.5 s, x3/x5/x10, flash + son)
- [x] 3. Plantation cérémonielle
- [x] 4. Croissance lente (particules, ticks audio)
- [x] 5. Oiseaux autour des arbres plantés
- [x] 6. Barre de progression « Forêt de la planète »
- [x] 7. Herbier (icônes qui s'allument)
- [x] 8. Graines chargées (vol 10 s → arbre +30%)

### Audio & feedback
- [x] Audio procédural complet (Web Audio API, aucun fichier)
- [x] Sons : graine, combo, plantation (start + complete), croissance (ticks)
- [x] Particules poolées (250 max, `ParticlePool`)
- [x] Screen flash à la collecte, combo, nouvelle espèce
- [x] Toasts temporaires (avec variante dorée)

### Contrôles
- [x] Clavier (WASD/ZQSD + flèches + Espace + E + Shift)
- [x] Souris (drag caméra, molette zoom, pointer lock)
- [x] Manette (stick G mouvement, stick D caméra, A saut, X plantation, gâchettes zoom)
- [x] Tactile (joystick virtuel G, drag D caméra, bouton SAUT, bouton PLANTE)

### UI
- [x] Overlay de démarrage avec instructions
- [x] HUD (état, altitude, graines, plantation, biome, streak vol)
- [x] Barre de planète
- [x] Herbier
- [x] Combo (texte géant animé)
- [x] Prompt de plantation
- [x] Toast
- [x] Flash écran
- [x] Boutons tactiles

### 🆕 v5 — Priorité 1 (refactor, save, distribution)
- [x] **Refactor modulaire** : 15 modules ES (`main`, `rng`, `audio`, `biomes`, `treeTypes`, `planet`, `trees`, `squirrel`, `physics`, `effects`, `collectables`, `input`, `ui`, `save`, `gameState`)
- [x] **Save/load localStorage** : auto-save 5 s + manuel `F5`, clé `squirrel_save_v1`
- [x] **Distribution Poisson sphérique** : `poissonSphere(n, k)` remplace Fibonacci → plus d'anneaux visibles
- [x] **RNG seedé** (`mulberry32`) : monde entièrement reproductible depuis un seul entier
- [x] **Persistance fidèle** : seed + plantations (type d'arbre stocké sur la souche) + graines collectées + herbier + position joueur
- [x] **Patches correctifs** : `require()` cassé retiré, `getGlideStreak()` utilisé proprement, `plantedTypeName` ajouté sur les souches

---

## 🚧 RESTE À FAIRE — Demandé explicitement

### Priorité 2 (demandes explicites de ta part)
- [ ] **Rayon d'exclusion des arbres** : chaque arbre bloque sa zone, **mini-arbre à ~25%** de chance à son pied
- [ ] **Collision en vol** : capsule du squirrel vs segments → réponse glissée + **accroche** (grab) pour s'agripper à une branche
- [ ] **Saut d'arbre en arbre** (conséquence de la collision + accroche)
- [ ] **Système d'endurance** : jauge, drain en plané/grimpe, régénération au sol/nid, chute à 0
- [ ] **Nids dans les arbres** : placés dans les houppiers des gros arbres, régénération rapide, checkpoint
- [ ] **Voir l'écureuil à travers le feuillage** : solution A (fade par shader) ou B (silhouette X-ray) ou C (hybride)
- [ ] **Arbres géants** : type `arbre_geant` (tronc 12-20 m, rayon 1.4-2.2), 1-2 par planète, visibles de loin
- [ ] **Taille minimum de biome** : éviter les micro-zones (lissage par vote majoritaire + absorption)
- [ ] **Rivières et mers** : détection par flux hydrique, rendu mer (sphère), rendu rivière (shader flow), nage pénalisée
- [ ] **Arbre géant final** : pousse à la fin de la planète, sommet = point de contemplation
- [ ] **Méta-boucle inter-planétaire** : cinématique de saut, arrivée sur planète suivante, conservation de l'inventaire partiel

### Priorité 3 (gameplay/progression)
- [ ] **Niveaux de difficulté croissante** : 6 planètes configurées (Berceau → Archipel → Volcanique → Océanique → Glacée → Géante)
- [ ] **Compétences débloquables via nids** : arbre de compétences minimaliste (5 nœuds : endurance, grimpe, plané, vision, chute)
- [ ] **Inventaire typé de graines** : graines par biome, plantation croisée avec bonus/malus

---

## 💡 POSSIBLE — Idées proposées, non tranchées

### Systèmes de jeu supplémentaires
- [ ] **Course chronométrée** entre balises
- [ ] **Puzzle-platformer** avec îlots d'arbres isolés et checkpoints
- [ ] **King of the Hill** avec ennemis basiques
- [ ] **Vent solaire** : courants ascendants pour recharger l'endurance en vol
- [ ] **Nid & progéniture** : transporter des œufs (contrainte de poids sur le plané)
- [ ] **Cycle jour/nuit** avec créatures nocturnes (lucioles, prédateurs)
- [ ] **Rhythm-glide** : atterrir sur les branches en rythme

### Habillage / monde
- [ ] **Météo dynamique** : vent, pluie, aurores
- [ ] **Faune passive** : sillage ascendant, papillons indicateurs, poissons
- [ ] **Palette par planète** : color grading via EffectComposer
- [ ] **Musique adaptative** : stems (bass/pad/lead) mixés selon l'état
- [ ] **Écosystème passif** : graines non ramassées germent seules (+1 arbre/min)

### UI / qualité de vie
- [ ] **Mini-carte boussole** : projection 2D des souches, nids, graines
- [ ] **Achievements discrets** : toasts pour jalons
- [ ] **Mode photo** (`P`) : fige la scène, orbite libre, export PNG
- [ ] **Tutoriel doux** : 3-4 objectifs guidés sur la première planète

### Méta-narration
- [ ] **Fil rouge narratif** : « dernier jardinier de la galaxie »
- [ ] **Voyage inter-planétaire interactif** : mini-jeu de saut (30-45 s, éviter astéroïdes)
- [ ] **Fin** : retrouver sa planète d'origine reverdie

### Technique / perf
- [ ] **LOD sur les arbres** (3 niveaux selon distance)
- [ ] **Instancing** des graines, souches, oiseaux (si volume augmente)
- [ ] **Culling** sur `tree.segments` pendant la grimpe
- [ ] **WebGPU** en fallback si dispo
- [ ] **Support VR** (hérité de la base VR Three.js initiale, pas encore porté)

---

## 📊 Vue synthétique par pilier

| Pilier | Fait | Reste |
|--------|------|-------|
| **Monde** | ✅ Planète + biomes + arbres variés + distribution Poisson | 🚧 Rivières/mers, taille min biome, géants |
| **Mouvement** | ✅ Marche, saut, plané, grimpe | 🚧 Collision vol, accroche, endurance |
| **Collecte** | ✅ Graines + combo + chargée | 🚧 Inventaire typé |
| **Plantation** | ✅ Cérémonielle + herbier + oiseaux | 🚧 Nids, compétences |
| **Progression** | ✅ Barre de planète | 🚧 Niveaux, arbre final, méta-boucle |
| **UI** | ✅ HUD, herbier, combo, toasts | 🚧 Carte, achievements, photo |
| **Audio** | ✅ Procédural complet | 🚧 Musique adaptative |
| **Sauvegarde** | ✅ localStorage (seed + plantations + graines + position) | 🚧 Multi-planètes |
| **Architecture** | ✅ 15 modules ES séparés | — |
| **Narration** | ❌ | 💡 Fil rouge |
| **Plateformes** | ✅ Web (desktop/tactile) | 💡 VR, consoles (via Godot si pivot) |

---

## 🎯 Ordre recommandé pour les prochaines sessions

| # | Item | Estimé | Impact |
|---|------|--------|--------|
| 1 | **Rayon d'exclusion + mini-arbres** (25%) | 1 h | ⭐⭐⭐⭐ Visuel immédiat |
| 2 | **Endurance + nids** | 3 h | ⭐⭐⭐⭐⭐ Donne du poids au vol |
| 3 | **Collision en vol + accroche** | 4 h | ⭐⭐⭐⭐⭐ Transforme le mouvement |
| 4 | **Rivières/mers + taille min biome** | 5 h | ⭐⭐⭐⭐ Gros gain visuel |
| 5 | **Arbre géant + méta-boucle** | 4 h | ⭐⭐⭐⭐⭐ Boucle complète |
| 6 | **Niveaux + compétences + inventaire typé** | 4 h | ⭐⭐⭐⭐ Progression |

**Total estimé restant** pour un jeu complet jouable : **~21 h** (contre ~25 h avant v5).

---

## 📌 Notes de version v5 — points d'attention

### Corrections appliquées
- `require('./physics.js')` dans `main.js` → supprimé (n'existe pas en ES modules)
- `window.__gs` → remplacé par `getGlideStreak()` importé proprement
- `stump.plantedTypeName` → ajouté dans `plantTreeAt` pour un save fidèle

### Limitations connues du save/load
- Un monde chargé **sans** `plantedTypeName` sur les souches (ancienne save) affichera les arbres plantés comme « inconnus » dans le save — il faut repartir d'une save fraîche
- Les particules et oiseaux ne sont **pas** persistés (comportement attendu, décoratifs)
- Le RNG étant seedé, **les graines et souches initiales sont identiques** au reload, mais les **animations** (rotation, bob) repartent de zéro — purement cosmétique

### Test rapide post-v5
1. Console F12 → `Forêt : ~280 arbres` et `Graines : 25 · Souches : 40`
2. Planter un arbre → `F5` → recharger la page → l'arbre est toujours là, la graine consommée aussi
3. Reset : `localStorage.removeItem('squirrel_save_v1')` dans la console

---

## 🔮 Ce qui n'est PAS dans le radar actuel

- Multijoueur
- Éditeur de niveaux utilisateur
- Portage console
- Modèle 3D écureuil sculpté (reste low-poly primitives)
- Animations squelettiques (tout est transform de meshes)

---
