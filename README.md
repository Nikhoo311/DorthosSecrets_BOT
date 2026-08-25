# Dorthos Secrets BOT

Bot Discord pour rechercher les guides de [Dorthos Secrets](https://dorthos-secrets.fr/) et partager le Gear Score des membres d'une guilde.

## Fonctionnalités

- `/recherche`, `/aide` et `/help` : ouvrent une recherche dans les guides et outils Dorthos Secrets.
- Recherche plein texte dans l'index public `pages.json`, avec filtres par catégorie (`Stuff`, `Argent`, `Optimisation`, `Métier`).
- Résultat enrichi : image, tags, description et lien vers le guide ou l'outil.
- `/gs modifier [utilisateur]` : ajoute ou met à jour le pseudo en jeu, l'AP, le DP et des détails optionnels.
- `/gs voir [utilisateur]` : affiche la fiche stuff d'un membre.
- `/gs classement` : affiche les 10 meilleurs Gear Scores enregistrés.
- `/message-auto creer [salon]` : réservé aux officiers, programme un message récurrent avec titre, description, image optionnelle et fréquence (`1d`, `12h`, `1w`...). Sans `salon`, il est envoyé dans le salon courant.
- Message de bienvenue optionnel pour les nouveaux membres.

Le Gear Score est calculé ainsi : `GS = AP + DP`.

## Prérequis

- Node.js 22 ou plus récent.
- Une application Discord avec un bot et les permissions nécessaires pour envoyer des messages et utiliser les commandes d'application.
- Un projet Firebase avec Firestore activé, car les commandes `/gs` enregistrent les données des joueurs dans Firestore.
- L'intent **Server Members Intent** activé dans le portail Discord si le message de bienvenue est utilisé.

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
  "color": {
    "blue": "#00ADB5",
    "orange": "#f38b23",
    "dark_grey": "#393E46"
  }
}
```

`officerRoleIds` est optionnel, mais nécessaire pour autoriser les officiers à modifier le stuff d'autres membres avec `/gs modifier utilisateur`. Sans rôle configuré, chacun peut uniquement modifier son propre stuff.

Conservez aussi les couleurs `blue`, `orange` et `dark_grey` : elles sont utilisées par les cartes `/gs`.

### `.env`

```dotenv
TOKEN=VOTRE_TOKEN_DISCORD
DEV_MODE=true
SITE_URL=https://dorthos-secrets.fr
WELCOME_CHANNEL_ID=
GOOGLE_APPLICATION_CREDENTIALS=C:\chemin\absolu\vers\firebase-service-account.json
```

- `TOKEN` : token du bot Discord. Ne le partagez jamais.
- `DEV_MODE=true` : enregistre immédiatement les commandes sur `serverID`. Toute autre valeur les enregistre globalement ; la propagation peut prendre jusqu'à une heure.
- `SITE_URL` : adresse du site Dorthos Secrets. Le bot charge systématiquement `${SITE_URL}/pages.json`.
- `WELCOME_CHANNEL_ID` : identifiant facultatif du salon de bienvenue. Si vide, le bot utilise le salon système du serveur lorsqu'il existe.
- `GOOGLE_APPLICATION_CREDENTIALS` : chemin absolu vers le fichier JSON d'un compte de service Firebase disposant d'un accès à Firestore.

Ne versionnez ni `.env`, ni le fichier JSON Firebase. Les deux contiennent des secrets.

## Préparer Firebase / Firestore

1. Créez ou sélectionnez un projet Firebase.
2. Activez **Cloud Firestore**.
3. Dans les paramètres du projet, créez une clé privée de compte de service et téléchargez le JSON.
4. Placez ce fichier hors du dépôt, puis indiquez son chemin absolu dans `GOOGLE_APPLICATION_CREDENTIALS`.

Le bot lit et écrit dans la collection Firestore `players`. Chaque document est identifié par l'ID Discord du membre et contient notamment le pseudo en jeu, l'AP, le DP, le GS et la date de mise à jour.

Les messages automatiques sont stockés dans la collection `messagesAuto`. Au démarrage, elle est chargée dans le cache `client.messagesAuto`, puis les envois arrivés à échéance sont vérifiés toutes les 30 secondes.

## Démarrer le bot

```bash
npm run dev
```

Au démarrage, le bot charge les commandes, les enregistre auprès de Discord puis se connecte. Utilisez ensuite `/recherche` ou `/gs`.

## Structure utile

```text
src/
├── bot.js                         # démarrage du client Discord
├── commands/
│   ├── recherche.js                # /recherche, /aide et /help
│   └── gs.js                       # /gs modifier, voir et classement
├── components/
│   ├── btn-recherche-nouvelle.js   # modal de recherche
│   ├── modal-recherche.js          # exécution de la recherche
│   └── modal-gs-modifier.js        # saisie et mise à jour du Gear Score
├── events/                         # événements Discord et routage des interactions
├── functions/
│   ├── handlers/                   # chargement automatique
│   └── utils/firebase.js           # initialisation de Firestore
└── modules/
    ├── search/                     # index, rendu du résultat et tags
    └── stuff/                      # données joueurs et cartes Gear Score
```

## Dépannage

- **Le bot ne démarre pas** : vérifiez `TOKEN` et `GOOGLE_APPLICATION_CREDENTIALS`. Firebase est chargé au démarrage, même si vous n'utilisez pas encore `/gs`.
- **Les commandes n'apparaissent pas** : vérifiez `clientID`, `serverID` et `DEV_MODE`. En mode global, attendez la propagation Discord.
- **La recherche échoue** : vérifiez que `${SITE_URL}/pages.json` est accessible et que son contenu est une liste de pages.
- **Un officier ne peut pas modifier un membre** : ajoutez l'ID du rôle concerné dans `officerRoleIds` de `config/config.json`.
- **Le message de bienvenue ne part pas** : activez l'intent membres, puis définissez `WELCOME_CHANNEL_ID` ou un salon système Discord.

## Licence

MIT.
