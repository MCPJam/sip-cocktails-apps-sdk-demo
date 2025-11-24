import { type CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { getCocktail, listCocktails } from "./cocktails.js";
import { z } from "zod";
import { McpServer } from "skybridge/server";

const server = new McpServer(
  {
    name: "alpic-openai-app",
    version: "0.0.1",
  },
  { capabilities: {} },
);

server.widget(
  "cocktail",
  {
    description: "Get the cocktail with a specific name. Call this tool once.",
  },
  {
    description:
      "Get the cocktail by specific name. Call this tool once. This will render the cocktail widget.",
    inputSchema: {
      name: z
        .string()
        .describe("Cocktail name or slug (e.g. margarita, old fashioned). Optional, defaults to Margarita.")
        .optional(),
    },
  },
  async ({ name }): Promise<CallToolResult> => {
    try {
      const cocktail = getCocktail(name);
      const availableCocktails = listCocktails();

      return {
        _meta: { id: cocktail.id },
        structuredContent: {
          cocktail,
          availableCocktails,
        },
        content: [
          {
            type: "text",
            text: `${cocktail.name}: ${cocktail.description}`,
          },
          {
            type: "text",
            text: "Widget rendered with the full recipe. Avoid repeating measurements in plain text.",
          },
        ],
        isError: false,
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  },
);

server.tool(
  "list-cocktails",
  "Summarize the curated cocktails that the widget knows about. Call this tool once.",
  {},
  async (): Promise<CallToolResult> => {
    const summaries = listCocktails();
    const lines = summaries.map((cocktail) => `• ${cocktail.name} — ${cocktail.tagline}`);

    return {
      content: [
        {
          type: "text",
          text: `Currently curated cocktails:\n${lines.join("\n")}`,
        },
      ],
      isError: false,
    };
  },
);

export default server;
