# Dorthos Secrets BOT — aperçu technique

## Objectif

Ce dépôt contient un bot Discord qui propose deux fonctionnalités indépendantes :

- rechercher les guides et outils du site Dorthos Secrets ;
- enregistrer et afficher le Gear Score (AP + DP) des membres d'une guilde.

Le bot ne contient ni le site Dorthos Secrets ni son contenu. La recherche dépend de l'index public `${SITE_URL}/pages.json`. Les données de Gear Score sont stockées dans Cloud Firestore.

## Commandes disponibles

| Commande | Rôle |
| --- | --- |
| `/recherche` | Ouvre la modal de recherche. |
| `/aide`, `/help` | Alias de `/recherche`. |
| `/gs modifier [utilisateur]` | Ajoute ou modifie un stuff. Sans utilisateur, modifie son propre stuff. Modifier un autre membre est réservé aux officiers. |
| `/gs voir [utilisateur]` | Affiche sa fiche stuff ou celle du membre demandé. |
| `/gs classement` | Affiche les 10 meilleurs GS de la guilde. |
| `/gs tous` | Affiche tous les GS enregistrés, triés par ordre décroissant. |
| `/message-auto creer` | Réservée aux officiers ; programme un message récurrent dans le salon courant. |

## Cycle d'exécution

```text
Démarrage
  → src/bot.js charge .env et crée le client Discord
  → les chargeurs lisent src/events, src/commands et src/components
  → les commandes sont enregistrées auprès de l'API Discord
  → connexion avec TOKEN

/recherche, /aide ou /help
  → ouverture de la modal (terme + catégorie)
  → téléchargement/cache de ${SITE_URL}/pages.json
  → index MiniSearch et filtrage éventuel par tag
  → affichage du meilleur résultat, puis possibilité de relancer une recherche

/gs modifier
  → contrôle de l'autorisation si un autre utilisateur est visé
  → modal pseudo/AP/DP/détails
  → validation, calcul GS = AP + DP et écriture Firestore

/gs voir ou /gs classement
  → lecture Firestore
  → génération d'une carte PNG avec canvas
  → réponse Discord via Components V2

/message-auto creer
  → contrôle du rôle officier
  → modal titre, description, image optionnelle et fréquence
  → écriture dans Firestore `messagesAuto` et ajout au cache `client.messagesAuto`
  → au démarrage, chargement du cache puis envoi des messages arrivés à échéance
```

## Arborescence

```text
src/
├── bot.js                              # initialise le client et les chargeurs
├── commands/
│   ├── recherche.js                     # commande et alias de recherche
│   └── gs.js                            # sous-commandes Gear Score
├── components/
│   ├── btn-recherche-nouvelle.js        # construction de la modal de recherche
│   ├── modal-recherche.js               # recherche et mise à jour de la réponse
│   └── modal-gs-modifier.js             # modal d'édition du stuff
├── events/
│   ├── ready.js                         # présence et log de démarrage
│   ├── interactionCreate.js             # routage des interactions Discord
│   └── guildMemberAdd.js                # message de bienvenue optionnel
├── functions/
│   ├── handlers/                        # chargement automatique
│   └── utils/
│       ├── firebase.js                  # initialisation Firestore
│       └── Logger.js                    # logs console
└── modules/
    ├── search/
    │   ├── siteIndex.js                 # fetch, index MiniSearch et cache
    │   ├── resultMessage.js             # rendu du résultat Discord
    │   └── tagImage.js                  # tags et image de couverture canvas
    └── stuff/
        ├── players.js                   # lecture/écriture Firestore et validation
        ├── resultMessage.js             # messages des fiches et classement
        ├── playerCardImage.js            # image de fiche joueur
        ├── leaderboardImage.js           # image du top 10
        └── canvasTheme.js                # thème graphique partagé
```

## Recherche

`src/modules/search/siteIndex.js` charge `${SITE_URL}/pages.json` avec un délai maximal de huit secondes. L'index est conservé en mémoire pendant cinq minutes.

Chaque page valide doit au minimum avoir un `type` (`guide` ou `tool`) et une `url`. Les champs `title`, `description`, `content`, `image` et `tags` sont normalisés lorsqu'ils existent. MiniSearch indexe le titre, la description et le contenu avec la pondération suivante : titre `3`, description `2`, contenu `1`. La recherche accepte les préfixes et une tolérance aux fautes (`fuzzy: 0.3`).

Le formulaire permet un filtre par tag : `STUFF`, `ARGENT`, `OPTIMISATION` ou `METIER`. La modal demande actuellement un seul résultat (`limit: 1`) : il n'y a ni liste ni pagination.

L'URL de l'index est toujours construite à partir de `SITE_URL`.

## Gear Score et Firestore

Les joueurs sont enregistrés dans la collection `players`. Le document est identifié par l'ID Discord du joueur et contient :

```js
{
  discordId,
  discordUsername,
  ingameName,
  ap,
  dp,
  gs: ap + dp,
  details,
  updatedAt,
  updatedBy
}
```

Les limites actuelles sont : pseudo 32 caractères, détails 500 caractères, AP entre 0 et 3000, DP entre 0 et 1500.

La variable `GOOGLE_APPLICATION_CREDENTIALS` doit désigner le chemin absolu du fichier JSON de compte de service Firebase. Firebase est initialisé lors du chargement des commandes : sans cette variable, le bot ne démarre pas, y compris si seule la recherche est souhaitée.

Les rôles pouvant modifier un autre membre sont configurés dans `config/config.json` :

```json
{
  "officerRoleIds": ["ROLE_ID_OFFICIER"]
}
```

Sans cette clé, seul le membre lui-même peut modifier ses valeurs.

## Rendu Canvas et thème visuel

Le projet utilise `@napi-rs/canvas` pour produire des images PNG envoyées comme pièces jointes Discord. Cela permet d'avoir une présentation homogène, qui ne dépend pas du rendu des embeds Discord.

- `src/modules/search/tagImage.js` génère les badges de tags et réduit/cadre les images de couverture des résultats de recherche au format `480 × 270`.
- `src/modules/stuff/playerCardImage.js` dessine la fiche d'un joueur : pseudo, AP, DP, GS et avatar Discord.
- `src/modules/stuff/leaderboardImage.js` dessine le top 10 avec rang, barre proportionnelle au meilleur GS, statistiques et avatar.
- `src/modules/stuff/canvasTheme.js` est la source unique du style partagé des cartes `/gs` : couleurs de fond, surfaces alternées, texte, or, barre de progression, couleurs des trois premiers rangs, coins arrondis et troncature de texte.

Les cartes `/gs` sont dessinées avec `SCALE = 3`, puis exportées en PNG : le dessin est donc calculé à une définition supérieure pour rester net dans Discord. Les avatars sont chargés depuis Discord et recadrés en cercle ; en cas d'échec de téléchargement ou d'avatar absent, un cercle de couleur neutre est affiché à sa place au lieu de faire échouer la commande.

## Configuration requise

```dotenv
TOKEN=VOTRE_TOKEN_DISCORD
DEV_MODE=true
SITE_URL=https://dorthos-secrets.fr
GOOGLE_APPLICATION_CREDENTIALS=C:\chemin\vers\firebase-service-account.json
```

- `DEV_MODE=true` enregistre les commandes sur le serveur identifié par `serverID`; toute autre valeur effectue un enregistrement global.
- `welcomeChannelId` dans `config/config.json` est facultatif. S'il est vide, le bot utilise le salon système du serveur lorsqu'il existe.
- `config/config.json` doit contenir `clientID`, `serverID`, les couleurs `blue`, `orange`, `dark_grey`, et facultativement `officerRoleIds`, `welcomeChannelId` et `newMembeRoleId`.

Le guide d'installation et d'exploitation destiné aux utilisateurs est dans [README.md](README.md).

## Points d'attention

1. La recherche dépend de la disponibilité et du format de `${SITE_URL}/pages.json`.
2. Les images de résultats et avatars sont téléchargés à la demande pour être rendus avec `@napi-rs/canvas`.
3. Les erreurs de boutons, modals et menus sont principalement journalisées : elles ne produisent pas toujours de message de secours visible par l'utilisateur.
4. La connexion Firestore repose sur `GOOGLE_APPLICATION_CREDENTIALS` et le compte de service indiqué doit disposer des droits nécessaires.
