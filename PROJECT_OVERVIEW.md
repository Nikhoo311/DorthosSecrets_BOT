# Dorthos Secrets BOT — aperçu technique

## Objectif

Ce dépôt contient un bot Discord qui propose plusieurs fonctionnalités indépendantes :

- rechercher les guides et outils du site Dorthos Secrets ;
- enregistrer et afficher le Gear Score (AP + DP) des membres d'une guilde ;
- programmer des messages automatiques récurrents et envoyer des messages ponctuels ;
- configurer le message de bienvenue et les rôles officiers par serveur ;
- alimenter l'annuaire de guilde du site en synchronisant le pseudo, l'avatar et le rôle principal de chaque membre.

Le bot ne contient ni le site Dorthos Secrets ni son contenu. La recherche dépend de l'index public `${SITE_URL}/pages.json`. Toutes les autres données (Gear Score, configuration par serveur, messages automatiques, cache de l'annuaire) sont stockées dans **Supabase (Postgres)**, la même base que celle utilisée par le site Dorthos Secrets. Le bot s'y connecte avec la clé `service_role`, qui contourne le Row Level Security (RLS) : c'est ce qui lui permet d'écrire librement dans des tables où le site, lui, n'a qu'un accès restreint par RLS.

## Commandes disponibles

| Commande | Rôle |
| --- | --- |
| `/recherche` | Ouvre la modal de recherche. |
| `/aide`, `/help` | Alias de `/recherche`. |
| `/gs modifier [utilisateur]` | Ajoute ou modifie un stuff. Sans utilisateur, modifie son propre stuff. Modifier un autre membre est réservé aux officiers. |
| `/gs voir [utilisateur]` | Affiche sa fiche stuff ou celle du membre demandé. |
| `/gs classement` | Affiche les 10 meilleurs GS de la guilde. |
| `/gs tous` | Affiche tous les GS enregistrés, triés par ordre décroissant. |
| `/message [salon]` | Réservée aux officiers ; envoie un message ponctuel via modal, dans le salon indiqué ou le salon courant. |
| `/message-auto creer [salon]` | Réservée aux officiers ; programme un message récurrent (titre, description, image optionnelle, fréquence). |
| `/message-auto modifier` | Réservée aux officiers ; modifie un message automatique existant (contenu, couleur, fréquence). |
| `/message-auto supprimer` | Réservée aux officiers ; supprime un message automatique existant. |
| `/parametres` | Réservée au propriétaire du serveur ; ouvre un panneau à boutons/menus pour configurer le message de bienvenue et les rôles officiers. |
| `/roles créer` | Réservée au propriétaire du serveur ; crée les rôles de niveau configurés et persiste leurs IDs. |
| `/roles nettoyer confirmer:true` | Réservée au propriétaire du serveur ; supprime les rôles référencés par `roleLevels.categories`. |

## Cycle d'exécution

```text
Démarrage
  → src/bot.js charge .env, crée le client Discord avec les intents Guilds,
    GuildMembers et GuildMessages
  → les chargeurs lisent src/events, src/commands et src/components
  → les commandes sont enregistrées auprès de l'API Discord
  → connexion avec TOKEN
  → à l'événement clientReady : startAutomaticMessages (charge le cache des
    messages programmés) puis startGuildMembersCacheSync (première
    synchronisation de l'annuaire de guilde)

/recherche, /aide ou /help
  → ouverture de la modal (terme + catégorie)
  → téléchargement/cache de ${SITE_URL}/pages.json
  → index MiniSearch et filtrage éventuel par tag
  → affichage du meilleur résultat, puis possibilité de relancer une recherche

/gs modifier
  → contrôle de l'autorisation si un autre utilisateur est visé
  → modal pseudo/AP/DP/détails
  → validation, calcul GS = AP + DP et écriture dans la table Supabase `players`

/gs voir ou /gs classement
  → lecture de la table Supabase `players`
  → génération d'une carte PNG avec canvas
  → réponse Discord via Components V2

/roles créer
  → contrôle que l'appelant est le propriétaire de la guilde
  → création des rôles absents de `roleLevels.categories`
  → écriture des `roleId` dans `config/config.json`

/roles nettoyer confirmer:true
  → lecture des `roleId` enregistrés dans `roleLevels.categories`
  → suppression des rôles supprimables associés, quel que soit leur rang

/message
  → contrôle du rôle officier
  → modal titre/contenu
  → envoi immédiat dans le salon indiqué (ou courant), sans persistance

/message-auto creer / modifier / supprimer
  → contrôle du rôle officier
  → modal titre, description, image optionnelle et fréquence
  → écriture dans la table Supabase `messages_auto` et mise à jour du cache
    `client.messagesAuto`
  → une vérification toutes les 30 secondes envoie les messages arrivés à
    échéance et recalcule leur prochaine date d'envoi

/parametres
  → contrôle que l'appelant est le propriétaire du serveur
  → panneau à boutons pour le message de bienvenue et les rôles officiers
  → lecture/écriture de la table Supabase `guild_configuration`, qui prend le
    dessus sur les valeurs par défaut de `config/config.json`

Synchronisation de l'annuaire de guilde (guildMembersCache)
  → toutes les 10 minutes (et une fois au démarrage), récupère tous les
    membres du serveur (hors bots)
  → calcule le rôle le plus haut de chacun (member.roles.highest, en
    ignorant @everyone) et son avatar serveur ou global
  → upsert dans la table Supabase `guild_members_cache`, lue ensuite par
    l'annuaire de guilde du site
```

## Arborescence

```text
src/
├── bot.js                              # initialise le client et les chargeurs
├── commands/
│   ├── recherche.js                     # commande et alias de recherche
│   ├── gs.js                            # sous-commandes Gear Score
│   ├── message.js                       # message ponctuel
│   ├── message-auto.js                  # sous-commandes messages programmés
│   ├── parametres.js                    # panneau de configuration serveur
│   └── roles.js                         # sous-commandes rôles de niveau
├── components/
│   ├── btn-recherche-nouvelle.js        # construction de la modal de recherche
│   ├── modal-recherche.js               # recherche et mise à jour de la réponse
│   ├── modal-gs-modifier.js             # modal d'édition du stuff
│   ├── button-message-auto.js           # actions (modifier/supprimer/annuler) sur un message auto
│   ├── modal-message-auto-content.js    # modal contenu d'un message auto
│   └── modal-message-auto-update-color.js # modal couleur d'un message auto
├── events/
│   ├── ready.js                         # présence, log de démarrage, lancement des tâches de fond
│   ├── interactionCreate.js             # routage des interactions Discord
│   └── guildMemberAdd.js                # message de bienvenue optionnel
├── functions/
│   ├── handlers/                        # chargement automatique
│   └── utils/
│       ├── supabase.js                  # client Supabase (clé service_role)
│       └── Logger.js                    # logs console
└── modules/
    ├── search/
    │   ├── siteIndex.js                 # fetch, index MiniSearch et cache
    │   ├── resultMessage.js             # rendu du résultat Discord
    │   └── tagImage.js                  # tags et image de couverture canvas
    ├── configuration/
    │   ├── configuration.js             # lecture/écriture Supabase de guild_configuration
    │   └── panel.js                     # panneau /parametres (bienvenue, officiers)
    ├── messagesAuto/
    │   └── messagesAuto.js              # CRUD Supabase de messages_auto, planification, envoi
    └── stuff/
        ├── players.js                   # lecture/écriture Supabase de players et validation
        ├── guildMembersCache.js         # synchronisation périodique de guild_members_cache
        ├── resultMessage.js             # messages des fiches et classement
        ├── playerCardImage.js           # image de fiche joueur
        ├── leaderboardImage.js          # image du top 10
        └── canvasTheme.js               # thème graphique partagé
```

## Recherche

`src/modules/search/siteIndex.js` charge `${SITE_URL}/pages.json` avec un délai maximal de huit secondes. L'index est conservé en mémoire pendant cinq minutes.

Chaque page valide doit au minimum avoir un `type` (`guide` ou `tool`) et une `url`. Les champs `title`, `description`, `content`, `image` et `tags` sont normalisés lorsqu'ils existent. MiniSearch indexe le titre, la description et le contenu avec la pondération suivante : titre `3`, description `2`, contenu `1`. La recherche accepte les préfixes et une tolérance aux fautes (`fuzzy: 0.3`).

Le formulaire permet un filtre par tag : `STUFF`, `ARGENT`, `OPTIMISATION` ou `METIER`. La modal demande actuellement un seul résultat (`limit: 1`) : il n'y a ni liste ni pagination.

L'URL de l'index est toujours construite à partir de `SITE_URL`.

## Gear Score et Supabase

Les joueurs sont enregistrés dans la table Postgres `players`, dont la clé primaire est l'ID Discord. Le module `src/modules/stuff/players.js` isole entièrement le mapping snake_case (colonnes Postgres) ↔ camelCase (forme utilisée par le reste du code) ; l'objet manipulé côté bot garde exactement la même forme qu'auparavant :

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

Les variables `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` doivent être renseignées dans `.env`. Le client Supabase est initialisé au chargement de `src/functions/utils/supabase.js` : sans ces variables, le bot ne démarre pas, y compris si seule la recherche est souhaitée. La clé `service_role` contourne le RLS ; elle ne doit jamais être exposée côté site ou navigateur.

Les rôles pouvant modifier un autre membre sont configurés par défaut dans `config/config.json` :

```json
{
  "officerRoleIds": ["ROLE_ID_OFFICIER"]
}
```

Sans cette clé, seul le membre lui-même peut modifier ses valeurs. Une fois `/parametres` utilisé sur un serveur, la configuration réelle (officiers, salon de bienvenue, rôle des nouveaux membres) vit dans la table Supabase `guild_configuration` et prend le dessus sur ces valeurs par défaut. Le champ externe `newMembeRoleId` (avec la faute de frappe historique) est conservé tel quel dans le mapping, pour ne rien casser côté appelants ; la colonne Postgres correspondante s'appelle `new_member_role_id`.

## Messages automatiques et configuration serveur

`src/modules/messagesAuto/messagesAuto.js` gère la table `messages_auto` : création, modification, suppression, chargement du cache `client.messagesAuto` au démarrage, et vérification toutes les 30 secondes des messages arrivés à échéance. La création génère son propre identifiant (`crypto.randomUUID()`) avant de télécharger une éventuelle image jointe, pour garantir qu'un échec de téléchargement ne laisse jamais de ligne orpheline en base.

`src/modules/configuration/configuration.js` gère la table `guild_configuration` (une ligne par serveur Discord) : message de bienvenue, rôles officiers, rôle des nouveaux membres. `src/modules/configuration/panel.js` construit le panneau `/parametres` (boutons et menus) qui pilote ces lectures/écritures.

Ces deux tables ont le RLS activé côté Supabase, mais **aucune policy** n'est accordée à `authenticated`/`anon` : seule la clé `service_role` du bot peut y lire ou écrire.

## Cache de l'annuaire de guilde (guild_members_cache)

`src/modules/stuff/guildMembersCache.js` synchronise, toutes les 10 minutes (et une fois au démarrage), le pseudo serveur, l'avatar et le rôle principal de **tous** les membres du serveur (hors bots) vers la table Supabase `guild_members_cache`. Le rôle principal est déterminé via `member.roles.highest`, en traitant `@everyone` comme absence de rôle. L'avatar est récupéré via `member.displayAvatarURL({ extension: "png", size: 256 })` (avatar serveur si défini, sinon avatar global).

Cette table n'est jamais lue par le bot : elle existe uniquement pour que l'annuaire de guilde du site (`/guilde`) puisse afficher un pseudo et un avatar réels pour chaque membre, y compris ceux qui ne se sont jamais connectés au site. Sur le site, la vue SQL `guild_directory` fusionne les données de `profiles` (membres connectés) et de `guild_members_cache` (tous les membres), en donnant priorité aux données du profil du site quand elles existent.

C'est pour cette synchronisation, en plus du message de bienvenue, que le bot a besoin de l'intent privilégié **Server Members Intent** (`GatewayIntentBits.GuildMembers`).

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
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=VOTRE_CLE_SERVICE_ROLE
```

- `DEV_MODE=true` enregistre les commandes sur le serveur identifié par `serverID`; toute autre valeur effectue un enregistrement global.
- `welcomeChannelId` dans `config/config.json` est facultatif. S'il est vide, le bot utilise le salon système du serveur lorsqu'il existe.
- `config/config.json` doit contenir `clientID`, `serverID`, les couleurs `blue`, `orange`, `dark_grey`, et facultativement `officerRoleIds`, `welcomeChannelId`, `newMembeRoleId` et `roleLevels.categories`.
- Les tables Supabase (`players`, `guild_configuration`, `messages_auto`, `guild_members_cache`) doivent être créées avant le premier démarrage : voir « Préparer Supabase » dans [README.md](README.md).

Le guide d'installation et d'exploitation destiné aux utilisateurs est dans [README.md](README.md).

## Points d'attention

1. La recherche dépend de la disponibilité et du format de `${SITE_URL}/pages.json`.
2. Les images de résultats et avatars sont téléchargés à la demande pour être rendus avec `@napi-rs/canvas`.
3. Les erreurs de boutons, modals et menus sont principalement journalisées : elles ne produisent pas toujours de message de secours visible par l'utilisateur.
4. La connexion Supabase repose sur `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` ; cette clé contourne le RLS, elle doit donc rester strictement côté serveur du bot.
5. `GuildMembers` est un intent privilégié : il doit être activé dans le portail développeur Discord pour l'application utilisée, sous peine d'erreur `Used disallowed intents` au démarrage. Il est requis à la fois pour le message de bienvenue et pour la synchronisation de l'annuaire de guilde.
