# Dorthos Secrets BOT — récapitulatif du projet

## Objectif

Ce dépôt contient un bot Discord destiné à rechercher du contenu dans le guide en ligne **Dorthos Secrets**, dont l’adresse est configurée dans `SITE_URL`.

L’utilisateur lance la commande `/recherche`, saisit une expression, puis le bot consulte l’index de recherche **Pagefind** déjà publié par le site. Il répond dans Discord avec le meilleur guide ou outil correspondant, un extrait, une image éventuelle et un lien direct. Depuis cette réponse, l’utilisateur peut effectuer une nouvelle recherche grâce à un bouton et un modal.

Le projet ne contient donc ni le site Dorthos Secrets ni son index : il est un client Discord qui s’appuie sur le site public en ligne.

## Périmètre fonctionnel actuel

- Commandes slash : `/recherche` et son alias fonctionnel `/aide`, ouvrant toutes deux la modal de recherche.
- Recherche dans l’index Pagefind du site configuré par `SITE_URL`.
- Simplification des requêtes françaises avant recherche (retrait de mots vides).
- Exclusion des pages de sommaire `/guides` et `/tools`, pour favoriser une page de contenu précise.
- Affichage d’un seul résultat : le premier après filtrage.
- Embed Discord enrichi : titre, extrait, image miniature éventuelle, catégorie, URL et date.
- Deux catégories visuelles : `🛠️ Outil` pour les URL sous `/tools/`, sinon `📖 Guide`.
- Bouton **Nouvelle recherche** ouvrant un modal ; le résultat existant est remplacé, sans créer un nouveau message.
- Filtre de catégorie dans le modal : toutes les catégories (par défaut), stuff, argent, optimisation ou métier.
- Message de bienvenue lors de l’arrivée d’un membre, envoyé dans le salon configuré ou le salon système du serveur.
- Script séparé de diagnostic pour lister les pages remontées par Pagefind.

## Technologies et dépendances

| Élément | Rôle |
| --- | --- |
| Node.js | Runtime du bot et des scripts. |
| discord.js `14.27.0` | Client Discord, slash commands, embeds, boutons et modals. |
| @discordjs/rest + discord-api-types | Enregistrement des commandes auprès de l’API Discord. |
| dotenv | Chargement du token depuis `.env`. |
| Playwright `1.62.1` | Lance Chromium afin d’exécuter Pagefind dans le contexte HTTPS du site. |
| Chalk + Day.js | Logs console colorés et horodatés. |
| Pagefind (côté site) | Moteur/index de recherche chargé à l’exécution depuis `/pagefind/pagefind.js`. |

La commande de démarrage déclarée est :

```bash
npm run dev
```

Elle exécute `node .`, dont le point d’entrée configuré est `src/bot.js`.

## Arborescence utile

```text
.
├── src/
│   ├── bot.js                         # initialise le client Discord et les chargeurs
│   ├── commands/recherche.js           # commande /recherche
│   ├── components/
│   │   ├── btn-recherche-nouvelle.js
│   │   └── modal-recherche.js
│   ├── events/
│   │   ├── ready.js
│   │   └── interactionCreate.js
│   │   └── guildMemberAdd.js           # message de bienvenue
│   └── functions/
│       ├── handlers/                  # chargement dynamique commandes/événements/composants
│       └── utils/Logger.js
├── search/
│   ├── browser.js                     # navigateur Playwright réutilisé
│   ├── pagefind.js                    # interrogation et normalisation des résultats
│   └── resultMessage.js               # construction de la réponse Discord
├── config/
│   ├── config.json                    # identifiants Discord et palette
│   ├── examples/config.example.json   # modèle de configuration
│   └── *.png / *.jpg                  # assets Dorthos Secrets, non utilisés par le code actuel
├── list-indexed-pages.mjs             # outil de diagnostic Pagefind autonome
├── package.json
└── .env                               # secrets locaux, ignorés par Git
```

## Cycle d’exécution

```text
Démarrage
  → src/bot.js charge .env et crée le Client Discord
  → charge les événements, commandes et composants depuis leurs dossiers
  → enregistre les slash commands auprès de Discord
  → connexion avec TOKEN

/recherche ou /aide
  → ouvre la modal de recherche
  → saisie du terme et du filtre de catégorie
  → deferReply()
  → searchSite(terme, { limit: 1, tag })
  → Chromium ouvre/réutilise dorthos-secrets.fr
  → Pagefind recherche les mots-clés nettoyés
  → /guides et /tools sont retirés des résultats
  → buildResultMessage() crée embed + boutons
  → editReply()

Bouton « Nouvelle recherche »
  → ouverture du modal
  → saisie du nouveau terme
  → deferUpdate()
  → même recherche et remplacement du message
```

## Détail des modules

### Initialisation et chargement

`src/bot.js` charge les variables d’environnement, crée un `Client` avec les intents numériques `3276799`, initialise quatre collections (`commands`, `buttons`, `selectMenus`, `modals`), puis charge automatiquement les fichiers des dossiers `src/functions/handlers`.

- `handleEvents.js` lit `src/events/*.js` et branche chaque événement ; il respecte la propriété `once`.
- `handleCommands.js` lit les sous-dossiers de `src/commands`, ne conserve que les commandes ayant `active: true`, puis les enregistre globalement ou sur le serveur de développement.
- `handleComponents.js` lit les sous-dossiers de `buttons`, `modals` et `selectMenus`. Il accepte les identifiants `name` et, lorsqu’ils existent, `multi`. Les composants marqués `dynamic` ne reçoivent pas d’enregistrement supplémentaire.
- `Logger.js` centralise les logs horodatés et colorés (`CMD`, `EVT`, `CLIENT`, `SLASH COMMAND`, etc.).

`ready.js` écrit simplement dans les logs que le bot est en ligne.

`interactionCreate.js` distribue les interactions vers la collection appropriée : commande slash, bouton, soumission de modal, autocomplétion ou menu de sélection. Les erreurs des commandes slash donnent une réponse éphémère ; les autres erreurs sont actuellement uniquement journalisées.

### Recherche Pagefind

`search/browser.js` maintient un unique Chromium headless et une unique page, créés à la demande. La page est ouverte sur la racine HTTPS du site afin que l’import et les requêtes internes de Pagefind restent de même origine. `resetSearchPage()` force la recréation de la page au prochain appel. `watchBrowserCrash()` existe pour surveiller une déconnexion Chromium, mais n’est pas appelée actuellement.

`search/pagefind.js` :

1. nettoie la requête avec `extractKeywords()` ;
2. retire une liste de mots vides français et la ponctuation (en conservant lettres Unicode, chiffres et tirets) ;
3. importe dynamiquement `/pagefind/pagefind.js` dans le navigateur ;
4. récupère au moins 8 résultats bruts, ou trois fois la limite demandée ;
5. impose un délai maximal de 8 secondes ;
6. retire les pages listing `/guides` et `/tools` ;
7. retourne au plus `limit` objets normalisés (`title`, URL absolue, extrait Markdown Discord et image éventuelle).

Sur une erreur ou un timeout, la page Playwright est invalidée puis l’erreur est transmise à l’appelant. Le module affiche également dans la console les résultats bruts Pagefind : c’est un log de diagnostic explicitement signalé comme temporaire dans le code.

### Présentation Discord

`search/resultMessage.js` est partagé par la commande et le modal.

- Sans résultat : embed gris indiquant la requête et bouton de nouvelle recherche.
- Avec résultat : embed Dorthos Secrets, lien cliquable vers la page, extrait issu de Pagefind, catégorie, couleur dédiée, footer avec la requête, horodatage et miniature éventuelle.
- Le bouton lien affiche `Voir le guide` ou `Ouvrir l’outil` selon l’URL, puis le bouton secondaire ouvre le modal.

### Commande et composants

`src/commands/recherche.js` déclare `/recherche` et ouvre la modal de recherche. `/aide` réutilise le même comportement. La modal demande une limite de 1 et affiche donc uniquement `results[0]`.

`btn-recherche-nouvelle.js` ouvre le modal `modal-recherche` avec un champ court obligatoire `terme`.

`modal-recherche.js` relance exactement la même recherche. Grâce à `deferUpdate()` puis `editReply()`, le message initial est mis à jour ; dans la branche d’erreur, embeds et composants sont vidés.

## Configuration et secrets

### `.env`

Le fichier local doit au minimum contenir :

```dotenv
TOKEN=token_du_bot_discord
DEV_MODE=true
SITE_URL=https://votre-site.example/
```

- `TOKEN` est utilisé pour la connexion Discord et l’enregistrement REST des commandes.
- `DEV_MODE=true` enregistre la commande immédiatement sur le serveur défini par `serverID`.
- `SITE_URL` est l’adresse du site Dorthos Secrets interrogée par le bot et le script de diagnostic.
- `WELCOME_CHANNEL_ID` est optionnel. Renseigne l’identifiant du salon de bienvenue ; sans valeur, le bot utilise le salon système du serveur, s’il existe.
- Toute autre valeur de `DEV_MODE` utilise l’enregistrement global ; Discord peut alors mettre jusqu’à environ une heure à propager les changements.
- `DB_URL` est lu dans `src/bot.js`, mais aucune base de données ni aucun usage de cette variable n’existe dans le dépôt actuel.

Ne jamais versionner `.env` : il est bien ignoré par `.gitignore`.

### `config/config.json`

Ce fichier contient `clientID`, `serverID` et une palette de couleurs. Seuls `clientID` et `serverID` sont aujourd’hui utilisés, par le chargeur de commandes. Le modèle à copier/adapter se trouve dans `config/examples/config.example.json` ; la palette contient davantage de nuances que le fichier actif.

## Script de diagnostic

`list-indexed-pages.mjs` ne démarre pas le bot. Il lance Chromium, ouvre le site, recherche le terme sonde `Gear Progression`, puis affiche les titres et URL de toutes les pages renvoyées. Son but est de contrôler ce que l’index Pagefind expose réellement.

Exécution :

```bash
node list-indexed-pages.mjs
```

Le terme sonde suppose que « Gear Progression » apparaît sur toutes les pages (par exemple dans le footer). Si cette hypothèse ne tient plus, le script ne donnera pas une liste exhaustive et `PROBE_TERM` devra être modifié.

## Points d’attention techniques

1. **Modules JavaScript.** Les fichiers `.js` du projet utilisent CommonJS, ce qui est cohérent avec l’absence de `"type": "module"` dans `package.json`.
2. **Durée de vie de Chromium.** Le navigateur est volontairement réutilisé, mais n’est jamais fermé proprement à l’arrêt du bot. Un gestionnaire de signaux (`SIGINT`/`SIGTERM`) et l’utilisation de `watchBrowserCrash()` rendraient ce comportement plus robuste.
3. **Dépendance externe.** La recherche dépend simultanément de la disponibilité du site, de son chemin `/pagefind/pagefind.js`, de la structure de l’index et de Chromium installé par Playwright. Une modification du site peut impacter le bot sans changement dans ce dépôt.
4. **Un seul résultat utilisateur.** Le backend peut récupérer plusieurs résultats mais la commande fixe `limit = 1`. Il n’existe pas de pagination, de sélection ni de liste de résultats.
5. **Filtrage limité.** Seules les deux pages listing exactes sont exclues. D’autres pages génériques pourraient encore remonter avant une page très précise.
6. **Logs et encodage.** Le log brut Pagefind est à retirer après diagnostic. Certains commentaires et chaînes françaises apparaissent encodés de façon incorrecte dans certains affichages (`Ã©`, `ðŸ...`) ; vérifier que les sources sont enregistrées en UTF-8 et que le terminal utilise ce même encodage.
7. **Robustesse des interactions.** Pour les boutons, modals et menus, les erreurs sont affichées dans la console sans réponse de secours à l’utilisateur. Le code retourne aussi un objet `Error` lorsqu’un identifiant est inconnu, sans le lancer.
8. **Configuration.** Les assets de `config/` et la plupart des couleurs configurées ne sont pas référencés par le code fonctionnel actuel ; l’icône des embeds est chargée depuis le site public, pas depuis `config/`.

## État du dépôt observé

Le dossier de travail ne contient pas de dépôt Git initialisé ou accessible (les commandes `git status` et `git log` échouent). Aucune information d’historique ou de branches ne peut donc être déduite localement.
