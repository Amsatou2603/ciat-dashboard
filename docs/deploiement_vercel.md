# Guide de déploiement sur Vercel

Ce guide vous accompagne dans le déploiement du tableau de bord CIAT sur Vercel (frontend) et les options pour le backend.

## Architecture de déploiement

Le projet CIAT est composé de deux parties :
- **Frontend** : Application React + TypeScript + Vite (déployable sur Vercel)
- **Backend** : API Django + PostgreSQL (nécessite un hébergement avec support Python)

## Options de déploiement

### Option 1 : Frontend sur Vercel + Backend ailleurs (recommandé)

Pour un déploiement complet, vous aurez besoin de :
1. **Vercel** pour le frontend (gratuit)
2. **Railway / Render / Heroku** pour le backend Django + PostgreSQL (plans gratuits disponibles)

### Option 2 : Full-stack sur d'autres plateformes

Vous pouvez aussi déployer l'ensemble sur :
- **Railway** (Frontend + Backend + PostgreSQL)
- **Render** (Frontend + Backend + PostgreSQL)
- **DigitalOcean App Platform**

## Déploiement du Frontend sur Vercel

### 1. Préparer le code

Assurez-vous que vos modifications sont committées :

```powershell
# Vérifier les modifications
git status

# Ajouter les fichiers modifiés
git add .

# Créer un commit
git commit -m "feat: correction du logo sidebar et préparation déploiement Vercel"
```

### 2. Créer le repository GitHub

```powershell
# Initialiser Git (si pas déjà fait)
git init

# Créer le repository sur GitHub via le CLI (si installé)
gh repo create ciat-dashboard --public --source=. --remote=origin

# OU créer manuellement sur github.com puis :
git remote add origin https://github.com/VOTRE-USERNAME/ciat-dashboard.git
git branch -M main
git push -u origin main
```

### 3. Déployer sur Vercel

#### Via l'interface web Vercel (recommandé)

1. Allez sur [vercel.com](https://vercel.com)
2. Connectez-vous avec votre compte GitHub
3. Cliquez sur **"Add New Project"**
4. Importez votre repository `ciat-dashboard`
5. Configurez le projet :
   - **Framework Preset** : Vite
   - **Root Directory** : `frontend`
   - **Build Command** : `npm run build`
   - **Output Directory** : `dist`
   - **Install Command** : `npm install`

6. Ajoutez les **variables d'environnement** (Settings → Environment Variables) :
   ```
   VITE_API_URL=https://votre-backend-url.com/api
   ```

7. Cliquez sur **"Deploy"**

#### Via le CLI Vercel

```powershell
# Installer Vercel CLI
npm install -g vercel

# Se connecter
vercel login

# Déployer
cd frontend
vercel --prod
```

### 4. Configuration du Backend

Le frontend nécessite une URL backend. Vous devez :

1. **Créer un fichier de configuration d'environnement** dans le frontend

Créez `frontend/.env.production` :
```env
VITE_API_URL=https://votre-backend-url.com/api
```

2. **Mettre à jour le service API** pour utiliser cette variable

Vérifiez que `frontend/src/services/api.ts` utilise bien :
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
```

3. **Configurer CORS sur le backend**

Dans votre `.env` backend, ajoutez votre URL Vercel :
```env
CORS_ALLOWED_ORIGINS=https://votre-app.vercel.app
CSRF_TRUSTED_ORIGINS=https://votre-app.vercel.app
```

## Déploiement du Backend

### Option A : Railway (recommandé)

1. Créez un compte sur [railway.app](https://railway.app)
2. Créez un nouveau projet
3. Ajoutez PostgreSQL depuis les services disponibles
4. Ajoutez votre repository GitHub
5. Configurez les variables d'environnement depuis `.env.example`
6. Railway détectera automatiquement Django et le déploiera

### Option B : Render

1. Créez un compte sur [render.com](https://render.com)
2. Créez un **Web Service** depuis votre repository
3. Créez une **PostgreSQL database**
4. Configurez les variables d'environnement
5. Utilisez les commandes de build :
   ```
   Build Command: pip install -r backend/requirements.txt
   Start Command: cd backend && gunicorn config.wsgi:application
   ```

### Option C : Heroku

```powershell
# Installer Heroku CLI
# Puis :
heroku login
heroku create ciat-dashboard-backend
heroku addons:create heroku-postgresql:mini
heroku config:set DJANGO_SECRET_KEY=votre-cle-secrete
heroku config:set DJANGO_SETTINGS_MODULE=config.settings.prod
# ... autres variables
git subtree push --prefix backend heroku main
```

## Configuration DNS et domaine personnalisé

### Sur Vercel

1. Allez dans **Settings → Domains**
2. Ajoutez votre domaine personnalisé
3. Suivez les instructions pour configurer les DNS

### Variables d'environnement importantes

**Frontend (Vercel)** :
```env
VITE_API_URL=https://api.votredomaine.com
```

**Backend** :
```env
DJANGO_SETTINGS_MODULE=config.settings.prod
DJANGO_SECRET_KEY=generer-une-cle-forte
DJANGO_ALLOWED_HOSTS=api.votredomaine.com
CORS_ALLOWED_ORIGINS=https://votredomaine.com
CSRF_TRUSTED_ORIGINS=https://votredomaine.com
DATABASE_URL=postgresql://user:pass@host:5432/db
AI_API_KEY=votre-cle-anthropic-si-utilise
```

## Vérifications post-déploiement

- [ ] Le frontend se charge correctement
- [ ] Les appels API fonctionnent (vérifier la console réseau)
- [ ] L'authentification fonctionne
- [ ] Les images et assets se chargent
- [ ] Le thème clair/sombre fonctionne
- [ ] Les graphiques s'affichent correctement
- [ ] L'export PDF/Excel fonctionne
- [ ] L'assistant IA répond (si configuré)

## Dépannage

### Erreur CORS
Vérifiez que `CORS_ALLOWED_ORIGINS` dans le backend inclut votre URL Vercel.

### Erreur 404 sur les routes
Vérifiez que `vercel.json` contient la configuration de réécriture pour les SPA.

### Images ne se chargent pas
Vérifiez que les images sont bien dans `frontend/public/` et non dans `frontend/src/`.

### Build échoue sur Vercel
- Vérifiez les logs de build
- Assurez-vous que `package.json` est à jour
- Vérifiez qu'il n'y a pas d'erreurs TypeScript (`npm run typecheck`)

## Commandes utiles

```powershell
# Vérifier le build localement
cd frontend
npm run build
npm run preview

# Voir les logs Vercel
vercel logs

# Redéployer
vercel --prod

# Rollback vers un déploiement précédent
# (via l'interface Vercel → Deployments → Promote to Production)
```

## Sécurité en production

⚠️ **Important** :
- Ne committez JAMAIS le fichier `.env`
- Utilisez des secrets forts (64+ caractères)
- Activez HTTPS partout
- Configurez les en-têtes de sécurité
- Suivez les recommandations de `docs/securite.md`
- Désactivez `ALLOW_DEMO_SEED=false` en production

## Support

Pour plus d'informations :
- [Documentation Vercel](https://vercel.com/docs)
- [Documentation Railway](https://docs.railway.app)
- [Documentation Render](https://render.com/docs)
- `docs/deploiement.md` pour les instructions générales
