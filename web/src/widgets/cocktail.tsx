import { Spinner } from "@/components/ui/shadcn-io/spinner";
import "@/index.css";
import { cn, useWidgetState } from "@/utils";
import {
  BookmarkIcon,
  Maximize2Icon,
  Minimize2Icon,
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
    <div className="inline-flex gap-1 rounded-full bg-gray-100 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
            selected === option.value
              ? "bg-white text-black shadow-sm"
              : "text-gray-600 hover:text-black",
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
    <div className="inline-flex gap-1 rounded-full bg-gray-100 p-1">
      {options.map((option, index) => (
        <button
          key={option.label}
          type="button"
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
            selectedIndex === index
              ? "bg-white text-black shadow-sm"
              : "text-gray-600 hover:text-black",
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
    <li className="flex items-center justify-between gap-4 py-1.5">
      <div className="flex items-center gap-4">
        <img
          src={ingredient.ingredient.imagePath}
          alt={ingredient.ingredient.name}
          className="h-16 w-16 object-contain"
          loading="lazy"
        />
        <p className="text-base font-medium text-black">
          {ingredient.ingredient.name}
          {ingredient.optional ? <span className="ml-1 text-sm text-gray-500">(optional)</span> : ""}
        </p>
      </div>
      <p className="text-base text-gray-600">
        {formatMeasurement(ingredient, measurementKey, servings)}
      </p>
    </li>
  );
};

const NotesCard = ({
  note,
  onChange,
}: {
  note: string;
  onChange: (value: string) => void;
}) => {
  return (
    <textarea
      className="min-h-[60px] w-full resize-none border border-gray-200 bg-white p-2 text-sm outline-none focus:border-gray-400"
      value={note}
      onChange={(event) => {
        onChange(event.target.value);
      }}
      placeholder="Add notes..."
    />
  );
};

const NutritionGrid = ({ cocktail }: { cocktail: Cocktail }) => {
  return (
    <div className="flex gap-4 text-xs text-gray-600">
      <span>ABV: {cocktail.nutrition.abv}%</span>
      <span>Sugar: {cocktail.nutrition.sugar}g</span>
      <span>Vol: {cocktail.nutrition.volume}ml</span>
      <span>Cal: {cocktail.nutrition.calories}</span>
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

  const [{ currentCocktail, selectedMeasurementKey, selectedServingIndex, userNote, isBookmarked, rating }, setWidgetState] =
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

  const { isPending } = useCallTool<{ name?: string }, CallToolResponse & { structuredContent: CocktailToolData }>(
    "cocktail",
  );

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

  return (
    <div className="w-full bg-white px-18 py-8">
      {isPending ? (
        <div className="absolute inset-0 z-20 bg-white/80">
          <div className="flex h-full items-center justify-center">
            <Spinner />
          </div>
        </div>
      ) : null}
      <header className="mb-4">
        <div className="mb-3 flex items-center justify-between">
          <button
            className="text-sm text-gray-500 hover:text-black"
            onClick={toggleDisplayMode}
          >
            {isFullscreen ? <Minimize2Icon className="h-4 w-4" /> : <Maximize2Icon className="h-4 w-4" />}
          </button>
          <div className="flex items-center gap-2">
            <button
              className="text-gray-500 hover:text-black"
              onClick={toggleBookmark}
            >
              <BookmarkIcon className="h-4 w-4" fill={isBookmarked ? "black" : "transparent"} />
            </button>
            <button
              className="text-gray-500 hover:text-black"
              onClick={toggleRating}
            >
              <StarIcon className="h-4 w-4" fill={rating > 0 ? "black" : "transparent"} />
            </button>
          </div>
        </div>
        <div className="text-center">
          <img
            src={currentCocktail.imagePath}
            alt={currentCocktail.name}
            className="mx-auto h-40 w-40 object-contain"
            loading="lazy"
          />
          <h1 className="text-xl font-bold text-black">{currentCocktail.name}</h1>
          <p className="mt-0.5 text-xs text-gray-400">{currentCocktail.tagline}</p>
        </div>
      </header>

      <div className="mb-3">
        <p className="text-sm text-gray-700">{currentCocktail.instructions}</p>
      </div>

      <div className="mb-4">
        <div className="mb-2 flex justify-center gap-8 text-xs">
          <div className="flex flex-col items-center gap-2">
            <span className="text-gray-500">Servings</span>
            <SegmentedIndexControl
              options={servingOptions.map((option) => ({ label: option.label }))}
              selectedIndex={selectedServingIndex}
              onChange={handleServingChange}
            />
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-gray-500">Measure</span>
            <SegmentedControl
              options={measurementOptions.map((option) => ({ label: option.label, value: option.key }))}
              selected={selectedMeasurementKey}
              onChange={handleMeasurementChange}
            />
          </div>
        </div>
        <ul className="space-y-0">
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

      <div className="mb-3">
        <p className="mb-1 text-sm text-gray-700">{currentCocktail.description}</p>
        {currentCocktail.garnish ? (
          <p className="text-xs text-gray-500">Garnish: {currentCocktail.garnish}</p>
        ) : null}
      </div>

      <div className="mb-3">
        <NutritionGrid cocktail={currentCocktail} />
      </div>

      {currentCocktail.hashtags && currentCocktail.hashtags.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {currentCocktail.hashtags.map((tag) => (
            <span key={tag} className="text-xs text-gray-400">
              #{tag}
            </span>
          ))}
        </div>
      ) : null}

      {currentCocktail.author ? (
        <div className="mb-3">
          <p className="text-xs text-gray-500">Recipe by {currentCocktail.author}</p>
        </div>
      ) : null}

      <div>
        <p className="mb-1 text-xs text-gray-500">Notes</p>
        <NotesCard note={userNote} onChange={handleNoteChange} />
      </div>
    </div>
  );
}

export default CocktailWidget;

mountWidget(<CocktailWidget />);
