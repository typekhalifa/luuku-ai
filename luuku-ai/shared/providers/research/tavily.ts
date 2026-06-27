import "dotenv/config";

import {
  PublicResearch,
  TavilyResponse,
} from "../../types/research";

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

export async function searchBusiness(
  query: string
): Promise<PublicResearch> {
  if (!TAVILY_API_KEY) {
    throw new Error("Missing TAVILY_API_KEY");
  }

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: TAVILY_API_KEY,
      query,
      search_depth: "basic",
      max_results: 5,
      include_answer: true,
      include_images: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Tavily Error: ${response.status}`);
  }

  const data = (await response.json()) as TavilyResponse;

  const normalized: PublicResearch = {
    query: data.query,
    answer: data.answer,
    responseTime: data.response_time,
    results: data.results.map((r) => ({
      title: r.title,
      url: r.url,
      content: r.content,
      score: r.score,
    })),
  };

  return normalized;
}