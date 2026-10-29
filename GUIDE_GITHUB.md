# 🚀 Guide rapide : Mettre le projet sur GitHub

## Prérequis

Vous avez besoin d'un compte GitHub : [github.com/signup](https://github.com/signup)

## Option 1 : Via l'interface GitHub (recommandé pour débutants)

### Étape 1 : Créer le repository sur GitHub

1. Allez sur [github.com](https://github.com)
2. Cliquez sur le **+** en haut à droite
3. Sélectionnez **"New repository"**
4. Configurez :
   - **Repository name** : `ciat-dashboard`
   - **Description** : `Tableau de bord décisionnel du CIAT - ISEP Amadou Trawaré`
   - **Visibility** : Public ou Private (selon votre choix)
   - ⚠️ **NE cochez PAS** "Add a README file" (vous en avez déjà un)
5. Cliquez sur **"Create repository"**

### Étape 2 : Connecter votre projet local

Ouvrez PowerShell dans le dossier du projet et exécutez :

```powershell
# Se placer dans le dossier du projet
cd C:\Users\ndiay\Desktop\ciat-dashboard

# Initialiser Git (si pas déjà fait)
git init

# Ajouter tous les fichiers
git add .

# Créer le premier commit
git commit -m "feat: projet initial CIAT Dashboard avec corrections logo et Gemini"

# Ajouter le lien vers GitHub (remplacez VOTRE-USERNAME)
git remote add origin https://github.com/VOTRE-USERNAME/ciat-dashboard.git

# Renommer la branche principale en 'main'
git branch -M main

# Pousser vers GitHub
git push -u origin main
```

### Étape 3 : Vérifier

Actualisez la page GitHub, vous devriez voir tous vos fichiers !

## Option 2 : Via GitHub CLI (si installé)

```powershell
# Se connecter (une seule fois)
gh auth login

# Créer le repository et pousser en une seule commande
cd C:\Users\ndiay\Desktop\ciat-dashboard
git init
git add .
git commit -m "feat: projet initial CIAT Dashboard"
gh repo create ciat-dashboard --public --source=. --remote=origin --push
```

## Option 3 : Via GitHub Desktop (interface graphique)

1. Téléchargez [GitHub Desktop](https://desktop.github.com/)
2. Installez et connectez-vous
3. Cliquez sur **"Add"** → **"Add existing repository"**
4. Sélectionnez le dossier `C:\Users\ndiay\Desktop\ciat-dashboard`
5. Cliquez sur **"Publish repository"**
6. Configurez le nom et la visibilité
7. Cliquez sur **"Publish repository"**

## ⚠️ Vérifications importantes AVANT de pousser

### 1. Vérifier que les secrets ne sont PAS inclus

```powershell
# Vérifier ce qui sera commité
git status

# Vérifier le contenu du .gitignore
type .gitignore
```

Le fichier `.env` NE doit PAS apparaître dans `git status`. Si c'est le cas :

```powershell
# Retirer le .env du suivi
git rm --cached .env
git commit -m "fix: retrait du fichier .env"
```

### 2. Contenu du .gitignore (déjà configuré ✓)

Votre `.gitignore` contient déjà :
```
.env
.env.*
!.env.example
*.pem
*.key
```

C'est parfait ! Vos secrets sont protégés.

## Commandes Git utiles

```powershell
# Voir l'état des fichiers
git status

# Voir l'historique des commits
git log --oneline

# Voir les différences
git diff

# Ajouter des fichiers spécifiques
git add fichier1.txt fichier2.txt

# Ajouter tous les fichiers modifiés
git add .

# Créer un commit
git commit -m "Description des modifications"

# Pousser vers GitHub
git push

# Voir les branches
git branch

# Créer une nouvelle branche
git checkout -b nom-de-la-branche

# Voir les remotes configurés
git remote -v
```

## Structure de commit recommandée

Format : `type: description courte`

Types courants :
- `feat:` nouvelle fonctionnalité
- `fix:` correction de bug
- `docs:` modifications de documentation
- `style:` formatage, style
- `refactor:` refactorisation du code
- `test:` ajout de tests
- `chore:` maintenance, config

Exemples :
```powershell
git commit -m "feat: ajout de l'assistant IA avec Gemini"
git commit -m "fix: correction taille logo sidebar"
git commit -m "docs: ajout guide de déploiement Vercel"
```

## Problèmes courants

### Erreur "remote origin already exists"
```powershell
git remote remove origin
git remote add origin https://github.com/VOTRE-USERNAME/ciat-dashboard.git
```

### Erreur d'authentification
- Utilisez un **Personal Access Token** au lieu du mot de passe
- Générez-en un : GitHub → Settings → Developer settings → Personal access tokens

### Le push est refusé
```powershell
# Si le repository GitHub a des commits que vous n'avez pas
git pull origin main --rebase
git push origin main
```

### Fichiers trop gros
Si vous avez des fichiers > 100MB, utilisez Git LFS :
```powershell
git lfs install
git lfs track "*.psd"
git add .gitattributes
```

## Après avoir poussé sur GitHub

### Configurer les paramètres du repository

1. Allez dans **Settings** du repository
2. Activez les **Issues** si vous voulez suivre les tâches
3. Configurez les **Actions** si vous voulez CI/CD
4. Ajoutez une **description** et des **topics** (django, react, vite, dashboard)

### Protéger la branche main (optionnel)

1. Settings → Branches → Add rule
2. Branch name pattern : `main`
3. Cochez "Require pull request reviews before merging"

### Ajouter un badge

Dans votre README.md, vous pouvez ajouter :
```markdown
![GitHub](https://img.shields.io/github/license/VOTRE-USERNAME/ciat-dashboard)
![GitHub last commit](https://img.shields.io/github/last-commit/VOTRE-USERNAME/ciat-dashboard)
```

## Prochaine étape : Déployer sur Vercel

Une fois sur GitHub, suivez le guide `docs/deploiement_vercel.md` pour déployer l'application.

---

**Besoin d'aide ?**
- [Documentation Git](https://git-scm.com/doc)
- [Guide GitHub](https://docs.github.com/fr)
- [GitHub Desktop](https://docs.github.com/desktop)
