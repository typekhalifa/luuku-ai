import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";
import { config } from "../../shared/config/env";

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

  console.log("=== Luuku AI Research Agent v0.7.1 ===");
  console.log("Enter the prospect details below.\n");

  const business = (await rl.question("Business name: ")).trim();
  const sector = (await rl.question("Sector: ")).trim();
  const region = (await rl.question("Region / country: ")).trim();
  const researchGoal = (
    await rl.question("Research goal: ")
  ).trim();
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

function getSectorHeuristics(sectorRaw: string) {
  const sector = normalizeSector(sectorRaw);

  if (
    sector.includes("bank") ||
    sector.includes("finance") ||
    sector.includes("microfinance") ||
    sector.includes("insurance")
  ) {
    return {
      painPoints: [
        "High volume of repetitive customer inquiries, service requests, and internal support questions.",
        "Internal policies, compliance procedures, and operational knowledge are likely spread across teams and documents.",
        "Approval-heavy workflows, reporting cycles, and coordination between front-office and back-office teams may create delays.",
      ],
      opportunities: [
        {
          title: "Internal AI Knowledge Assistant",
          why: "Staff in finance-heavy environments often need quick access to procedures, product rules, compliance guidance, and operational policies.",
        },
        {
          title: "Workflow Automation Copilot",
          why: "Approval chains, repetitive service requests, and recurring operational follow-ups are strong automation targets.",
        },
        {
          title: "Reporting / Operations Copilot",
          why: "Management reporting, recurring summaries, and workflow monitoring can often be streamlined with AI support.",
        },
      ],
      offer: {
        name: "AI Knowledge Assistant + Workflow Audit",
        why: "This gives Luuku AI a practical first wedge: reduce friction around policy access, repetitive internal questions, and workflow bottlenecks before pitching broader automation.",
      },
      tags: [
        "compliance-knowledge-heavy",
        "internal-knowledge-fit",
        "workflow-automation-fit",
        "enterprise-target",
      ],
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
    };
  }

  if (
    sector.includes("hotel") ||
    sector.includes("hospitality") ||
    sector.includes("restaurant") ||
    sector.includes("tourism")
  ) {
    return {
      painPoints: [
        "Guest-facing teams may spend time answering repetitive booking, pricing, service, and support questions.",
        "Operational coordination across reservations, front desk, housekeeping, and management may be manual or fragmented.",
        "Reporting, shift handoffs, and internal SOP access may create avoidable friction.",
      ],
      opportunities: [
        {
          title: "Guest Support / Booking Assistant",
          why: "A hospitality business often benefits from automating repetitive guest inquiries and booking-related communication.",
        },
        {
          title: "Operations Coordination Assistant",
          why: "Internal handoffs, issue tracking, and recurring operational coordination can often be simplified.",
        },
        {
          title: "Internal SOP Knowledge Assistant",
          why: "Hotels and hospitality businesses rely on repeatable procedures that staff should access quickly and consistently.",
        },
      ],
      offer: {
        name: "Guest Support Workflow Assistant",
        why: "A hospitality offer can start with guest inquiry handling and operational coordination before expanding into broader internal automation.",
      },
      tags: [
        "guest-support-volume",
        "ops-coordination-fit",
        "workflow-automation-fit",
        "service-business",
      ],
      outreachBoost: 8,
      knowledgeBoost: 6,
      workflowBoost: 8,
      aiNeedBoost: 7,
      readinessUnknowns: [
        "Need to understand whether guest inquiry volume is high enough to justify automation.",
        "Need to know what booking, communication, and operational tools the business already uses.",
        "Need confirmation of the most painful cross-team coordination workflow.",
      ],
      nextActions: [
        "Review the website, booking channels, and customer contact flows to see how guest communication is handled.",
        "Look for signs of operational complexity: multiple services, multiple locations, or strong reliance on staff coordination.",
        "Identify whether the first Luuku angle should be guest support automation or internal operations support.",
      ],
    };
  }

  if (
    sector.includes("hospital") ||
    sector.includes("clinic") ||
    sector.includes("health") ||
    sector.includes("medical")
  ) {
    return {
      painPoints: [
        "Administrative staff may handle repetitive appointment, patient, and internal coordination questions.",
        "Clinical and non-clinical workflows may rely on fragmented documents, approvals, and handoffs.",
        "Patient support and internal knowledge access may both be time-consuming.",
      ],
      opportunities: [
        {
          title: "Patient / Front Desk FAQ Assistant",
          why: "Healthcare organizations often receive repetitive appointment and service questions that can be partially automated.",
        },
        {
          title: "Internal Knowledge Assistant",
          why: "Policy access, internal procedures, and staff guidance are common friction points in healthcare operations.",
        },
        {
          title: "Admin Workflow Automation",
          why: "Scheduling, document follow-up, and internal approvals may offer high-value workflow automation opportunities.",
        },
      ],
      offer: {
        name: "Administrative Knowledge + Workflow Assistant",
        why: "A practical first healthcare offer is to reduce administrative friction rather than trying to touch clinical workflows too early.",
      },
      tags: [
        "admin-heavy-operations",
        "internal-knowledge-fit",
        "patient-support-fit",
        "workflow-automation-fit",
      ],
      outreachBoost: 6,
      knowledgeBoost: 8,
      workflowBoost: 8,
      aiNeedBoost: 8,
      readinessUnknowns: [
        "Need to confirm whether the organization is more constrained by patient-facing admin work or internal staff workflow friction.",
        "Need clarity on document handling, approvals, and staff support processes.",
        "Need to identify a non-clinical decision-maker who could sponsor an initial pilot.",
      ],
      nextActions: [
        "Look for evidence of appointment-heavy, admin-heavy, or support-heavy operations.",
        "Map which non-clinical workflows Luuku AI could help without entering regulated clinical decision territory.",
        "Identify an admin, operations, or digital lead rather than approaching the organization too broadly.",
      ],
    };
  }

  if (
    sector.includes("school") ||
    sector.includes("education") ||
    sector.includes("university") ||
    sector.includes("college")
  ) {
    return {
      painPoints: [
        "Staff may repeatedly answer admissions, registration, fee, scheduling, and policy questions.",
        "Institutional knowledge may be spread across departments, notices, documents, and staff memory.",
        "Administrative workflows and approvals may be repetitive and slow.",
      ],
      opportunities: [
        {
          title: "Admissions / Student FAQ Assistant",
          why: "Educational institutions often face repetitive inquiry loads that are good automation candidates.",
        },
        {
          title: "Internal Staff Knowledge Assistant",
          why: "Policies, forms, academic procedures, and administrative guidance can be centralized through an internal assistant.",
        },
        {
          title: "Administrative Workflow Copilot",
          why: "Routine document handling, approvals, and communication workflows can often be improved.",
        },
      ],
      offer: {
        name: "Institutional Knowledge Assistant",
        why: "Education organizations often get quick value from making internal and student-facing information easier to access.",
      },
      tags: [
        "faq-volume",
        "internal-knowledge-fit",
        "admin-workflow-fit",
        "institutional-target",
      ],
      outreachBoost: 7,
      knowledgeBoost: 9,
      workflowBoost: 7,
      aiNeedBoost: 7,
      readinessUnknowns: [
        "Need to know whether the stronger angle is student-facing support or internal administrative support.",
        "Need visibility into where institutional knowledge currently lives.",
        "Need to identify a likely sponsor in administration, ICT, or student services.",
      ],
      nextActions: [
        "Check the institution website for admissions, student support, ICT, and administrative service workflows.",
        "Look for recurring information-heavy processes like registration, fee guidance, and policy interpretation.",
        "Decide whether the first Luuku pitch should focus on staff productivity or student-facing support.",
      ],
    };
  }

  if (
    sector.includes("retail") ||
    sector.includes("shop") ||
    sector.includes("ecommerce") ||
    sector.includes("e-commerce") ||
    sector.includes("supermarket")
  ) {
    return {
      painPoints: [
        "Teams may handle repetitive product, order, stock, and support questions.",
        "Inventory, customer communication, and internal coordination may rely on manual follow-up.",
        "Operational reporting and issue tracking may be inconsistent or time-consuming.",
      ],
      opportunities: [
        {
          title: "Customer Support Assistant",
          why: "Retail environments often benefit from automating repetitive customer questions and support triage.",
        },
        {
          title: "Inventory / Ops Workflow Assistant",
          why: "Internal follow-ups around stock, order status, and issue escalation can often be streamlined.",
        },
        {
          title: "Management Reporting Copilot",
          why: "Retail operations generate recurring operational summaries and coordination work that AI can support.",
        },
      ],
      offer: {
        name: "Customer Support + Ops Workflow Assistant",
        why: "Retail businesses often get early value from reducing repetitive customer support load while improving internal coordination.",
      },
      tags: [
        "customer-support-fit",
        "ops-workflow-fit",
        "service-volume",
        "workflow-automation-fit",
      ],
      outreachBoost: 8,
      knowledgeBoost: 5,
      workflowBoost: 8,
      aiNeedBoost: 7,
      readinessUnknowns: [
        "Need to understand whether customer support or internal operations is the more painful first wedge.",
        "Need visibility into current order, stock, and customer service workflows.",
        "Need to know whether the business has enough scale to justify an initial AI automation pilot.",
      ],
      nextActions: [
        "Look for signs of multi-branch operations, online ordering, or high customer communication volume.",
        "Identify whether inventory/ops coordination or customer support should be the first Luuku angle.",
        "Find a decision-maker responsible for operations, digital, or customer experience.",
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
      {
        title: "Internal AI Knowledge Assistant",
        why: "A knowledge assistant is often a strong first offer where staff repeatedly need access to internal procedures or business information.",
      },
      {
        title: "Workflow Automation Assistant",
        why: "If the business has repetitive requests, follow-ups, approvals, or reporting cycles, there may be automation value.",
      },
      {
        title: "Operations / Reporting Copilot",
        why: "AI can often support recurring coordination, summaries, and operational monitoring tasks.",
      },
    ],
    offer: {
      name: "AI Workflow & Knowledge Audit",
      why: "When the sector fit is still broad, a workflow and knowledge audit is a safe first Luuku AI entry point that can uncover the highest-value pilot.",
    },
    tags: [
      "general-prospect",
      "knowledge-assistant-fit",
      "workflow-automation-fit",
    ],
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
  };
}

function dedupe(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function scoreProspect(
  input: ResearchInput,
  heuristics: ReturnType<typeof getSectorHeuristics>
): ProspectScore {
  const notes = (input.notes || "").toLowerCase();
  const goal = input.researchGoal.toLowerCase();
  const combined = `${notes} ${goal}`;

  let aiNeed = heuristics.aiNeedBoost;
  let workflowPotential = heuristics.workflowBoost;
  let knowledgeFit = heuristics.knowledgeBoost;
  let outreachAttractiveness = heuristics.outreachBoost;

  if (
    combined.includes("support") ||
    combined.includes("customer inquiry") ||
    combined.includes("faq")
  ) {
    aiNeed += 1;
    workflowPotential += 1;
  }

  if (
    combined.includes("workflow") ||
    combined.includes("automation") ||
    combined.includes("approval") ||
    combined.includes("reporting")
  ) {
    workflowPotential += 1;
  }

  if (
    combined.includes("knowledge") ||
    combined.includes("policy") ||
    combined.includes("documentation") ||
    combined.includes("procedure")
  ) {
    knowledgeFit += 1;
  }

  if (
    combined.includes("rwanda") ||
    combined.includes("pitch") ||
    combined.includes("offer") ||
    combined.includes("outreach")
  ) {
    outreachAttractiveness += 0.5;
  }

  const clamp = (n: number) => Math.max(1, Math.min(10, n));

  aiNeed = clamp(aiNeed);
  workflowPotential = clamp(workflowPotential);
  knowledgeFit = clamp(knowledgeFit);
  outreachAttractiveness = clamp(outreachAttractiveness);

  const overall =
    aiNeed * 0.3 +
    workflowPotential * 0.3 +
    knowledgeFit * 0.25 +
    outreachAttractiveness * 0.15;

  return {
    aiNeed,
    workflowPotential,
    knowledgeFit,
    outreachAttractiveness,
    overall: Number(overall.toFixed(1)),
  };
}

function buildResearchTags(
  input: ResearchInput,
  heuristics: ReturnType<typeof getSectorHeuristics>,
  score: ProspectScore
) {
  const tags = [...heuristics.tags];

  if (score.aiNeed >= 8) tags.push("high-ai-need");
  if (score.workflowPotential >= 8) tags.push("high-workflow-automation-fit");
  if (score.knowledgeFit >= 8) tags.push("high-knowledge-assistant-fit");
  if (score.outreachAttractiveness >= 8) tags.push("strong-outreach-target");

  const sector = normalizeSector(input.sector);
  if (sector.includes("bank") || sector.includes("finance")) {
    tags.push("finance-ops-target");
  }
  if (sector.includes("hotel") || sector.includes("hospitality")) {
    tags.push("hospitality-target");
  }
  if (sector.includes("health") || sector.includes("clinic")) {
    tags.push("health-admin-target");
  }
  if (sector.includes("education") || sector.includes("university")) {
    tags.push("education-admin-target");
  }

  return dedupe(tags);
}

function assessOutreachReadiness(
  heuristics: ReturnType<typeof getSectorHeuristics>,
  score: ProspectScore
): OutreachReadiness {
  const reasons: string[] = [];

  if (score.overall < 7.5) {
    reasons.push(
      "The current research signal is still moderate rather than strong, so a bit more validation would improve pitch quality."
    );
  }

  reasons.push(...heuristics.readinessUnknowns);

  const uniqueReasons = dedupe(reasons);

  if (score.overall >= 8.2 && uniqueReasons.length <= 3) {
    return {
      status: "Ready now",
      reasons: [
        "The prospect looks strong enough for a first outreach pass, but the validation points below can still sharpen the pitch.",
        ...uniqueReasons,
      ],
    };
  }

  return {
    status: "Needs validation first",
    reasons: uniqueReasons,
  };
}

function buildImmediateNextResearchActions(
  heuristics: ReturnType<typeof getSectorHeuristics>,
  readiness: OutreachReadiness
) {
  const actions = [...heuristics.nextActions];

  if (readiness.status === "Needs validation first") {
    actions.push(
      "Do one focused validation pass before outreach so the first Luuku AI message is tied to a concrete operational pain point."
    );
  }

  return dedupe(actions).slice(0, 4);
}

function buildFallbackResearch(input: ResearchInput) {
  const heuristics = getSectorHeuristics(input.sector);
  const score = scoreProspect(input, heuristics);
  const tags = buildResearchTags(input, heuristics, score);
  const readiness = assessOutreachReadiness(heuristics, score);
  const nextActions = buildImmediateNextResearchActions(
    heuristics,
    readiness
  );

  const lines: string[] = [];

  lines.push("## Research Brief\n");

  lines.push("### 1) Business Snapshot");
  lines.push(`- **Business:** ${input.business}`);
  lines.push(`- **Sector:** ${titleCase(input.sector)}`);
  lines.push(`- **Region:** ${input.region}`);
  lines.push(`- **Research goal:** ${input.researchGoal}`);
  lines.push(
    "- This brief is a **founder-side research hypothesis** based on the information currently provided, not a fully validated field assessment.\n"
  );

  lines.push("### 2) Likely Operational Pain Points");
  heuristics.painPoints.forEach((item) => lines.push(`- ${item}`));
  lines.push("");

  lines.push("### 3) Luuku AI Opportunity Angles");
  heuristics.opportunities.forEach((item) => {
    lines.push(`- **${item.title}** — ${item.why}`);
  });
  lines.push("");

  lines.push("### 4) Recommended First Offer");
  lines.push(`- **Recommended offer:** ${heuristics.offer.name}`);
  lines.push(`- **Why:** ${heuristics.offer.why}\n`);

  lines.push("### 5) Outreach Hook");
  lines.push(
    `Luuku AI could approach **${input.business}** by offering to review how repetitive operational work, internal knowledge access, and workflow coordination are currently handled, then propose a practical AI solution that reduces staff time, improves response speed, and makes business knowledge easier to access.\n`
  );

  lines.push("### 6) Unknowns / What to Validate");
  heuristics.readinessUnknowns.forEach((item) => lines.push(`- ${item}`));
  if (input.notes) {
    lines.push(`- Input notes provided: ${input.notes}`);
  }
  lines.push("");

  lines.push("### 7) Prospect Score");
  lines.push(`- **AI need / pain intensity:** ${score.aiNeed}/10`);
  lines.push(
    `- **Workflow automation potential:** ${score.workflowPotential}/10`
  );
  lines.push(`- **Knowledge assistant fit:** ${score.knowledgeFit}/10`);
  lines.push(
    `- **Outreach attractiveness:** ${score.outreachAttractiveness}/10`
  );
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

  lines.push("### Research Mode Note");
  lines.push(
    "- This response was generated in **fallback mode** using Luuku AI research heuristics, prospect scoring logic, and offer-matching rules."
  );

  return lines.join("\n");
}

function buildPrompt(input: ResearchInput) {
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

Rules:
- Be practical, not fluffy.
- Focus on AI workflow automation, internal knowledge assistants, reporting copilots, support automation, and operational coordination use cases.
- The Recommended First Offer should be a single best Luuku AI wedge, not a vague transformation pitch.
- Prospect Score must include:
  - AI need / pain intensity
  - Workflow automation potential
  - Knowledge assistant fit
  - Outreach attractiveness
  - Overall Luuku Fit Score
- Research Tags should be concise, reusable pipeline tags like:
  high-support-volume, internal-knowledge-fit, workflow-automation-fit, enterprise-target
- Outreach Readiness must say either "Ready now" or "Needs validation first" and explain why.
- Immediate Next Research Action must be concrete and operational.
- Make the output useful for a founder doing prospect research in Rwanda / Africa, not a generic consultant memo.

Prospect input:
- Business: ${input.business}
- Sector: ${input.sector}
- Region: ${input.region}
- Research goal: ${input.researchGoal}
- Extra notes: ${input.notes || "none"}
`.trim();
}

async function getOpenAIResearch(input: ResearchInput) {
  if (!openai) {
    throw new Error("Missing OpenAI client");
  }

  const response = await openai.responses.create({
    model: config.openaiModel || "gpt-4.1-mini",
    input: buildPrompt(input),
  });

  return response.output_text?.trim() || "";
}

async function run() {
  const inputData = await collectResearchInput();

  console.log("\nThinking...\n");

  let outputText = "";
  let mode: "openai" | "fallback" = "fallback";

  try {
    outputText = await getOpenAIResearch(inputData);

    if (!outputText) {
      throw new Error("Empty OpenAI response");
    }

    mode = "openai";
  } catch (error) {
    console.error("OpenAI unavailable. Switching to fallback mode...\n");
    outputText = buildFallbackResearch(inputData);
    mode = "fallback";
  }

  console.log(outputText);

  const businessSlug = sanitizeFileName(inputData.business || "prospect");
  const logContent =
    `${outputText}\n\n---\n` +
    `Generated at: ${new Date().toISOString()}\n` +
    `Mode: ${mode}\n`;

  const logPath = saveLog(`research-${businessSlug}`, logContent);
  console.log(`\nLog saved to: ${logPath}`);
}

run().catch((error) => {
  console.error("Research agent failed:", error);
});