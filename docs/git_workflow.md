# Git et GitHub — procédures (Windows PowerShell)

Principes : **jamais de push direct sur `main`**, **jamais de push forcé sur une branche partagée**, **aucun secret commité** (`.env`, mots de passe, jetons, données sensibles). Aucune opération distante n'a été faite pour vous ; vous exécutez ces commandes vous-même.

## 1. Créer le dépôt GitHub (une seule fois, par l'équipe)
Via le site : *New repository* → nom `ciat-dashboard`, **privé**, sans README initial. Ou avec GitHub CLI : `gh repo create ciat-dashboard --private`.

## 2. Préparer votre copie locale
```powershell
cd ciat-dashboard                      # dossier du ZIP décompressé
git init -b main                       # initialise un dépôt local, branche principale « main »
git add .
git status                             # VÉRIFIER : aucun .env, aucun node_modules
sh scripts/check_secrets.sh            # (Git Bash/WSL) contrôle de secrets évidents
git commit -m "chore: import initial du tableau de bord CIAT"
git remote add origin https://github.com/<organisation>/ciat-dashboard.git
```
Si le dépôt de l'équipe **existe déjà** avec du contenu : `git fetch origin` puis travaillez sur votre branche (§3) créée depuis `origin/main`, et copiez-y le projet dans un sous-dossier convenu avec l'équipe.

## 3. Créer et pousser **votre** branche isolée
```powershell
git switch -c feature/ciat-dashboard-frontend-backend     # crée et bascule sur votre branche
git push -u origin feature/ciat-dashboard-frontend-backend  # publie la branche (PAS main) et la lie à origin
```
Ensuite, au quotidien :
```powershell
git add <fichiers>                      # ajouter précisément ce qui change
git commit -m "feat(projects): ajoute le filtre par statut"
git push                                # pousse sur VOTRE branche uniquement
```

## 4. Récupérer les mises à jour de `main` sans perdre votre travail
```powershell
git fetch origin                        # télécharge sans rien modifier
git switch feature/ciat-dashboard-frontend-backend
git merge origin/main                   # intègre main dans votre branche (historique conservé, pas de réécriture)
# en cas de conflit : voir §7 ; puis tests ; puis
git push
```
On utilise **merge** (et non rebase) pour ne jamais réécrire un historique déjà publié.

## 5. Conventions
- **Branches** : `main` (stable, protégée) · `develop` (intégration, facultative) · `feature/<sujet>` · `fix/<sujet>` · `docs/<sujet>`. Une branche = un sujet, courte durée.
- **Commits** (Conventional Commits) : `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:` + portée facultative `(analytics)` ; impératif, ≤ 72 car.
- **Nommage** : Python `snake_case` (classes `PascalCase`) ; TypeScript `camelCase` (composants `PascalCase`, fichiers de composants `PascalCase.tsx`) ; routes API en kebab-case.
- **Règles** : tests et lint verts avant PR ; pas de fichier généré ni de gros binaire ; commentaires en français pour la logique métier non évidente.
- **Protection de `main`** (réglage GitHub → *Settings → Branches*) : PR obligatoire, 1 revue, CI verte.

## 6. Pull request et revue de code
1. Sur GitHub : *Compare & pull request* de `feature/ciat-dashboard-frontend-backend` vers `main`. Décrire : objectif, captures, tests exécutés, points d'attention sécurité.
2. Relecteur : vérifier (a) pas de secret, (b) droits côté serveur, (c) tests ajoutés, (d) règles d'indicateurs inchangées ou documentées, (e) pas de code mort. Demander des changements en commentaires ; l'auteur pousse de nouveaux commits (pas de push forcé).
3. Fusion par *Squash and merge* ou *Merge commit* selon la décision de l'équipe, **après** CI verte et approbation.

## 7. Résoudre un conflit
```powershell
git merge origin/main                   # signale « CONFLICT » dans certains fichiers
git status                              # liste les fichiers en conflit
# ouvrir chaque fichier : choisir entre <<<<<<< HEAD (vous) et >>>>>>> origin/main (équipe), supprimer les marqueurs
git add <fichier-résolu>
git commit                              # conclut la fusion
# relancer tests/lint avant de pousser ; en cas de doute : git merge --abort (annule la fusion en cours)
```

## 8. Fusion finale dans `main`
Checklist : [ ] branche à jour avec `origin/main` [ ] backend : `pytest`, `ruff` [ ] frontend : `npm run lint`, `typecheck`, `test`, `build` [ ] `docs/` à jour [ ] aucun `.env` ni secret (`git ls-files | Select-String "\.env$"` ne renvoie que `.env.example`) [ ] PR approuvée. Puis fusion via GitHub ; localement : `git switch main ; git pull`.

## 9. Ce qu'il ne faut jamais faire
`git push origin main` pendant le développement · `git push --force` sur une branche partagée · committer `.env`, clés API, mots de passe, sauvegardes `.sql/.dump`, `node_modules`. Si un secret a été commité : **le révoquer immédiatement** (le supprimer du dépôt ne suffit pas, l'historique le conserve) puis prévenir l'équipe.
