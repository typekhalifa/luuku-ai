export interface PublicValidation {

    website?: string;

    summary: string;

    validationSignals: string[];

    evidence: string[];

    confidenceBoost: number;

}

export interface PublicSearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export interface PublicResearch {
  query: string;
  answer: string;
  responseTime: number;
  results: PublicSearchResult[];
}

export interface TavilyResponse {
  query: string;
  answer: string;
  response_time: number;

  results: {
    title: string;
    url: string;
    content: string;
    score: number;
  }[];
}