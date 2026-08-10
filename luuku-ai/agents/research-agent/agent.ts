import crypto from "crypto";
import { saveProspect } from "../../shared/services/memory";
import { validateBusiness } from "../../shared/services/public-validation";
import { PublicValidation } from "../../shared/types/research";
import { getPublicResearch } from "../../shared/services/research";
import { runPublicValidation } from "../../shared/services/validation";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";
import { config } from "../../shared/config/env";
import { addTimelineEvent } from "../../shared/services/timeline";
import { ProspectMemory } from "../../shared/types/memory";

type ResearchInput = {
  business: string;
  sector: string;
  region: string;
  researchGoal: string;
  notes?: string;
};

type OpportunityAngle = {
  title: string;
  why: string;
};

type OfferRecommendation = {
  name: string;
  why: string;
};

type ProspectScore = {
  aiNeed: number;
  workflowPotential: number;
  knowledgeFit: number;
  outreachAttractiveness: number;
  overall: number;
};

type OutreachReadiness = {
  status: "Ready now" | "Needs validation first";
  reasons: string[];
};

type ConfidenceLevel = {
  level: "High" | "Moderate" | "Low";
  reason: string;
};

type ProspectMemoryNote = {
  found: boolean;
  summaryLines: string[];
};

type SectorHeuristics = {
  painPoints: string[];
  opportunities: OpportunityAngle[];
  offer: OfferRecommendation;
  tags: string[];
  outreachBoost: number;
  knowledgeBoost: number;
  workflowBoost: number;
  aiNeedBoost: number;
  readinessUnknowns: string[];
  nextActions: string[];
  decisionMakers: string[];
  pilotShape: string[];
};

const openai = config.openaiApiKey
  ? new OpenAI({ apiKey: config.openaiApiKey })
  : null;

function sanitizeFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function ensureLogsDir() {
  const logsDir = path.resolve(process.cwd(), "logs");
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  return logsDir;
}

function saveLog(filePrefix: string, content: string) {
  const logsDir = ensureLogsDir();
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-");
  const filePath = path.join(logsDir, `${filePrefix}-${timestamp}.md`);
  fs.writeFileSync(filePath, content, "utf8");
  return filePath;
}

function titleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

async function collectResearchInput(): Promise<ResearchInput> {
  const rl = readline.createInterface({ input, output });

  console.log("=== Luuku AI Research Agent v0.8.0 ===");
  console.log("Enter the prospect details below.\n");

  const business = (await rl.question("Business name: ")).trim();
  const sector = (await rl.question("Sector: ")).trim();
  const region = (await rl.question("Region / country: ")).trim();
  const researchGoal = (await rl.question("Research goal: ")).trim();
  const notes = (await rl.question("Extra notes (optional): ")).trim();

  rl.close();

  return {
    business,
    sector,
    region,
    researchGoal,
    notes: notes || undefined,
  };
}

function normalizeSector(sector: string) {
  return sector.trim().toLowerCase();
}

function getSectorHeuristics(sectorRaw: string): SectorHeuristics {
  const sector = normalizeSector(sectorRaw);

  if (sector.includes("bank") || sector.includes("finance") || sector.includes("microfinance") || sector.includes("insurance")) {
    return {
      painPoints: [
        "High volume of repetitive customer inquiries, service requests, and internal support questions.",
        "Internal policies, compliance procedures, and operational knowledge are likely spread across teams and documents.",
        "Approval-heavy workflows, reporting cycles, and coordination between front-office and back-office teams may create delays.",
      ],
      opportunities: [
        { title: "Internal AI Knowledge Assistant", why: "Staff in finance-heavy environments often need quick access to procedures, product rules, compliance guidance, and operational policies." },
        { title: "Workflow Automation Copilot", why: "Approval chains, repetitive service requests, and recurring operational follow-ups are strong automation targets." },
        { title: "Reporting / Operations Copilot", why: "Management reporting, recurring summaries, and workflow monitoring can often be streamlined with AI support." },
      ],
      offer: { name: "AI Knowledge Assistant + Workflow Audit", why: "This gives Luuku AI a practical first wedge around policy access, repetitive internal questions, and workflow bottlenecks before broader automation." },
      tags: ["compliance-knowledge-heavy", "internal-knowledge-fit", "workflow-automation-fit", "enterprise-target"],
      outreachBoost: 7,
      knowledgeBoost: 9,
      workflowBoost: 8,
      aiNeedBoost: 8,
      readinessUnknowns: [
        "Need confirmation of documentation-heavy internal workflows and how staff currently access operational guidance.",
        "Need to identify who owns operations, digital transformation, service delivery, or process improvement.",
        "Need evidence of repetitive internal support or approval bottlenecks worth automating first.",
      ],
      nextActions: [
        "Visit the business website and identify operations, digital transformation, customer service, or process-improvement functions.",
        "Look for signs of documentation-heavy internal workflows, policy-heavy operations, or recurring approval chains.",
        "Find one Rwanda-specific operational pain angle before outreach so the first message feels grounded rather than generic.",
      ],
      decisionMakers: [
        "Head of Operations / Operations Excellence",
        "Head of Digital Transformation / Innovation",
        "Customer Experience or Service Delivery Lead",
        "COO / Senior Operations Leader",
        "Process Improvement / Transformation Manager",
      ],
      pilotShape: [
        "Run a 2-week workflow and knowledge audit focused on one internal banking operations workflow.",
        "Map where staff currently lose time searching for procedures, compliance guidance, and operational instructions.",
        "Prototype one internal AI knowledge assistant for a targeted team or workflow.",
        "Define success metrics such as faster policy access, fewer repetitive internal support questions, and reduced workflow delay.",
      ],
    };
  }

  return {
    painPoints: [
      "The organization likely has repetitive internal coordination, support, or reporting work that may be handled manually.",
      "Operational knowledge, procedures, or business information may be fragmented across documents and people.",
      "Follow-up workflows, approvals, and recurring communication tasks may create avoidable friction.",
    ],
    opportunities: [
      { title: "Internal AI Knowledge Assistant", why: "A knowledge assistant is often a strong first offer where staff repeatedly need access to internal procedures or business information." },
      { title: "Workflow Automation Assistant", why: "If the business has repetitive requests, follow-ups, approvals, or reporting cycles, there may be automation value." },
      { title: "Operations / Reporting Copilot", why: "AI can often support recurring coordination, summaries, and operational monitoring tasks." },
    ],
    offer: { name: "AI Workflow & Knowledge Audit", why: "When the sector fit is broad, a workflow and knowledge audit is a safe first Luuku AI entry point to uncover the highest-value pilot." },
    tags: ["general-prospect", "knowledge-assistant-fit", "workflow-automation-fit"],
    outreachBoost: 6,
    knowledgeBoost: 7,
    workflowBoost: 7,
    aiNeedBoost: 7,
    readinessUnknowns: [
      "Need to identify the most repetitive workflow or knowledge-access bottleneck before outreach.",
      "Need to identify who owns operations, digital transformation, or process improvement.",
      "Need to validate whether the strongest first angle is internal knowledge access, customer support, or workflow automation.",
    ],
    nextActions: [
      "Review the business website and public materials to understand its operating model and likely workflow complexity.",
      "Look for signs of repetitive support work, internal knowledge dependence, or approval-heavy processes.",
      "Decide which single Luuku AI offer angle feels most concrete before outreach.",
    ],
    decisionMakers: [
      "Operations Lead",
      "Digital / Innovation Lead",
      "Customer Experience or Service Lead",
      "Process Improvement / Transformation Owner",
    ],
    pilotShape: [
      "Run a short workflow and knowledge discovery sprint before proposing a larger automation engagement.",
      "Identify one repetitive workflow and one knowledge-access bottleneck worth testing first.",
      "Prototype a small assistant or workflow support layer around the chosen pain point.",
      "Measure time saved, reduced repetitive effort, and better access to operational knowledge.",
    ],
  };
}

function dedupe(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function scoreProspect(input: ResearchInput, heuristics: SectorHeuristics): ProspectScore {
  const context = `${input.notes || ""} ${input.researchGoal}`.toLowerCase();
  let aiNeed = heuristics.aiNeedBoost;
  let workflowPotential = heuristics.workflowBoost;
  let knowledgeFit = heuristics.knowledgeBoost;
  let outreachAttractiveness = heuristics.outreachBoost;

  if (/(support|inquiry|faq|service)/.test(context)) {
    aiNeed += 1;
    workflowPotential += 1;
  }
  if (/(workflow|automation|approval|reporting|process)/.test(context)) workflowPotential += 1;
  if (/(knowledge|policy|documentation|procedure)/.test(context)) knowledgeFit += 1;
  if (/(rwanda|pitch|offer|outreach)/.test(context)) outreachAttractiveness += 0.5;

  const clamp = (n: number) => Math.max(1, Math.min(10, n));
  aiNeed = clamp(aiNeed);
  workflowPotential = clamp(workflowPotential);
  knowledgeFit = clamp(knowledgeFit);
  outreachAttractiveness = clamp(outreachAttractiveness);

  const overall = aiNeed * 0.3 + workflowPotential * 0.3 + knowledgeFit * 0.25 + outreachAttractiveness * 0.15;
  return {
    aiNeed,
    workflowPotential,
    knowledgeFit,
    outreachAttractiveness,
    overall: Number(overall.toFixed(1)),
  };
}

function buildResearchTags(input: ResearchInput, heuristics: SectorHeuristics, score: ProspectScore) {
  const tags = [...heuristics.tags];
  if (score.aiNeed >= 8) tags.push("high-ai-need");
  if (score.workflowPotential >= 8) tags.push("high-workflow-automation-fit");
  if (score.knowledgeFit >= 8) tags.push("high-knowledge-assistant-fit");
  if (score.outreachAttractiveness >= 8) tags.push("strong-outreach-target");

  const sector = normalizeSector(input.sector);
  if (sector.includes("bank") || sector.includes("finance")) tags.push("finance-ops-target");
  if (sector.includes("hotel") || sector.includes("hospitality")) tags.push("hospitality-target");
  if (sector.includes("health") || sector.includes("clinic")) tags.push("health-admin-target");
  if (sector.includes("education") || sector.includes("university")) tags.push("education-admin-target");
  return dedupe(tags);
}

function assessOutreachReadiness(heuristics: SectorHeuristics, score: ProspectScore): OutreachReadiness {
  const reasons = dedupe([
    ...(score.overall < 7.5 ? ["The current research signal is still moderate rather than strong, so more validation would improve pitch quality."] : []),
    ...heuristics.readinessUnknowns,
  ]);

  if (score.overall >= 8.2 && reasons.length <= 3) {
    return { status: "Ready now", reasons: ["The prospect looks strong enough for a first outreach pass, while the points below can still sharpen the pitch.", ...reasons] };
  }
  return { status: "Needs validation first", reasons };
}

function buildImmediateNextResearchActions(heuristics: SectorHeuristics, readiness: OutreachReadiness) {
  const actions = [...heuristics.nextActions];
  if (readiness.status === "Needs validation first") actions.push("Do one focused validation pass before outreach so the first Luuku AI message is tied to a concrete operational pain point.");
  return dedupe(actions).slice(0, 4);
}

function assessConfidence(input: ResearchInput, score: ProspectScore, memory: ProspectMemoryNote): ConfidenceLevel {
  let points = 0;
  if (score.overall >= 8.2) points += 2;
  else if (score.overall >= 7.2) points += 1;
  if ((input.notes || "").trim().length >= 40) points += 1;
  if (input.researchGoal.trim().length >= 35) points += 1;
  if (memory.found) points += 1;

  if (points >= 5) return { level: "High", reason: "The fit score is strong and Luuku AI has enough supporting context to treat this as a higher-confidence prospect hypothesis." };
  if (points >= 3) return { level: "Moderate", reason: "The prospect looks promising, but the current assessment still leans partly on sector heuristics and should be sharpened with more business-specific validation." };
  return { level: "Low", reason: "The current hypothesis is still thin and needs more business-specific evidence before Luuku AI should rely on it heavily." };
}

function findProspectMemory(business: string): ProspectMemoryNote {
  const logsDir = ensureLogsDir();
  const businessSlug = sanitizeFileName(business);
  const prefix = `research-${businessSlug}-`;
  const files = fs.readdirSync(logsDir).filter((file) => file.startsWith(prefix) && file.endsWith(".md")).sort();
  if (files.length === 0) return { found: false, summaryLines: ["- No prior research log found for this prospect."] };

  const latestFile = files[files.length - 1];
  try {
    const content = fs.readFileSync(path.join(logsDir, latestFile), "utf8");
    const scoreMatch = content.match(/\*\*Overall Luuku Fit Score:\*\*\s*([0-9.]+)\/10/i);
    const offerMatch = content.match(/\*\*Recommended offer:\*\*\s*(.+)/i);
    const lines = [`- Prior research log found: **${latestFile}**`];
    if (scoreMatch?.[1]) lines.push(`- Previous recorded Luuku Fit Score: **${scoreMatch[1]}/10**`);
    if (offerMatch?.[1]) lines.push(`- Previous recommended offer: **${offerMatch[1].trim()}**`);
    lines.push("- Use the prior log as context to refine the pitch rather than treating this prospect as completely new.");
    return { found: true, summaryLines: lines };
  } catch {
    return { found: true, summaryLines: [`- Prior research log found for ${business}, but it could not be parsed cleanly.`] };
  }
}

type ResearchResult = {
  markdown: string;
  score: ProspectScore;
  heuristics: SectorHeuristics;
  tags: string[];
  readiness: OutreachReadiness;
  confidence: ConfidenceLevel;
  nextActions: string[];
  memory: ProspectMemoryNote;
};

function buildFallbackResearch(input: ResearchInput, validation: PublicValidation): ResearchResult {
  const memory = findProspectMemory(input.business);
  const heuristics = getSectorHeuristics(input.sector);
  const score = scoreProspect(input, heuristics);
  const tags = buildResearchTags(input, heuristics, score);
  const readiness = assessOutreachReadiness(heuristics, score);
  const nextActions = buildImmediateNextResearchActions(heuristics, readiness);
  const confidence = assessConfidence(input, score, memory);
  const lines: string[] = [];

  lines.push("### Public Validation");
  lines.push(`- Website: ${validation.website ?? "Unknown"}`);
  lines.push(`- Summary: ${validation.summary}`);
  lines.push("");
  lines.push("Evidence");
  validation.evidence.forEach((item) => lines.push(`- ${item}`));
  lines.push("");
  lines.push("Sources");
  validation.validationSignals.forEach((item) => lines.push(`- ${item}`));
  lines.push("");
  lines.push("### 1) Business Snapshot");
  lines.push(`- **Business:** ${input.business}`);
  lines.push(`- **Sector:** ${titleCase(input.sector)}`);
  lines.push(`- **Region:** ${input.region}`);
  lines.push(`- **Research goal:** ${input.researchGoal}`);
  lines.push("- This brief is a **founder-side research hypothesis** based on the information currently provided, not a fully validated field assessment.\n");
  lines.push("### 2) Likely Operational Pain Points");
  heuristics.painPoints.forEach((item) => lines.push(`- ${item}`));
  lines.push("");
  lines.push("### 3) Luuku AI Opportunity Angles");
  heuristics.opportunities.forEach((item) => lines.push(`- **${item.title}** — ${item.why}`));
  lines.push("");
  lines.push("### 4) Recommended First Offer");
  lines.push(`- **Recommended offer:** ${heuristics.offer.name}`);
  lines.push(`- **Why:** ${heuristics.offer.why}\n`);
  lines.push("### 5) Outreach Hook");
  lines.push(`Luuku AI could approach **${input.business}** by offering to review how repetitive operational work, internal knowledge access, and workflow coordination are currently handled, then propose a practical AI solution that reduces staff time, improves response speed, and makes business knowledge easier to access.\n`);
  lines.push("### 6) Unknowns / What to Validate");
  heuristics.readinessUnknowns.forEach((item) => lines.push(`- ${item}`));
  if (input.notes) lines.push(`- Input notes provided: ${input.notes}`);
  lines.push("");
  lines.push("### 7) Prospect Score");
  lines.push(`- **AI need / pain intensity:** ${score.aiNeed}/10`);
  lines.push(`- **Workflow automation potential:** ${score.workflowPotential}/10`);
  lines.push(`- **Knowledge assistant fit:** ${score.knowledgeFit}/10`);
  lines.push(`- **Outreach attractiveness:** ${score.outreachAttractiveness}/10`);
  lines.push(`- **Overall Luuku Fit Score:** ${score.overall}/10\n`);
  lines.push("### 8) Research Tags");
  tags.forEach((tag) => lines.push(`- ${tag}`));
  lines.push("");
  lines.push("### 9) Outreach Readiness");
  lines.push(`- **Status:** ${readiness.status}`);
  readiness.reasons.forEach((reason) => lines.push(`- ${reason}`));
  lines.push("");
  lines.push("### 10) Immediate Next Research Action");
  nextActions.forEach((action) => lines.push(`- ${action}`));
  lines.push("");
  lines.push("### 11) Likely Decision-Maker Targets");
  heuristics.decisionMakers.forEach((person) => lines.push(`- ${person}`));
  lines.push("");
  lines.push("### 12) Suggested Pilot Shape");
  heuristics.pilotShape.forEach((item) => lines.push(`- ${item}`));
  lines.push("");
  lines.push("### 13) Confidence Level");
  lines.push(`- **Confidence:** ${confidence.level}`);
  lines.push(`- ${confidence.reason}`);
  lines.push("");
  lines.push("### 14) Prospect Memory Note");
  memory.summaryLines.forEach((line) => lines.push(line));
  lines.push("");
  lines.push("### Research Mode Note");
  lines.push("- This response was generated in **fallback mode** using Luuku AI research heuristics, prospect scoring logic, offer-matching rules, and lightweight prospect memory from local logs.");

  return { markdown: lines.join("\n"), score, heuristics, tags, readiness, confidence, nextActions, memory };
}

function buildPrompt(input: ResearchInput, validation: PublicValidation, memory: ProspectMemoryNote) {
  return `
You are Luuku AI's internal Research Agent.

Your job is to help the founder identify AI workflow automation opportunities for a business prospect and prepare Luuku AI for high-quality outreach.

Return a structured research brief in markdown using EXACTLY these sections:

## Research Brief
### 1) Business Snapshot
### 2) Likely Operational Pain Points
### 3) Luuku AI Opportunity Angles
### 4) Recommended First Offer
### 5) Outreach Hook
### 6) Unknowns / What to Validate
### 7) Prospect Score
### 8) Research Tags
### 9) Outreach Readiness
### 10) Immediate Next Research Action
### 11) Likely Decision-Maker Targets
### 12) Suggested Pilot Shape
### 13) Confidence Level
### 14) Prospect Memory Note

Rules:
- Be practical, not fluffy.
- Focus on AI workflow automation, internal knowledge assistants, reporting copilots, support automation, and operational coordination use cases.
- Use the public validation context below as evidence, but do not claim a business-specific pain point unless the supplied evidence or the user input supports it. Label sector-level assumptions as hypotheses.
- The Recommended First Offer should be a single best Luuku AI wedge, not a vague transformation pitch.
- Prospect Score must include AI need / pain intensity, Workflow automation potential, Knowledge assistant fit, Outreach attractiveness, and Overall Luuku Fit Score.
- Research Tags should be concise, reusable pipeline tags.
- Outreach Readiness must say either "Ready now" or "Needs validation first" and explain why.
- Immediate Next Research Action must be concrete and operational.
- Likely Decision-Maker Targets should name roles/functions, not invented person names.
- Suggested Pilot Shape should describe the likely first engagement Luuku AI could propose.
- Confidence Level must be High, Moderate, or Low with a short reason.
- Prospect Memory Note should summarize prior research context if present.

Prospect input:
- Business: ${input.business}
- Sector: ${input.sector}
- Region: ${input.region}
- Research goal: ${input.researchGoal}
- Extra notes: ${input.notes || "none"}

Public validation context:
- Website: ${validation.website ?? "Unknown"}
- Summary: ${validation.summary}
- Evidence: ${validation.evidence.join(" | ") || "None"}
- Validation signals: ${validation.validationSignals.join(" | ") || "None"}

Prior research memory:
${memory.summaryLines.join("\n")}
`.trim();
}

async function getOpenAIResearch(input: ResearchInput, validation: PublicValidation, memory: ProspectMemoryNote) {
  if (!openai) throw new Error("Missing OpenAI client");
  const response = await openai.responses.create({
    model: config.openaiModel || "gpt-4.1-mini",
    input: buildPrompt(input, validation, memory),
  });
  return response.output_text?.trim() || "";
}

async function run() {
  const inputData = await collectResearchInput();
  const publicResearch = await getPublicResearch(inputData.business);
  console.log("\n=== LIVE PUBLIC RESEARCH ===\n");
  console.log(publicResearch);
  console.log("\nThinking...\n");

  let validation: PublicValidation;
  try {
    validation = await validateBusiness(inputData.business);
    console.log("\n=== LIVE PUBLIC VALIDATION ===\n");
    console.log(validation);
  } catch {
    validation = { website: undefined, summary: "Public validation unavailable.", validationSignals: [], evidence: [], confidenceBoost: 0 };
  }

  const memory = findProspectMemory(inputData.business);
  let outputText = "";
  let mode: "openai" | "fallback" = "fallback";
  let fallback: ReturnType<typeof buildFallbackResearch> | undefined;

  try {
    outputText = await getOpenAIResearch(inputData, validation, memory);
    if (!outputText) throw new Error("Empty OpenAI response");
    mode = "openai";
  } catch {
    console.error("OpenAI unavailable. Switching to fallback mode...\n");
    fallback = buildFallbackResearch(inputData, validation);
    outputText = fallback.markdown;
    mode = "fallback";
  }

  console.log(outputText);

  if (fallback) {
    const prospect: ProspectMemory = {
      id: crypto.randomUUID(),
      business: inputData.business,
      sector: inputData.sector,
      region: inputData.region,
      fitScore: fallback.score.overall,
      recommendedOffer: fallback.heuristics.offer.name,
      owner: "Research Agent",
      status: "researched",
      archived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addTimelineEvent(prospect, "Research Agent", "Prospect researched", "Initial business research completed");
    saveProspect(prospect);
  }

  const businessSlug = sanitizeFileName(inputData.business || "prospect");
  const logContent = `${outputText}\n\n---\nGenerated at: ${new Date().toISOString()}\nMode: ${mode}\n`;
  const logPath = saveLog(`research-${businessSlug}`, logContent);
  console.log(`\nLog saved to: ${logPath}`);
}

run().catch((error) => {
  console.error("Research agent failed:", error);
});
