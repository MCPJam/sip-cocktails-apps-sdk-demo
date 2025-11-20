export type MeasurementUnit = "ml" | "oz" | "part";

type IngredientAsset = {
  id: string;
  name: string;
  subName?: string;
  imagePath: string;
};

type IngredientMeasurements = Record<MeasurementUnit, number>;

export type CocktailIngredient = {
  ingredient: IngredientAsset;
  measurements: IngredientMeasurements;
  displayOverrides?: Partial<Record<MeasurementUnit, string>>;
  note?: string;
  optional?: boolean;
};

export type CocktailSummary = {
  id: string;
  name: string;
  tagline: string;
  subName?: string;
  imagePath: string;
};

export type Cocktail = CocktailSummary & {
  description: string;
  instructions: string;
  hashtags: string[];
  ingredients: CocktailIngredient[];
  nutrition: {
    abv: number;
    sugar: number;
    volume: number;
    calories: number;
  };
  garnish?: string;
  playlistUrl?: string;
  author?: string;
};

const ingredients: Record<string, IngredientAsset> = {
  silver_tequila: {
    id: "silver_tequila",
    name: "Silver Tequila",
    subName: "Blanco",
    imagePath: "https://www.mcpjam.com/silver_tequila.png",
  },
  triple_sec: {
    id: "triple_sec",
    name: "Triple Sec",
    subName: "Cointreau",
    imagePath: "https://www.mcpjam.com/triple_sec.png",
  },
  lime_juice: {
    id: "lime_juice",
    name: "Fresh Lime Juice",
    subName: "Yalica's favorite",
    imagePath: "https://www.mcpjam.com/lime_juice.png",
  },
  bourbon_whiskey: {
    id: "bourbon_whiskey",
    name: "Bourbon Whiskey",
    subName: "Kentucky straight",
    imagePath: "https://www.mcpjam.com/bourbon_whiskey.png",
  },
  aromatic_bitters: {
    id: "aromatic_bitters",
    name: "Aromatic Bitters",
    subName: "Angostura",
    imagePath: "https://www.mcpjam.com/aromatic_bitters.png",
  },
  simple_syrup: {
    id: "simple_syrup",
    name: "Simple Syrup",
    subName: "1:1 cane sugar",
    imagePath: "https://www.mcpjam.com/simple_syrup.png",
  },
  maraschino_cherries: {
    id: "maraschino_cherries",
    name: "Maraschino Cherry",
    subName: "Luxardo",
    imagePath: "https://www.mcpjam.com/maraschino_cherries.png",
  },
};

const cocktails: Cocktail[] = [
  {
    id: "margarita",
    name: "Margarita",
    tagline: "Classic Cocktail",
    subName: "Citrus + agave",
    imagePath: "https://www.mcpjam.com/margarita.png",
    description:
      "The Margarita is a beloved classic cocktail that perfectly blends the bold flavor of tequila with the tartness of lime juice and the sweetness of triple sec. Served in a glass with a salted rim, this refreshing drink is both tangy and invigorating, offering a balanced mix of flavors that make it one of the most popular cocktails worldwide. It's the perfect choice for a summer gathering, a night out, or whenever you crave a taste of Mexico.",
    instructions:
      "Rim a glass with salt by rubbing a lime wedge around the rim and dipping it into salt. In a cocktail shaker, combine tequila, triple sec, and freshly squeezed lime juice with ice. Shake well and strain into the prepared glass over ice. Garnish with a lime wheel.",
    hashtags: ["classic", "tequila", "lime"],
    ingredients: [
      {
        ingredient: ingredients.silver_tequila,
        measurements: {
          ml: 60,
          oz: 2,
          part: 2,
        },
        note: "Reposado also works if you want a rounder finish.",
      },
      {
        ingredient: ingredients.triple_sec,
        measurements: {
          ml: 30,
          oz: 1,
          part: 1,
        },
      },
      {
        ingredient: ingredients.lime_juice,
        measurements: {
          ml: 30,
          oz: 1,
          part: 1,
        },
      },
    ],
    nutrition: {
      abv: 15,
      sugar: 10,
      volume: 120,
      calories: 200,
    },
    garnish: "Salt rim + lime wheel",
    playlistUrl: "https://open.spotify.com/playlist/5U6pRg2pyDJGsGkyGumy7i",
  },
  {
    id: "old_fashioned",
    name: "Old Fashioned",
    tagline: "Classic Whiskey Cocktail",
    subName: "Spirit-forward & silky",
    imagePath: "https://www.mcpjam.com/old_fashioned.png",
    description:
      "The Old Fashioned is one of the oldest and most iconic whiskey cocktails, known for its simplicity and bold flavor. Made with whiskey, a sugar cube, Angostura bitters, and garnished with an orange twist, this classic drink offers a perfect balance of sweetness, bitterness, and the warm, rich character of the whiskey. It’s a timeless choice for those who appreciate the art of a well-crafted cocktail.",
    instructions:
      "Place a sugar cube in an Old Fashioned glass and add a few dashes of Angostura bitters. Muddle until the sugar dissolves. Add a large ice cube, pour in the whiskey, and stir until well-chilled. Garnish with an orange twist and a maraschino cherry if desired.",
    hashtags: ["classic", "whiskey", "bitters"],
    ingredients: [
      {
        ingredient: ingredients.bourbon_whiskey,
        measurements: {
          ml: 60,
          oz: 2,
          part: 2,
        },
      },
      {
        ingredient: ingredients.aromatic_bitters,
        measurements: {
          ml: 7.5,
          oz: 0.25,
          part: 0.25,
        },
        displayOverrides: {
          ml: "2 dashes",
          oz: "2 dashes",
        },
      },
      {
        ingredient: ingredients.simple_syrup,
        measurements: {
          ml: 7.5,
          oz: 0.25,
          part: 0.25,
        },
      },
      {
        ingredient: ingredients.maraschino_cherries,
        measurements: {
          ml: 0,
          oz: 0,
          part: 1,
        },
        displayOverrides: {
          ml: "1 cherry",
          oz: "1 cherry",
        },
        note: "Use as a garnish if you like a touch of sweetness.",
        optional: true,
      },
    ],
    nutrition: {
      abv: 32,
      sugar: 5,
      volume: 90,
      calories: 150,
    },
    garnish: "Large orange twist",
    playlistUrl: "https://open.spotify.com/playlist/1DaQ7EeUAIXGgWHXQl5dUV",
  },
];

const normalize = (value: string) => value.trim().toLowerCase().replace(/[\s-]+/g, "_");

export const listCocktails = (): CocktailSummary[] =>
  cocktails.map(({ id, name, tagline, imagePath, subName }) => ({
    id,
    name,
    tagline,
    subName,
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
