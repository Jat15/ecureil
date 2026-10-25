# Écureuil Volant — Forêt Vivante

Prototype de jeu 3D (Three.js) : ramasse des graines, plante-les, regarde la forêt pousser.

## Lancement

Le jeu est un site **statique** (HTML + JS modules ES). Il suffit de servir `index.html` via **n'importe quel serveur HTTP local** — pas de build, pas de dépendance.

⚠️ **`file://` ne fonctionne pas** (les modules ES nécessitent HTTP).

### Options de serveur (au choix)

| Commande | Prérequis |
|----------|-----------|
| `npx serve .` | Node.js installé |
| `npx http-server .` | Node.js installé |
| VS Code → "Live Server" (clic droit sur `index.html`) | Extension VS Code |
| `php -S localhost:8080` | PHP installé |
| `ruby -run -e httpd . -p 8080` | Ruby installé |

Puis ouvrir **http://localhost:8080** dans ton navigateur.

## Contrôles

| Action | Clavier | Manette | Tactile |
|--------|---------|---------|---------|
| Bouger | ZQSD / WASD / flèches | Stick gauche | Joystick G |
| Caméra | Souris | Stick droit | Drag D |
| Sauter / Planer | Espace / Shift | A | Bouton SAUT |
| Planter | E maintenu | X | Bouton PLANTE |
| Zoom | Molette | Gâchettes | — |
| Sauvegarder | F5 | — | — |

## Architecture

src/
├── main.js — bootstrap, loop, caméra, overlay
├── rng.js — mulberry32 seedé (reproductibilité)
├── audio.js — Web Audio API procédural
├── biomes.js — 5 biomes, palettes, getBiomeId
├── treeTypes.js — 13 types d'arbres paramétrés
├── planet.js — terrain procédural, buildPlanet
├── trees.js — buildOneTree, distribution Poisson, forêt initiale
├── squirrel.js — mesh écureuil
├── physics.js — état, grimpe, updateSquirrel
├── effects.js — particules + oiseaux
├── collectables.js — graines, souches, plantation
├── input.js — clavier/souris/tactile/manette
├── ui.js — HUD, toasts, combo, herbier
├── save.js — localStorage
└── gameState.js — orchestration, auto-save


## Sauvegarde

Auto-save toutes les 5 s. Manuelle avec **F5**.
Format : `localStorage['squirrel_save_v1']`.

Contient : seed du monde, plantations, graines collectées, herbier, position joueur.
Le monde est **entièrement reproductible** depuis le seed grâce au RNG `mulberry32`.

Pour repartir de zéro : `localStorage.removeItem('squirrel_save_v1')` dans la console.

## TODO (après v5)

- [ ] Rayon d'exclusion + mini-arbres à 25%
- [ ] Collision en vol + accroche aux branches
- [ ] Endurance + nids
- [ ] Rivières / mers
- [ ] Arbre géant final + méta-boucle planétaire
- [ ] Système de compétences
- [ ] Carte boussole
