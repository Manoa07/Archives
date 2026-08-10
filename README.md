# Gestion des Archives de Sacrements

Application locale pour enregistrer, consulter et administrer des archives paroissiales de sacrements.

Le projet fonctionne comme une application web servie par `Express`, avec une interface chargée dans le navigateur ou dans `Electron`.

## Fonctionnalités

- Authentification par mot de passe administrateur
- Enregistrement des sacrements
- Enregistrement des mariages
- Recherche et filtrage des actes
- Suppression d'un enregistrement avec confirmation
- Génération PDF pour les actes de baptême
- Utilisation locale avec stockage léger en fichiers `.db`

## Lancement

### Développement web

```bash
npm install
cp .env.example .env
```

Renseigner ensuite dans `.env` :

```env
SESSION_SECRET=une-cle-secrete
ADMIN_PASSWORD=un-mot-de-passe-admin
PORT=3000
```

Puis lancer :

```bash
node server.js
```

L'application sera disponible sur `http://localhost:3000`.

### Version Electron

```bash
npm start
```
Build
```bash
npm run build:win
```

L'installateur Windows est généré dans `dist/`. Après installation, les bases
de données et le mot de passe sont conservés dans le dossier de données local
de l'utilisateur Windows, et non dans `Program Files`. Au premier lancement,
le mot de passe initial est `admin` : changez-le immédiatement dans
l'application.
## Structure du projet

### Entrées principales

- [server.js](./server.js) : point d'entrée backend, assemble les modules serveur
- [main.js](./main.js) : point d'entrée Electron
- [index.html](./index.html) : structure principale de l'interface

### Frontend

Les fichiers frontend sont volontairement séparés par responsabilité pour éviter un gros script unique.

- [frontend/state.js](./frontend/state.js) : état global minimal et constantes métier
- [frontend/dom.js](./frontend/dom.js) : références centralisées aux éléments HTML
- [frontend/api.js](./frontend/api.js) : appels HTTP vers le backend
- [frontend/ui.js](./frontend/ui.js) : affichage, navigation, messages, rendu du tableau
- [frontend/records.js](./frontend/records.js) : logique métier liée aux enregistrements
- [frontend/app.js](./frontend/app.js) : point d'entrée frontend, branche les événements

### Backend

Le backend est aussi séparé en petits modules simples.

- [backend/config.js](./backend/config.js) : chargement et validation de la configuration
- [backend/db.js](./backend/db.js) : création des bases de données locales
- [backend/middleware.js](./backend/middleware.js) : middlewares communs, auth et gestion d'erreurs async
- [backend/routes/auth.js](./backend/routes/auth.js) : connexion et état de session
- [backend/routes/mariages.js](./backend/routes/mariages.js) : routes liées aux mariages
- [backend/routes/sacrements.js](./backend/routes/sacrements.js) : routes des sacrements
- [backend/routes/pages.js](./backend/routes/pages.js) : fallback pour servir l'application web

### Styles

Le CSS est découpé pour rester lisible.

- [styles/base.css](./styles/base.css) : variables et règles globales
- [styles/layout.css](./styles/layout.css) : structure générale de page
- [styles/components.css](./styles/components.css) : boutons, cartes, overlays, composants UI
- [styles/forms.css](./styles/forms.css) : formulaires
- [styles/tables.css](./styles/tables.css) : tableaux et bloc dashboard textuel
- [styles/responsive.css](./styles/responsive.css) : adaptations mobile

## Où modifier quoi

### Changer un texte, un champ ou un bouton

Commencer par :

- [index.html](./index.html)
- puis [frontend/dom.js](./frontend/dom.js) si un `id` ou un `data-*` change
- puis [frontend/app.js](./frontend/app.js) si l'événement associé change

### Changer un comportement visuel

Regarder :

- [frontend/ui.js](./frontend/ui.js)
- et les fichiers dans [styles/](./styles)

### Changer la logique d'un enregistrement

Regarder :

- [frontend/records.js](./frontend/records.js)
- [backend/routes/mariages.js](./backend/routes/mariages.js)
- [backend/routes/sacrements.js](./backend/routes/sacrements.js)

### Changer une route API ou un appel serveur

Regarder :

- [frontend/api.js](./frontend/api.js)
- puis la route backend correspondante dans [backend/routes/](./backend/routes)

### Changer la configuration ou le stockage

Regarder :

- [backend/config.js](./backend/config.js)
- [backend/db.js](./backend/db.js)
- [.env.example](./.env.example)

## Données locales

Les données sont stockées dans des fichiers locaux NeDB :

- `mariages.db`
- `sacrements.db`

Ces fichiers sont ignorés par Git.

## Notes de maintenance

- Le frontend n'utilise pas de framework ni de build step.
- Le code est organisé pour rester simple à suivre à la main.
- Les commentaires ajoutés dans les modules servent surtout de repères de responsabilité.
- Si tu renommes un champ HTML, pense à vérifier `index.html`, `frontend/dom.js` et le module métier concerné.
