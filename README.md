# Dorthos Secrets BOT

Bot Discord de recherche pour le guide [Dorthos Secrets](https://dorthos-secrets.fr/). Il permet de retrouver rapidement un guide ou un outil depuis Discord, à partir de l’index Pagefind du site.

## Fonctionnalités

- Commande slash `/recherche` pour interroger le guide.
- Recherche optimisée : retrait des mots vides français et exclusion des pages sommaires.
- Filtre dans la modal : tous les contenus, guides ou outils.
- Embed Discord avec titre, extrait, catégorie, miniature éventuelle et lien direct.
- Bouton **Nouvelle recherche** pour relancer une recherche sans créer un nouveau message.
- Message de bienvenue configurable pour les nouveaux membres.
- Script de diagnostic Pagefind pour lister les pages indexées.

## Prérequis

- [Node.js](https://nodejs.org/) 18 ou plus récent.
- Une application Discord et son bot.
- Les permissions Discord nécessaires pour envoyer des messages, embeds et composants dans le salon ciblé.

## Installation

```bash
git clone https://github.com/VOTRE_UTILISATEUR/dorthos-secrets-bot.git
cd dorthos-secrets-bot
npm install
npx playwright install chromium
```

Copiez ensuite la configuration d’exemple :

```bash
copy config\examples\config.example.json config\config.json
```

Sous macOS ou Linux :

```bash
cp config/examples/config.example.json config/config.json
```

## Configuration

### `config/config.json`

Remplacez les valeurs suivantes :

```json
{
  "clientID": "APPLICATION_ID",
  "serverID": "SERVER_ID"
}
```

- `clientID` : identifiant de l’application Discord.
- `serverID` : identifiant du serveur Discord, utilisé lorsque `DEV_MODE=true`.

### `.env`

Créez un fichier `.env` à la racine du projet :

```dotenv
TOKEN=VOTRE_TOKEN_DISCORD
DEV_MODE=true
SITE_URL=https://dorthos-secrets.fr/
WELCOME_CHANNEL_ID=
```

- `TOKEN` : token du bot Discord. Ne le partagez jamais et ne le versionnez pas.
- `DEV_MODE=true` : enregistre la commande instantanément sur `serverID`.
- `DEV_MODE=false` : enregistre la commande globalement ; Discord peut prendre jusqu’à une heure pour propager la modification.
- `SITE_URL` : URL du site Dorthos Secrets et de son index Pagefind.
- `WELCOME_CHANNEL_ID` : identifiant optionnel du salon de bienvenue. Sans valeur, le bot utilise le salon système du serveur s’il est configuré.

> Activez aussi l’intent **Server Members Intent** dans le portail développeur Discord : il est nécessaire au message de bienvenue (`guildMemberAdd`).

## Démarrer le bot

```bash
npm run dev
```

Le bot enregistre les commandes puis se connecte à Discord. Utilisez ensuite :

```text
/recherche terme:cristaux pve
```

Le bouton **Nouvelle recherche** ouvre un formulaire incluant le terme et le filtre de catégorie.

## Structure du projet

```text
src/
├── bot.js                         # initialisation du client Discord
├── commands/
│   └── recherche.js               # commande /recherche
├── components/
│   ├── btn-recherche-nouvelle.js  # ouverture du modal
│   └── modal-recherche.js         # recherche via formulaire + filtre
├── events/
│   ├── ready.js                   # confirmation de connexion
│   ├── interactionCreate.js       # routage des interactions
│   └── guildMemberAdd.js          # message de bienvenue
└── functions/
    ├── handlers/                  # chargeurs automatiques
    └── utils/Logger.js            # logs console

search/
├── browser.js                     # navigateur Playwright partagé
├── pagefind.js                    # recherche et filtrage Pagefind
└── resultMessage.js               # construction des embeds Discord

config/
└── examples/config.example.json   # modèle de configuration
```

## Diagnostic de l’index

Pour afficher les pages indexées par Pagefind :

```bash
node list-indexed-pages.mjs
```

Le script utilise un terme sonde (`Gear Progression`). Modifiez `PROBE_TERM` dans le fichier si ce terme n’est plus présent sur toutes les pages du site.

## Dépannage

- **La commande n’apparaît pas** : vérifiez `clientID`, `serverID`, `TOKEN` et `DEV_MODE`. En mode global, attendez la propagation Discord.
- **La recherche échoue** : vérifiez `SITE_URL`, la disponibilité du site et l’installation de Chromium par Playwright.
- **Le message de bienvenue ne part pas** : activez l’intent membres dans le portail Discord, renseignez un salon valide ou configurez un salon système.

## Licence

Ce projet est déclaré sous licence MIT dans `package.json`.
