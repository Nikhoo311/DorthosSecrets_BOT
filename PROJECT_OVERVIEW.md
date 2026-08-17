# Dorthos Secrets BOT — récapitulatif du projet

## Objectif

Ce dépôt contient un bot Discord destiné à rechercher du contenu dans le guide en ligne **Dorthos Secrets**, dont l'adresse est configurée dans `SITE_URL`.

L'utilisateur lance la commande `/recherche` (ou `/aide`), saisit une expression dans une modal, puis le bot recherche dans **`pages.json`** — un index public et statique publié par le site (guides + outils, avec titre, description, contenu texte et tags) — via la librairie **MiniSearch**. Il répond dans Discord avec le meilleur résultat trouvé : image, tags, description et lien direct. Depuis cette réponse, l'utilisateur peut effectuer une nouvelle recherche grâce à un bouton et un modal.

Le projet ne contient donc ni le site Dorthos Secrets ni son index : il est un client Discord qui s'appuie sur le fichier JSON public publié par le site.

## Périmètre fonctionnel actuel

- Commandes slash : `/recherche` et son alias fonctionnel `/aide`, ouvrant toutes deux la modal de recherche.
- Recherche plein texte (titre, description, contenu) dans `pages.json`, via MiniSearch (tolérance aux fautes de frappe, recherche par préfixe, pondération par champ).
- Filtre de catégorie dans le modal : toutes les catégories (par défaut), stuff, argent, optimisation ou métier — basé sur le champ `tags` de chaque guide dans `pages.json`.
- Affichage d'un seul résultat : le meilleur après filtrage.
- Réponse Discord (Components V2) : titre lien, image réduite en miniature, badges de tags générés dynamiquement (canvas), description, boutons "Voir le guide/l'outil" et "Nouvelle recherche".
- Catégories visuelles selon l'URL : `🛠️` pour `/tools/*`, sinon `📖`.
- Bouton **Nouvelle recherche** ouvrant un modal ; le résultat existant est remplacé, sans créer un nouveau message.
- Message de bienvenue lors de l'arrivée d'un membre, envoyé dans le salon configuré ou le salon système du serveur.

## Technologies et dépendances

| Élément | Rôle |
| --- | --- |
| Node.js | Runtime du bot. |
| discord.js `14.27.0` | Client Discord, slash commands, modals, boutons, Components V2. |
| @discordjs/rest + discord-api-types | Enregistrement des commandes auprès de l'API Discord. |
| dotenv | Chargement du token et de `SITE_URL` depuis `.env`. |
| minisearch | Index de recherche plein texte en mémoire, construit à partir de `pages.json`. |
| @napi-rs/canvas | Génère les images de badges de tags, réduit l'image de couverture du résultat, et dessine les cartes stuff/classement (`/gs`). |
| Chalk + Day.js | Logs console colorés et horodatés. |
| pages.json (côté site) | Index public statique (guides + outils) publié par le site, régénéré à chaque build. |

La commande de démarrage déclarée est :

```bash
npm run dev
```

Elle exécute `node .`, dont le point d'entrée configuré est `src/bot.js`.

## Arborescence utile

```text
.
├── src/
│   ├── bot.js                         # initialise le client Discord et les chargeurs
│   ├── commands/
│   │   ├── recherche.js                # commande /recherche (ouvre la modal)
│   │   └── aide.js                     # alias de /recherche
│   ├── components/
│   │   ├── btn-recherche-nouvelle.js   # bouton + construction de la modal
│   │   └── modal-recherche.js          # traitement de la soumission (recherche + réponse)
│   ├── events/
│   │   ├── ready.js
│   │   ├── interactionCreate.js        # distribue commandes/boutons/modals/select menus
│   │   └── guildMemberAdd.js           # message de bienvenue
│   ├── functions/
│   │   ├── handlers/                  # chargement dynamique commandes/événements/composants
│   │   └── utils/Logger.js
│   └── modules/
│       ├── search/
│       │   ├── siteIndex.js           # fetch pages.json, index MiniSearch, recherche + filtre tag
│       │   ├── resultMessage.js       # construction de la réponse Discord (Components V2)
│       │   └── tagImage.js            # génération canvas des badges de tags + réduction d'image
│       └── stuff/                     # gear/leaderboard (/gs) — voir PLAN_STUFF_LEADERBOARD.md
├── config/
│   ├── config.json                    # identifiants Discord et palette
│   ├── examples/config.example.json   # modèle de configuration
│   └── *.png / *.jpg                  # assets Dorthos Secrets, non utilisés par le code actuel
├── package.json
└── .env                               # secrets locaux, ignorés par Git
```

## Cycle d'exécution

```text
Démarrage
  → src/bot.js charge .env et crée le Client Discord
  → charge les événements, commandes et composants depuis leurs dossiers
  → enregistre les slash commands auprès de Discord
  → connexion avec TOKEN

/recherche ou /aide
  → ouvre la modal de recherche (terme + catégorie)
  → soumission du modal
  → deferReply()/deferUpdate()
  → searchSite(terme, { limit: 1, tag })
      → fetch de SITE_URL/pages.json (mis en cache 5 min)
      → recherche MiniSearch (fuzzy + préfixe + boost titre > description > contenu)
      → filtre par tag si une catégorie a été choisie
  → buildResultMessage() crée le message (image, tags, description, boutons)
  → editReply()

Bouton « Nouvelle recherche »
  → ouverture du modal
  → saisie du nouveau terme
  → deferUpdate()
  → même recherche et remplacement du message
```

## Détail des modules

### Initialisation et chargement

`src/bot.js` charge les variables d'environnement, crée un `Client` avec les intents numériques `3276799`, initialise quatre collections (`commands`, `buttons`, `selectMenus`, `modals`), puis charge automatiquement les fichiers des dossiers `src/functions/handlers`.

- `handleEvents.js` lit `src/events/*.js` et branche chaque événement ; il respecte la propriété `once`.
- `handleCommands.js` lit les sous-dossiers de `src/commands`, ne conserve que les commandes ayant `active: true`, puis les enregistre globalement ou sur le serveur de développement.
- `handleComponents.js` lit les sous-dossiers de `buttons`, `modals` et `selectMenus`. Il accepte les identifiants `name` et, lorsqu'ils existent, `multi`.
- `Logger.js` centralise les logs horodatés et colorés (`CMD`, `EVT`, `CLIENT`, `SLASH COMMAND`, etc.).

`ready.js` écrit simplement dans les logs que le bot est en ligne.

`interactionCreate.js` distribue les interactions vers la collection appropriée : commande slash, bouton, soumission de modal, autocomplétion ou menu de sélection. Les erreurs des commandes slash donnent une réponse éphémère ; les autres erreurs sont actuellement uniquement journalisées.

### Recherche (`src/modules/search/siteIndex.js`)

1. Récupère `SITE_URL/pages.json` (ou `PAGES_INDEX_URL` si défini), avec un timeout de 8 secondes.
2. Construit un index MiniSearch sur les champs `title`, `description`, `content`, avec `boost: { title: 3, description: 2, content: 1 }` et `fuzzy: 0.3` (tolérance nécessaire pour absorber les pluriels/fautes de frappe en français).
3. Met en cache l'index en mémoire pendant 5 minutes (`TTL_MS`) avant de re-fetch.
4. `searchSite(query, { limit, tag })` recherche, filtre par tag si demandé (ignoré si `pages.json` ne contient aucun tag, pour ne jamais renvoyer zéro résultat à cause d'un format inattendu), puis retourne au plus `limit` résultats normalisés (`title`, `type`, `description`, `url`, `image`, `tags`).

### Présentation Discord (`src/modules/search/resultMessage.js` + `src/modules/search/tagImage.js`)

- Sans résultat : message minimal avec bouton de nouvelle recherche.
- Avec résultat : titre cliquable, image de couverture réduite en 480×270 (via `canvas`), badges de tags générés dynamiquement (couleur/icône par catégorie), description, boutons "Voir le guide/l'outil" et "Nouvelle recherche".
- Catégorie déduite de l'URL (`/tools/` → outil, sinon guide).

### Commande et composants

`src/commands/recherche.js` déclare `/recherche` et ouvre la modal de recherche. `/aide` réutilise le même comportement.

`btn-recherche-nouvelle.js` construit la modal `modal-recherche` : un champ texte obligatoire (`terme`) et un menu déroulant de catégorie (`recherche-categorie`), tous deux capturés comme composants de la modal (API Modal Components de discord.js `14.27+`).

`modal-recherche.js` lit `terme` et `recherche-categorie`, appelle `searchSite(query, { limit: 1, tag })`, puis affiche le résultat. Gère les erreurs de recherche (message d'erreur dédié) et les cas `deferUpdate()`/`deferReply()` selon le contexte d'ouverture du modal.

## Configuration et secrets

### `.env`

Le fichier local doit au minimum contenir :

```dotenv
TOKEN=token_du_bot_discord
DEV_MODE=true
SITE_URL=https://votre-site.example/
```

- `TOKEN` est utilisé pour la connexion Discord et l'enregistrement REST des commandes.
- `DEV_MODE=true` enregistre la commande immédiatement sur le serveur défini par `serverID`.
- `SITE_URL` est l'adresse du site Dorthos Secrets ; le bot y ajoute `/pages.json` pour récupérer l'index (`PAGES_INDEX_URL` permet de surcharger ce chemin si besoin).
- `WELCOME_CHANNEL_ID` est optionnel. Renseigne l'identifiant du salon de bienvenue ; sans valeur, le bot utilise le salon système du serveur, s'il existe.
- Toute autre valeur de `DEV_MODE` utilise l'enregistrement global ; Discord peut alors mettre jusqu'à environ une heure à propager les changements.

Ne jamais versionner `.env` : il est bien ignoré par `.gitignore`.

### `config/config.json`

Ce fichier contient `clientID`, `serverID` et une palette de couleurs. Seuls `clientID` et `serverID` sont aujourd'hui utilisés, par le chargeur de commandes. Le modèle à copier/adapter se trouve dans `config/examples/config.example.json`.

## Points d'attention techniques

1. **Dépendances natives.** `@napi-rs/canvas` fournit des binaires précompilés (0 dépendance système), contrairement à l'ancien `canvas` — à vérifier malgré tout après tout changement d'environnement (OS, version de Node).
2. **Dépendance externe.** La recherche dépend de la disponibilité de `SITE_URL/pages.json` et de sa structure (`type`, `title`, `description`, `url`, `image`, `content`, `tags`). Un changement de format côté site (sans coordination) casserait le bot.
3. **Un seul résultat utilisateur.** Le backend peut récupérer plusieurs résultats mais la modal fixe `limit = 1`. Il n'existe pas de pagination, de sélection ni de liste de résultats.
4. **Cache de 5 minutes.** Un guide publié ou modifié sur le site n'apparaît dans le bot qu'après expiration du cache (`TTL_MS` dans `src/modules/search/siteIndex.js`), sans redéploiement nécessaire.
5. **Robustesse des interactions.** Pour les boutons, modals et menus, les erreurs sont affichées dans la console sans réponse de secours à l'utilisateur dans tous les cas. Le code retourne aussi un objet `Error` lorsqu'un identifiant est inconnu, sans le lancer.
6. **Configuration.** Les assets de `config/` et la plupart des couleurs configurées ne sont pas référencés par le code fonctionnel actuel.
