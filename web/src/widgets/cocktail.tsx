import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/shadcn-io/spinner";
import "@/index.css";
import { cn, useWidgetState } from "@/utils";
import { ExternalLinkIcon, Maximize2Icon, Minimize2Icon } from "lucide-react";
import { useCallback, useEffect } from "react";
import { mountWidget, useCallTool, useOpenAiGlobal, useToolOutput, type CallToolResponse } from "skybridge/web";

type CocktailIngredient = {
  name: string;
  amount: string;
  note?: string;
  optional?: boolean;
};

type CocktailStat = {
  label: string;
  value: string;
};

type CocktailSummary = {
  id: string;
  name: string;
  tagline: string;
  imagePath: string;
};

type Cocktail = CocktailSummary & {
  description: string;
  instructions: string;
  stats: CocktailStat[];
  hashtags: string[];
  ingredients: CocktailIngredient[];
  garnish?: string;
  playlistUrl?: string;
};

type CocktailToolData = {
  cocktail: Cocktail;
  availableCocktails: CocktailSummary[];
};


function CocktailWidget() {
  const toolOutput = useToolOutput() as CocktailToolData | null;
  const displayMode = useOpenAiGlobal("displayMode");
  const isFullscreen = displayMode === "fullscreen";
  const toggleDisplayMode = useCallback(() => {
    window.openai?.requestDisplayMode({ mode: isFullscreen ? "inline" : "fullscreen" });
  }, [isFullscreen]);

  const [{ currentCocktail, availableCocktails }, setWidgetState] = useWidgetState<{
    currentCocktail: Cocktail | null;
    availableCocktails: CocktailSummary[];
  }>({
    currentCocktail: toolOutput?.cocktail ?? null,
    availableCocktails: toolOutput?.availableCocktails ?? [],
  });

  useEffect(() => {
    if (!toolOutput) {
      return;
    }

    setWidgetState({
      currentCocktail: toolOutput.cocktail,
      availableCocktails: toolOutput.availableCocktails,
    });
  }, [toolOutput, setWidgetState]);

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
          setWidgetState({
            currentCocktail: response.structuredContent.cocktail,
            availableCocktails: response.structuredContent.availableCocktails,
          });
        },
      },
    );
  };

  if (!currentCocktail) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-3xl bg-gradient-to-br from-amber-50 via-rose-50 to-orange-100 p-[1px] shadow-2xl">
      <div className="rounded-[2rem] bg-white p-6 lg:p-8">
        {isPending ? (
          <div className="absolute inset-0 z-20 rounded-3xl bg-white/70 backdrop-blur-sm">
            <div className="flex h-full items-center justify-center">
              <Spinner />
            </div>
          </div>
        ) : null}
        <header className="flex flex-col gap-4 pb-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-500">Sip cocktail studio</p>
            <h1 className="text-3xl font-semibold text-neutral-900">{currentCocktail.name}</h1>
            <p className="text-sm text-neutral-500">{currentCocktail.tagline}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {currentCocktail.playlistUrl ? (
              <Button asChild variant="secondary" size="sm" className="rounded-full">
                <a href={currentCocktail.playlistUrl} target="_blank" rel="noreferrer">
                  Pairing playlist <ExternalLinkIcon className="ml-2 h-3.5 w-3.5" />
                </a>
              </Button>
            ) : null}
            <Button variant="ghost" size="icon" className="rounded-full border border-neutral-200" onClick={toggleDisplayMode}>
              {isFullscreen ? <Minimize2Icon /> : <Maximize2Icon />}
            </Button>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
          <section className="space-y-6 rounded-3xl bg-neutral-900/95 p-6 text-white shadow-lg">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="flex-1 space-y-3">
                <p className="text-sm text-white/70">{currentCocktail.description}</p>
                {currentCocktail.garnish ? (
                  <p className="text-xs font-medium uppercase tracking-widest text-amber-200">
                    Garnish: {currentCocktail.garnish}
                  </p>
                ) : null}
              </div>
              <div className="flex h-36 w-full items-center justify-center rounded-2xl bg-white/10 p-3 lg:w-40">
                <img
                  src={currentCocktail.imagePath}
                  alt={`${currentCocktail.name} cocktail`}
                  className="h-full w-full object-contain drop-shadow-2xl"
                  loading="lazy"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {currentCocktail.stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/20 bg-white/5 p-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/60">{stat.label}</p>
                  <p className="text-xl font-semibold">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {currentCocktail.hashtags.map((tag) => (
                <span key={tag} className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-widest text-white/80">
                  #{tag}
                </span>
              ))}
            </div>
          </section>

          <section className="space-y-5 rounded-3xl border border-neutral-100 bg-white/80 p-6 shadow-inner">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-600">Ingredients</p>
              <ul className="mt-3 space-y-3">
                {currentCocktail.ingredients.map((ingredient) => (
                  <li key={`${ingredient.name}-${ingredient.amount}`} className="rounded-2xl border border-neutral-200 bg-white/70 p-3">
                    <p className="text-sm font-semibold text-neutral-900">{ingredient.amount}</p>
                    <p className="text-base text-neutral-700">
                      {ingredient.name}
                      {ingredient.optional ? " (optional)" : ""}
                    </p>
                    {ingredient.note ? <p className="text-xs text-neutral-500">{ingredient.note}</p> : null}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-600">Build</p>
              <p className="mt-3 text-sm leading-relaxed text-neutral-700">{currentCocktail.instructions}</p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-600">Swap cocktail</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {availableCocktails.map((cocktail) => (
                  <Button
                    key={cocktail.id}
                    variant={cocktail.id === currentCocktail.id ? "default" : "secondary"}
                    size="sm"
                    disabled={cocktail.id === currentCocktail.id || isPending}
                    className={cn(
                      "rounded-full border border-neutral-200",
                      cocktail.id === currentCocktail.id ? "bg-neutral-900 text-white hover:bg-neutral-800" : "bg-white/80",
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
          </section>
        </div>
      </div>
    </div>
  );
}

export default CocktailWidget;

mountWidget(<CocktailWidget />);
