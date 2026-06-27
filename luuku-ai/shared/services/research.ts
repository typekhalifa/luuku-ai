import { searchBusiness } from "../providers/research/tavily";

export async function getPublicResearch(business: string) {
  return await searchBusiness(business);
}