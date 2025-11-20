import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/shadcn-io/spinner";
import "@/index.css";
import { cn, useWidgetState } from "@/utils";
import {
  BookmarkIcon,
  ChevronLeftIcon,
  ExternalLinkIcon,
  Maximize2Icon,
  Minimize2Icon,
  PenLineIcon,
  StarIcon,
} from "lucide-react";
import { useCallback, useEffect } from "react";
import { mountWidget, useCallTool, useOpenAiGlobal, useToolOutput, type CallToolResponse } from "skybridge/web";

type MeasurementUnit = "ml" | "oz" | "part";

type IngredientAsset = {
  id: string;
  name: string;
  subName?: string;
  imagePath: string;
};

type CocktailIngredient = {
  ingredient: IngredientAsset;
  measurements: Record<MeasurementUnit, number>;
  displayOverrides?: Partial<Record<MeasurementUnit, string>>;
  note?: string;
  optional?: boolean;
};

type CocktailSummary = {
  id: string;
  name: string;
  tagline: string;
  subName?: string;
  imagePath: string;
};

type Cocktail = CocktailSummary & {
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

type CocktailToolData = {
  cocktail: Cocktail;
  availableCocktails: CocktailSummary[];
};

type WidgetState = {
  currentCocktail: Cocktail | null;
  availableCocktails: CocktailSummary[];
  selectedMeasurementKey: MeasurementUnit;
  selectedServingIndex: number;
  userNote: string;
  isBookmarked: boolean;
  rating: number;
};

const MEASUREMENT_STORAGE_KEY = "sip-cocktails-measurement";

const measurementOptions: { label: string; key: MeasurementUnit }[] = [
  { label: "ML", key: "ml" },
  { label: "OZ", key: "oz" },
  { label: "PART", key: "part" },
];

const servingOptions = [
  { label: "1/2", multiplier: 0.5 },
  { label: "1", multiplier: 1 },
  { label: "2", multiplier: 2 },
  { label: "3", multiplier: 3 },
] as const;

const getServingMultiplier = (index: number) => servingOptions[index]?.multiplier ?? 1;

const formatNumber = (value: number) => {
  if (Number.isInteger(value)) {
    return value.toString();
  }

  const fixed = value < 1 ? value.toFixed(2) : value.toFixed(1);
  return fixed.replace(/\.?0+$/, "");
};

const formatMeasurement = (ingredient: CocktailIngredient, unit: MeasurementUnit, servings: number) => {
  const override = ingredient.displayOverrides?.[unit];
  if (override) {
    return override;
  }

  const baseValue = ingredient.measurements[unit];
  if (!baseValue) {
    return "Dash";
  }

  const scaled = baseValue * servings;
  if (unit === "part") {
    return `${formatNumber(scaled)} part${scaled !== 1 ? "s" : ""}`;
  }

  const suffix = unit === "oz" ? "oz" : "ml";
  return `${formatNumber(scaled)} ${suffix}`;
};

type SegmentedControlProps<T extends string> = {
  options: { label: string; value: T }[];
  selected: T;
  onChange: (value: T) => void;
};

const SegmentedControl = <T extends string>({ options, selected, onChange }: SegmentedControlProps<T>) => {
  return (
    <div className="inline-flex rounded-full bg-gradient-to-br from-gray-100 to-gray-200 p-1.5 shadow-inner">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={cn(
            "min-w-[52px] rounded-full px-4 py-2 text-sm font-bold transition-all",
            selected === option.value
              ? "bg-white text-[#1e1e1e] shadow-lg ring-2 ring-[#1e1e1e]/10"
              : "text-[#5d6e9e] hover:text-[#1e1e1e]",
          )}
          onClick={() => {
            onChange(option.value);
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

type SegmentedIndexControlProps = {
  options: { label: string }[];
  selectedIndex: number;
  onChange: (index: number) => void;
};

const SegmentedIndexControl = ({ options, selectedIndex, onChange }: SegmentedIndexControlProps) => {
  return (
    <div className="inline-flex rounded-full bg-gradient-to-br from-gray-100 to-gray-200 p-1.5 shadow-inner">
      {options.map((option, index) => (
        <button
          key={option.label}
          type="button"
          className={cn(
            "min-w-[52px] rounded-full px-4 py-2 text-sm font-bold transition-all",
            selectedIndex === index
              ? "bg-white text-[#1e1e1e] shadow-lg ring-2 ring-[#1e1e1e]/10"
              : "text-[#5d6e9e] hover:text-[#1e1e1e]",
          )}
          onClick={() => {
            onChange(index);
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

type IngredientCardProps = {
  ingredient: CocktailIngredient;
  measurementKey: MeasurementUnit;
  servings: number;
};

const IngredientCard = ({ ingredient, measurementKey, servings }: IngredientCardProps) => {
  return (
    <li className="group flex gap-4 rounded-3xl bg-gradient-to-br from-white to-gray-50/50 p-5 shadow-sm ring-1 ring-black/5 transition-all hover:shadow-lg hover:ring-black/10">
      <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 transition-transform group-hover:scale-105">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-pink-100/30 via-purple-100/30 to-blue-100/30 opacity-0 transition-opacity group-hover:opacity-100" />
        <img
          src={ingredient.ingredient.imagePath}
          alt={ingredient.ingredient.name}
          className="relative h-16 w-16 object-contain drop-shadow-md"
          loading="lazy"
        />
      </div>
      <div className="flex flex-1 flex-col justify-center gap-1">
        <p className="text-xs font-bold uppercase text-[#5d6e9e]">{formatMeasurement(ingredient, measurementKey, servings)}</p>
        <p className="text-lg font-bold text-[#1e1e1e]">
          {ingredient.ingredient.name}
          {ingredient.optional ? <span className="ml-2 text-sm font-normal text-[#5d6e9e]">(optional)</span> : ""}
        </p>
        {ingredient.ingredient.subName ? (
          <p className="text-sm font-medium text-[#5d6e9e]">{ingredient.ingredient.subName}</p>
        ) : null}
        {ingredient.note ? <p className="text-xs italic text-[#4a4a4a]">{ingredient.note}</p> : null}
      </div>
    </li>
  );
};

const NotesCard = ({
  note,
  onChange,
  isDark,
}: {
  note: string;
  onChange: (value: string) => void;
  isDark: boolean;
}) => {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-3xl p-4 shadow-sm ring-1 ring-black/5",
        isDark ? "bg-[#333333]" : "bg-[#f5f5f5]",
      )}
    >
      <textarea
        className={cn(
          "min-h-[80px] w-full resize-none border-none bg-transparent text-base outline-none",
          isDark ? "text-white placeholder:text-white/70" : "text-[#1e1e1e] placeholder:text-[#4a4a4a]",
        )}
        value={note}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        placeholder="Tap to add note."
      />
      <PenLineIcon className={cn("h-5 w-5", isDark ? "text-[#a9abc4]" : "text-[#5d6e9e]")} />
    </div>
  );
};

const NutritionGrid = ({ cocktail }: { cocktail: Cocktail }) => {
  const items = [
    { label: "ABV", value: `${cocktail.nutrition.abv}%`, unit: "" },
    { label: "Sugar", value: `${cocktail.nutrition.sugar}`, unit: "g" },
    { label: "Volume", value: `${cocktail.nutrition.volume}`, unit: "ml" },
    { label: "Calories", value: `${cocktail.nutrition.calories}`, unit: "cal" },
  ];

  return (
    <div className="my-8 grid grid-cols-2 gap-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl bg-white/10 p-4 text-center backdrop-blur-sm">
          <p className="text-xs font-bold uppercase text-white/60">{item.label}</p>
          <p className="mt-2 text-2xl font-bold text-white">{item.value}<span className="text-sm text-white/80">{item.unit}</span></p>
        </div>
      ))}
    </div>
  );
};

function CocktailWidget() {
  const toolOutput = useToolOutput() as CocktailToolData | null;
  const displayMode = useOpenAiGlobal("displayMode");
  const isFullscreen = displayMode === "fullscreen";
  const toggleDisplayMode = useCallback(() => {
    window.openai?.requestDisplayMode({ mode: isFullscreen ? "inline" : "fullscreen" });
  }, [isFullscreen]);

  const [{ currentCocktail, availableCocktails, selectedMeasurementKey, selectedServingIndex, userNote, isBookmarked, rating }, setWidgetState] =
    useWidgetState<WidgetState>({
      currentCocktail: toolOutput?.cocktail ?? null,
      availableCocktails: toolOutput?.availableCocktails ?? [],
      selectedMeasurementKey: "ml",
      selectedServingIndex: 1,
      userNote: "",
      isBookmarked: false,
      rating: 0,
    });

  useEffect(() => {
    if (!toolOutput) {
      return;
    }

    setWidgetState((previous) => ({
      ...previous,
      currentCocktail: toolOutput.cocktail,
      availableCocktails: toolOutput.availableCocktails,
    }));
  }, [toolOutput, setWidgetState]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const storedValue = window.localStorage.getItem(MEASUREMENT_STORAGE_KEY) as MeasurementUnit | null;
    if (storedValue && measurementOptions.some((option) => option.key === storedValue)) {
      setWidgetState((previous) => ({
        ...previous,
        selectedMeasurementKey: storedValue,
      }));
    }
  }, [setWidgetState]);

  const { callTool, isPending } = useCallTool<{ name?: string }, CallToolResponse & { structuredContent: CocktailToolData }>(
    "cocktail",
  );

  const handleSelectCocktail = (cocktailId: string) => {
    if (cocktailId === currentCocktail?.id) {
      return;
    }

    callTool(
      { name: cocktailId },
      {
        onSuccess: (response) => {
          setWidgetState((previous) => ({
            ...previous,
            currentCocktail: response.structuredContent.cocktail,
            availableCocktails: response.structuredContent.availableCocktails,
          }));
        },
      },
    );
  };

  const handleMeasurementChange = (unit: MeasurementUnit) => {
    setWidgetState((previous) => ({
      ...previous,
      selectedMeasurementKey: unit,
    }));
    if (typeof window !== "undefined") {
      window.localStorage.setItem(MEASUREMENT_STORAGE_KEY, unit);
    }
  };

  const handleServingChange = (index: number) => {
    setWidgetState((previous) => ({
      ...previous,
      selectedServingIndex: index,
    }));
  };

  const handleNoteChange = (note: string) => {
    setWidgetState((previous) => ({
      ...previous,
      userNote: note,
    }));
  };

  const toggleBookmark = () => {
    setWidgetState((previous) => ({
      ...previous,
      isBookmarked: !previous.isBookmarked,
    }));
  };

  const toggleRating = () => {
    setWidgetState((previous) => ({
      ...previous,
      rating: previous.rating === 0 ? 1 : 0,
    }));
  };

  if (!currentCocktail) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const servings = getServingMultiplier(selectedServingIndex);
  const requiredIngredients = currentCocktail.ingredients.filter((ingredient) => !ingredient.optional).length;

  return (
    <div className="relative w-full rounded-[40px] bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 p-[2px] shadow-2xl">
      <div className="rounded-[40px] bg-white px-8 py-10 lg:px-12">
        {isPending ? (
          <div className="absolute inset-0 z-20 rounded-[40px] bg-white/80 backdrop-blur-md">
            <div className="flex h-full items-center justify-center">
              <Spinner />
            </div>
          </div>
        ) : null}
        <header className="flex flex-col gap-6 pb-8">
          <div className="flex items-center justify-between text-[#5d6e9e]">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full border border-[#e5e5e5] transition-all hover:scale-105 hover:border-[#5d6e9e] hover:bg-[#5d6e9e]/5"
              onClick={toggleDisplayMode}
            >
              {isFullscreen ? <Minimize2Icon className="h-4 w-4" /> : <Maximize2Icon className="h-4 w-4" />}
            </Button>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-pink-200/40 via-purple-200/40 to-blue-200/40 blur-3xl" />
              <img
                src={currentCocktail.imagePath}
                alt={currentCocktail.name}
                className="relative h-72 w-72 object-contain drop-shadow-2xl transition-transform hover:scale-105"
                loading="lazy"
              />
            </div>
            <h1 className="text-5xl font-bold tracking-tight text-[#1e1e1e]">{currentCocktail.name}</h1>
            {currentCocktail.subName ? <p className="mt-2 text-lg text-[#5d6e9e]">{currentCocktail.subName}</p> : null}
            <p className="mt-3 text-xs font-semibold uppercase text-[#5d6e9e]">{currentCocktail.tagline}</p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#f0f0f0] pb-6">
            <Button
              type="button"
              variant="ghost"
              className="gap-2 rounded-full px-5 py-2.5 text-[#5d6e9e] transition-all hover:scale-105 hover:bg-[#5d6e9e]/10"
              onClick={() => {
                window.open("https://www.sipcocktails.com/create", "_blank", "noopener,noreferrer");
              }}
            >
              <PenLineIcon className="h-4 w-4" />
              Edit Recipe
            </Button>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  "rounded-full border border-[#e5e5e5] transition-all hover:scale-110",
                  isBookmarked ? "bg-[#5d6e9e]/15 text-[#5d6e9e] shadow-md" : "text-[#5d6e9e] hover:bg-[#5d6e9e]/5",
                )}
                onClick={toggleBookmark}
              >
                <BookmarkIcon className="h-4 w-4" fill={isBookmarked ? "#5d6e9e" : "transparent"} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  "rounded-full border border-[#e5e5e5] transition-all hover:scale-110",
                  rating > 0 ? "bg-[#ffd166]/15 text-[#ffb703] shadow-md" : "text-[#5d6e9e] hover:bg-[#ffd166]/10",
                )}
                onClick={toggleRating}
              >
                <StarIcon className="h-4 w-4" fill={rating > 0 ? "#ffb703" : "transparent"} />
              </Button>
            </div>
          </div>
        </header>

        <div className="rounded-2xl bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4">
          <p className="text-base leading-relaxed text-[#1e1e1e]">{currentCocktail.instructions}</p>
        </div>

        <div className="mt-6 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500/10">
            <span className="text-xl">✓</span>
          </div>
          <p className="text-sm font-semibold text-[#006911]">
            You have all ingredients for this cocktail. ({requiredIngredients} required)
          </p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <div className="space-y-8">
            <div className="rounded-3xl bg-gradient-to-br from-white to-gray-50/50 p-8 shadow-lg ring-1 ring-black/5">
              <div className="mb-8 flex flex-wrap items-center justify-center gap-8">
                <div className="flex flex-col items-center gap-3">
                  <p className="text-xs font-bold uppercase text-[#5d6e9e]">Servings</p>
                  <SegmentedIndexControl
                    options={servingOptions.map((option) => ({ label: option.label }))}
                    selectedIndex={selectedServingIndex}
                    onChange={handleServingChange}
                  />
                </div>
                <div className="flex flex-col items-center gap-3">
                  <p className="text-xs font-bold uppercase text-[#5d6e9e]">Measure</p>
                  <SegmentedControl
                    options={measurementOptions.map((option) => ({ label: option.label, value: option.key }))}
                    selected={selectedMeasurementKey}
                    onChange={handleMeasurementChange}
                  />
                </div>
              </div>
              <ul className="space-y-4">
                {currentCocktail.ingredients.map((ingredient) => (
                  <IngredientCard
                    key={ingredient.ingredient.id}
                    ingredient={ingredient}
                    measurementKey={selectedMeasurementKey}
                    servings={servings}
                  />
                ))}
              </ul>
            </div>

            <div className="rounded-3xl bg-gradient-to-br from-white to-gray-50/50 p-8 shadow-lg ring-1 ring-black/5">
              <h2 className="text-2xl font-bold text-[#1e1e1e]">Notes</h2>
              <p className="mt-2 pb-4 text-sm text-[#5d6e9e]">Keep track of your tweaks just like the mobile app.</p>
              <NotesCard note={userNote} onChange={handleNoteChange} isDark={false} />
            </div>
          </div>

          <div className="space-y-8">
            <div className="rounded-3xl bg-gradient-to-br from-[#404040] to-[#525252] p-8 text-white shadow-2xl">
              <p className="text-xs font-bold uppercase text-white/60">About</p>
              <p className="mt-4 text-lg leading-relaxed text-white/95">{currentCocktail.description}</p>
              {currentCocktail.garnish ? (
                <div className="mt-6 rounded-2xl bg-white/10 px-4 py-3">
                  <p className="text-xs font-bold uppercase text-white/70">
                    Garnish
                  </p>
                  <p className="mt-1 text-base font-semibold text-white">{currentCocktail.garnish}</p>
                </div>
              ) : null}
              <NutritionGrid cocktail={currentCocktail} />
              <div className="mt-6 flex flex-wrap gap-2">
                {currentCocktail.hashtags.map((tag) => (
                  <span key={tag} className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase text-white/95 backdrop-blur-sm transition-all hover:bg-white/20">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-gradient-to-br from-[#0f5f30] to-[#0c4b26] p-8 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Spotify_logo_without_text.svg/1024px-Spotify_logo_without_text.svg.png" alt="Spotify" className="h-6 w-6" loading="lazy" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white">Music Pairing</h2>
                  <p className="text-sm text-white/90">Pair with the SIP playlist</p>
                </div>
              </div>
              {currentCocktail.playlistUrl ? (
                <Button asChild className="mt-6 w-full rounded-full bg-white py-6 text-base font-bold text-[#0f5f30] shadow-lg transition-all hover:scale-105 hover:bg-white/95">
                  <a href={currentCocktail.playlistUrl} target="_blank" rel="noreferrer">
                    Open Spotify
                    <ExternalLinkIcon className="ml-2 h-5 w-5" />
                  </a>
                </Button>
              ) : null}
            </div>

            {currentCocktail.author ? (
              <div className="rounded-3xl bg-gradient-to-br from-white to-gray-50/50 p-6 shadow-lg ring-1 ring-black/5">
                <p className="text-xs font-bold uppercase text-[#5d6e9e]">Recipe Source</p>
                <p className="mt-2 text-base font-semibold text-[#1e1e1e]">{currentCocktail.author}</p>
              </div>
            ) : null}
          </div>
        </div>
        <div className="mt-10 rounded-3xl bg-gradient-to-br from-white to-gray-50/50 p-8 shadow-lg ring-1 ring-black/5">
          <p className="text-xs font-bold uppercase text-[#5d6e9e]">More Cocktails</p>
          <div className="mt-6 flex flex-wrap gap-3">
            {availableCocktails.map((cocktail) => (
              <Button
                key={cocktail.id}
                variant={cocktail.id === currentCocktail.id ? "default" : "secondary"}
                size="sm"
                disabled={cocktail.id === currentCocktail.id || isPending}
                className={cn(
                  "rounded-full border-2 px-6 py-3 font-semibold transition-all",
                  cocktail.id === currentCocktail.id
                    ? "border-[#1e1e1e] bg-[#1e1e1e] text-white shadow-lg hover:bg-black"
                    : "border-neutral-200 bg-white text-[#1e1e1e] hover:scale-105 hover:border-[#5d6e9e] hover:bg-[#5d6e9e]/5",
                )}
                onClick={() => {
                  handleSelectCocktail(cocktail.id);
                }}
              >
                {cocktail.name}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CocktailWidget;

mountWidget(<CocktailWidget />);
