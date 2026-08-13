## 7. Afficher les tags et filtrer par catégorie

Chaque résultat de `.data()` inclut maintenant un champ `filters` (`{ tag: ["STUFF", "OPTIMISATION"] }`), grâce aux `data-pagefind-filter="tag"` posés côté site. Deux ajouts possibles.

### 7.1 Afficher les tags dans la réponse

`search/pagefind.js` :

```js
export async function searchSite(query, { limit = 5, tag } = {}) {
  const page = await getSearchPage();

  const results = await page.evaluate(
    async ({ query, limit, tag }) => {
      const pagefind = await import("/pagefind/pagefind.js");
      const search = await pagefind.search(query, tag ? { filters: { tag } } : undefined);
      const top = search.results.slice(0, limit);
      return Promise.all(top.map((r) => r.data()));
    },
    { query, limit, tag }
  );

  return results.map((r) => ({
    title: r.meta?.title ?? "Sans titre",
    url: SITE_URL + r.url,
    excerpt: r.excerpt?.replace(/<\/?mark>/g, "**"),
    image: r.meta?.image ? SITE_URL + r.meta.image : null,
    tags: r.filters?.tag ?? [],
  }));
}
```

Dans l'embed :

```js
embed.addFields({
  name: r.title,
  value: `${r.tags.map((t) => `\`${t}\``).join(" ")}\n${r.excerpt}\n[Voir la page](${r.url})`,
});
```

### 7.2 Filtrer par catégorie

Ajouter une option à la commande slash, avec des choix statiques (les 4 tags changent rarement, pas besoin d'aller les chercher dynamiquement via `pagefind.filters()` à chaque appel) :

```js
export const data = new SlashCommandBuilder()
  .setName("recherche")
  .setDescription("Recherche dans les guides Dorthos Secrets")
  .addStringOption((opt) =>
    opt.setName("terme").setDescription("Ce que tu cherches").setRequired(true)
  )
  .addStringOption((opt) =>
    opt
      .setName("categorie")
      .setDescription("Filtrer par catégorie")
      .addChoices(
        { name: "⚔️ Stuff", value: "STUFF" },
        { name: "💰 Argent", value: "ARGENT" },
        { name: "⚙️ Optimisation", value: "OPTIMISATION" },
        { name: "🔨 Métier", value: "METIER" }
      )
  );

export async function execute(interaction) {
  const query = interaction.options.getString("terme");
  const tag = interaction.options.getString("categorie") ?? undefined;
  await interaction.deferReply();

  const results = await searchSite(query, { tag });
  // ... reste inchangé
}
```

Pour parcourir une catégorie sans mot-clé (ex: lister tous les guides "STUFF"), Pagefind accepte un terme `null` — même fonction `searchSite`, juste `query = null`.