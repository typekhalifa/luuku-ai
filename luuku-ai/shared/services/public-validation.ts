import { searchBusiness } from "../providers/research/tavily";
import { PublicValidation } from "../types/research";

export async function validateBusiness(
  business: string
): Promise<PublicValidation> {
  const research = await searchBusiness(business);

  return {
    website:
      research.results.find(r => r.url.includes(".rw"))?.url ??
      research.results[0]?.url,

    summary: research.answer,

    validationSignals: research.results.map(r => r.title),

    evidence: research.results
      .slice(0, 3)
      .map(r => r.content.substring(0, 180)),

    confidenceBoost: Math.min(research.results.length * 10, 40),
  };
}