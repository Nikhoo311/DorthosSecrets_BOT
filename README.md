# Dorthos Secrets BOT

Bot Discord pour rechercher les guides de [Dorthos Secrets](https://dorthos-secrets.fr/), partager le Gear Score des membres d'une guilde, et alimenter l'annuaire de guilde du site.

## Fonctionnalités

- `/recherche`, `/aide` et `/help` : ouvrent une recherche dans les guides et outils Dorthos Secrets.
- Recherche plein texte dans l'index public `pages.json`, avec filtres par catégorie (`Stuff`, `Argent`, `Optimisation`, `Métier`).
- Résultat enrichi : image, tags, description et lien vers le guide ou l'outil.
- `/gs modifier [utilisateur]` : ajoute ou met à jour le pseudo en jeu, l'AP, le DP et des détails optionnels.
- `/gs voir [utilisateur]` : affiche la fiche stuff d'un membre.
- `/gs classement` : affiche les 10 meilleurs Gear Scores enregistrés.
- `/gs tous` : affiche tous les Gear Scores enregistrés, triés par ordre décroissant.
- `/message` : réservé aux officiers, envoie un message ponctuel dans un salon.
- `/message-auto creer [salon]` : réservé aux officiers, programme un message récurrent avec titre, description, image optionnelle et fréquence (`1d`, `12h`, `1w`...). Sans `salon`, il est envoyé dans le salon courant.
- `/message-auto modifier` / `/message-auto supprimer` : réservés aux officiers, modifient ou suppriment un message automatique existant.
- `/parametres` : réservé au propriétaire du serveur, configure le message de bienvenue et les rôles officiers via une interface à boutons/menus.
- Message de bienvenue optionnel pour les nouveaux membres.
- `/roles créer` : réservé au propriétaire du serveur, crée les rôles déclarés dans `roleLevels.categories` et enregistre leurs IDs dans la configuration.
- `/roles nettoyer confirmer:true` : réservé au propriétaire du serveur, supprime les rôles enregistrés dans `roleLevels.categories`.

Le Gear Score est calculé ainsi : `GS = AP + DP`.

En arrière-plan, le bot synchronise toutes les 10 minutes le pseudo serveur, l'avatar et le rôle principal de chaque membre vers Supabase. C'est ce qui permet à l'annuaire de guilde du site (`dorthos-secrets.fr/guilde`) d'afficher une vraie photo et un vrai pseudo pour tous les membres, même ceux qui ne se sont jamais connectés au site.

## Prérequis

- Node.js 22 ou plus récent.
- Une application Discord avec un bot et les permissions nécessaires pour envoyer des messages et utiliser les commandes d'application.
- L'intent privilégié **Server Members Intent** activé dans le portail développeur Discord pour cette application. Il est nécessaire pour le message de bienvenue ET pour la synchronisation de l'annuaire de guilde.
- Un projet [Supabase](https://supabase.com) avec les tables SQL du bot déjà créées (voir « Préparer Supabase » plus bas). C'est la même base que celle utilisée par le site Dorthos Secrets.

## Installation

```bash
git clone https://github.com/VOTRE_UTILISATEUR/dorthos-secrets-bot.git
cd dorthos-secrets-bot
npm install
```

Créez ensuite les fichiers de configuration :

```powershell
Copy-Item config/examples/config.example.json config/config.json
Copy-Item .env.example .env
```

Sous macOS ou Linux :

```bash
cp config/examples/config.example.json config/config.json
cp .env.example .env
```

## Configuration

### `config/config.json`

Renseignez l'identifiant de l'application Discord et celui du serveur de développement :

```json
{
  "clientID": "APPLICATION_ID",
  "serverID": "SERVER_ID",
  "officerRoleIds": ["ROLE_ID_OFFICIER"],
  "welcomeChannelId": "WELCOME_CHANNEL_ID",
  "newMembeRoleId": "NEW_MEMBER_ROLE_ID",
  "color": {
    "blue": "#00ADB5",
    "orange": "#f38b23",
    "dark_grey": "#393E46"
  }
}
```

`officerRoleIds` est optionnel, mais nécessaire pour autoriser les officiers à modifier le stuff d'autres membres avec `/gs modifier utilisateur`, ainsi que pour `/message`, `/message-auto` et l'espace officier de `/parametres`. Sans rôle configuré, chacun peut uniquement modifier son propre stuff. Ces trois champs (`officerRoleIds`, `welcomeChannelId`, `newMembeRoleId`) ne servent que de valeurs par défaut : une fois `/parametres` utilisé sur un serveur, sa configuration réelle vit dans Supabase et prend le dessus.

`welcomeChannelId` est facultatif. S'il est vide, le bot utilise le salon système du serveur lorsqu'il existe.

`newMembeRoleId` est facultatif. S'il est renseigné, le rôle correspondant est ajouté automatiquement aux nouveaux membres. Le rôle du bot doit être placé au-dessus de ce rôle dans la hiérarchie Discord.

Conservez aussi les couleurs `blue`, `orange` et `dark_grey` : elles sont utilisées par les cartes `/gs`.

### Rôles de niveau

`roleLevels.categories` contient les catégories, leurs niveaux, couleurs, noms et `roleId`. La commande `/roles créer` crée les rôles absents puis enregistre leurs IDs dans `config/config.json`.

`/roles nettoyer confirmer:true` est destructive : elle supprime les rôles référencés par les `roleId` de `roleLevels.categories`, quel que soit leur rang dans la hiérarchie.

Les deux commandes `/roles` sont réservées au propriétaire du serveur et requièrent la permission **Gérer les rôles** pour le bot.

### `.env`

```dotenv
TOKEN=VOTRE_TOKEN_DISCORD
DEV_MODE=true
SITE_URL=https://dorthos-secrets.fr
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=VOTRE_CLE_SERVICE_ROLE
```

- `TOKEN` : token du bot Discord. Ne le partagez jamais.
- `DEV_MODE=true` : enregistre immédiatement les commandes sur `serverID`. Toute autre valeur les enregistre globalement ; la propagation peut prendre jusqu'à une heure.
- `SITE_URL` : adresse du site Dorthos Secrets. Le bot charge systématiquement `${SITE_URL}/pages.json`.
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` : projet et clé Supabase (Project Settings → API). Cette clé **contourne le RLS** : elle ne doit jamais quitter le serveur du bot (ni le site, ni un navigateur, ni git).

Ne versionnez jamais `.env` : il contient des secrets.

## Préparer Supabase

1. Créez un projet Supabase, ou réutilisez celui du site Dorthos Secrets — c'est volontairement la même base, ce qui permet au site de lire les données du bot (annuaire de guilde, sets de cristaux partagés, etc.).
2. Dans le SQL Editor du projet, exécutez les scripts SQL du dépôt du site (`bdo-guide-site/supabase/sql/`), dans cet ordre : `players.sql`, `bot_messages_auto.sql` (tables `guild_configuration` et `messages_auto`), puis `guild_members_cache.sql`.
3. Récupérez l'URL du projet et la clé `service_role` (Project Settings → API), et renseignez-les dans `.env`.

Le bot lit et écrit trois tables Postgres :

- `players` — Gear Score des membres (`/gs`), clé primaire l'ID Discord.
- `guild_configuration` — configuration par serveur (`/parametres`), remplace les valeurs par défaut de `config/config.json` une fois modifiée.
- `messages_auto` — messages programmés (`/message-auto`). Au démarrage, les messages actifs sont chargés dans le cache `client.messagesAuto`, puis les envois arrivés à échéance sont vérifiés toutes les 30 secondes.

Il alimente aussi, en écriture seule, une quatrième table :

- `guild_members_cache` — pseudo serveur, avatar et rôle principal de chaque membre, resynchronisés toutes les 10 minutes. Cette table n'est lue que par le site (annuaire de guilde), jamais par le bot lui-même.

## Démarrer le bot

```bash
npm run dev
```

Au démarrage, le bot charge les commandes, les enregistre auprès de Discord, se connecte, puis lance le chargement des messages automatiques et la première synchronisation de l'annuaire de guilde.

Utilisez ensuite `/recherche` ou `/gs`.

## Structure utile

```text
src/
├── bot.js                              # démarrage du client Discord
├── commands/
│   ├── recherche.js                     # /recherche, /aide et /help
│   ├── gs.js                            # /gs modifier, voir, classement et tous
│   ├── message.js                       # /message
│   ├── message-auto.js                  # /message-auto creer, modifier, supprimer
│   ├── parametres.js                    # /parametres
│   └── roles.js                         # /roles créer et nettoyer
├── components/
│   ├── btn-recherche-nouvelle.js        # modal de recherche
│   ├── modal-recherche.js               # exécution de la recherche
│   └── modal-gs-modifier.js             # saisie et mise à jour du Gear Score
├── events/                              # événements Discord et routage des interactions
├── functions/
│   ├── handlers/                        # chargement automatique
│   └── utils/supabase.js                # client Supabase (clé service_role)
└── modules/
    ├── search/                          # index, rendu du résultat et tags
    ├── configuration/                   # configuration par serveur (Supabase)
    ├── messagesAuto/                    # messages programmés (Supabase)
    └── stuff/                           # données joueurs, cartes Gear Score, cache de l'annuaire
```

## Dépannage

- **Le bot ne démarre pas** : vérifiez `TOKEN`, `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`.
- **Les commandes n'apparaissent pas** : vérifiez `clientID`, `serverID` et `DEV_MODE`. En mode global, attendez la propagation Discord.
- **La recherche échoue** : vérifiez que `${SITE_URL}/pages.json` est accessible et que son contenu est une liste de pages.
- **Un officier ne peut pas modifier un membre** : ajoutez l'ID du rôle concerné dans `officerRoleIds` de `config/config.json`, ou via `/parametres`.
- **Le message de bienvenue ne part pas, ou l'annuaire du site n'affiche pas les avatars** : vérifiez que le **Server Members Intent** est activé pour l'application actuellement utilisée par le bot (portail développeur Discord → Bot → Privileged Gateway Intents). C'est la cause la plus fréquente d'erreur `Used disallowed intents` au démarrage.
- **`/gs`, `/parametres` ou `/message-auto` échouent avec une erreur venant de Supabase** : vérifiez que les scripts SQL de « Préparer Supabase » ont bien été exécutés, et que `SUPABASE_SERVICE_ROLE_KEY` est correcte.

## Licence

MIT.
