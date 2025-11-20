export type CocktailStat = {
  label: string;
  value: string;
};

export type CocktailIngredient = {
  name: string;
  amount: string;
  note?: string;
  optional?: boolean;
};

export type CocktailSummary = {
  id: string;
  name: string;
  tagline: string;
  imagePath: string;
};

export type Cocktail = CocktailSummary & {
  description: string;
  instructions: string;
  stats: CocktailStat[];
  hashtags: string[];
  ingredients: CocktailIngredient[];
  garnish?: string;
  playlistUrl?: string;
};

const cocktails: Cocktail[] = [
  {
    id: "margarita",
    name: "Margarita",
    tagline: "Classic Cocktail",
    imagePath: "https://www.mcpjam.com/margarita.png",
    description:
      "The Margarita is a beloved classic cocktail that perfectly blends the bold flavor of tequila with the tartness of lime juice and the sweetness of triple sec. Served in a glass with a salted rim, this refreshing drink is both tangy and invigorating, offering a balanced mix of flavors that make it one of the most popular cocktails worldwide. It's the perfect choice for a summer gathering, a night out, or whenever you crave a taste of Mexico.",
    instructions:
      "Rim a glass with salt by rubbing a lime wedge around the rim and dipping it into salt. In a cocktail shaker, combine tequila, triple sec, and freshly squeezed lime juice with ice. Shake well and strain into the prepared glass over ice. Garnish with a lime wheel.",
    stats: [
      { label: "ABV", value: "15%" },
      { label: "Sugar", value: "10 g" },
      { label: "Volume", value: "120 ml" },
      { label: "Calories", value: "200 kcal" },
    ],
    hashtags: ["classic", "tequila", "lime"],
    ingredients: [
      {
        name: "Silver tequila",
        amount: "2 oz (60 ml)",
        note: "Reposado works too if you want a rounder finish",
      },
      {
        name: "Triple sec",
        amount: "1 oz (30 ml)",
      },
      {
        name: "Fresh lime juice",
        amount: "1 oz (30 ml)",
      },
    ],
    garnish: "Salt rim + lime wheel",
    playlistUrl: "https://open.spotify.com/playlist/5U6pRg2pyDJGsGkyGumy7i",
  },
  {
    id: "old_fashioned",
    name: "Old Fashioned",
    tagline: "Classic Whiskey Cocktail",
    imagePath: "https://www.mcpjam.com/old_fashioned.png",
    description:
      "The Old Fashioned is one of the oldest and most iconic whiskey cocktails, known for its simplicity and bold flavor. Made with whiskey, a sugar cube, Angostura bitters, and garnished with an orange twist, this classic drink offers a perfect balance of sweetness, bitterness, and the warm, rich character of the whiskey. It’s a timeless choice for those who appreciate the art of a well-crafted cocktail.",
    instructions:
      "Place a sugar cube in an Old Fashioned glass and add a few dashes of Angostura bitters. Muddle until the sugar dissolves. Add a large ice cube, pour in the whiskey, and stir until well-chilled. Garnish with an orange twist and a maraschino cherry if desired.",
    stats: [
      { label: "ABV", value: "32%" },
      { label: "Sugar", value: "5 g" },
      { label: "Volume", value: "90 ml" },
      { label: "Calories", value: "150 kcal" },
    ],
    hashtags: ["classic", "whiskey", "bitters"],
    ingredients: [
      {
        name: "Bourbon whiskey",
        amount: "2 oz (60 ml)",
      },
      {
        name: "Aromatic bitters",
        amount: "2 dashes",
      },
      {
        name: "Simple syrup",
        amount: "0.25 oz (7.5 ml)",
      },
      {
        name: "Maraschino cherry",
        amount: "1",
        optional: true,
        note: "Use as a garnish if you like a touch of sweetness",
      },
    ],
    garnish: "Large orange twist",
    playlistUrl: "https://open.spotify.com/playlist/1DaQ7EeUAIXGgWHXQl5dUV",
  },
];

const normalize = (value: string) => value.trim().toLowerCase().replace(/[\s-]+/g, "_");

export const listCocktails = (): CocktailSummary[] =>
  cocktails.map(({ id, name, tagline, imagePath }) => ({
    id,
    name,
    tagline,
    imagePath,
  }));

export const getCocktail = (name?: string): Cocktail => {
  if (!name) {
    return cocktails[0]!;
  }

  const normalized = normalize(name);

  const cocktail =
    cocktails.find((entry) => normalize(entry.id) === normalized) ??
    cocktails.find((entry) => normalize(entry.name) === normalized);

  if (!cocktail) {
    throw new Error(`Cocktail ${name} is not in the curated menu yet.`);
  }

  return cocktail;
};
