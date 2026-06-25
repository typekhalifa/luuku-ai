import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";
import { config } from "../../shared/config/env";

const SYSTEM_PROMPT = `
You are the Research Agent of Luuku AI.

Your job is to analyze a target business or organization and identify where Luuku AI could help with AI systems architecture, internal AI assistants, and workflow automation.

Rules:
1. Be practical and commercially useful.
2. Focus on operational pain points, internal knowledge problems, repetitive workflows, and customer-facing bottlenecks.
3. Suggest realistic Luuku AI opportunity angles, not fantasy transformations.
4. Prefer concrete business usefulness over generic AI hype.
5. Keep the output structured and readable.
6. If information is missing, make reasonable hypotheses but clearly label them as likely assumptions.
7. Optimize for founder action and outreach preparation.

Return answers in this exact structure:

## Research Brief

### 1) Business Snapshot
- what the business likely does
- who it serves
- any useful context from the input

### 2) Likely Operational Pain Points
- likely bottlenecks, repetitive work, knowledge gaps, coordination issues, support load, reporting pain, etc.

### 3) Luuku AI Opportunity Angles
- where Luuku AI could help
- possible AI assistant / workflow automation / internal knowledge use cases

### 4) Recommended First Offer
Pick the best first Luuku AI offer to pitch:
- AI Workflow Audit
- AI Knowledge Assistant
- AI Workflow Automation Stack

Explain why.

### 5) Outreach Hook
Write a short practical outreach angle Luuku AI could use when approaching this business.

### 6) Unknowns / What to Validate
List what Luuku AI still needs to learn before pitching confidently.
`;

const client = new OpenAI({
  apiKey: config.openaiApiKey,
});

type AgentMode = "openai" | "fallback";

type ResearchInput = {
  business: string;
  sector?: string;
  region?: string;
  goal?: string;
  notes?: string[];
};

function ensureLogsDir() {
  const logsDir = path.resolve(process.cwd(), "logs");
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  return logsDir;
}

function makeTimestamp() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");

  return {
    iso: now.toISOString(),
    fileSafe: `${yyyy}-${mm}-${dd}_${hh}-${min}-${ss}`,
  };
}

function loadResearchProfile(): string {
  const profilePath = path.resolve(process.cwd(), "data", "research-agent-profile.md");

  if (!fs.existsSync(profilePath)) {
    return "Research profile not found.";
  }

  return fs.readFileSync(profilePath, "utf-8");
}

function parseResearchInput(raw: string): ResearchInput {
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const result: ResearchInput = {
    business: "",
    notes: [],
  };

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (lower.startsWith("business:")) {
      result.business = line.slice("business:".length).trim();
      continue;
    }

    if (lower.startsWith("sector:")) {
      result.sector = line.slice("sector:".length).trim();
      continue;
    }

    if (lower.startsWith("region:")) {
      result.region = line.slice("region:".length).trim();
      continue;
    }

    if (lower.startsWith("goal:")) {
      result.goal = line.slice("goal:".length).trim();
      continue;
    }

    result.notes?.push(line);
  }

  return result;
}

function buildFallbackResearch(input: ResearchInput, researchProfile: string): string {
  const business = input.business || "Unknown business";
  const sector = input.sector?.toLowerCase() || "";
  const goal = input.goal || "Identify Luuku AI opportunities";

  const painPoints: string[] = [];
  const opportunities: string[] = [];
  let recommendedOffer = "AI Workflow Audit";
  let offerReason =
    "An audit is the safest first offer when business operations are not yet deeply understood, because it helps Luuku AI map pain points, prioritize use cases, and create an implementation roadmap.";

  // sector-based heuristics
  if (
    sector.includes("bank") ||
    sector.includes("finance") ||
    sector.includes("fintech")
  ) {
    painPoints.push(
      "High volume of customer inquiries, service requests, and repetitive support questions."
    );
    painPoints.push(
      "Internal policy / compliance knowledge may be scattered across teams and documents."
    );
    painPoints.push(
      "Operational reporting, approvals, and follow-up workflows may create delays."
    );

    opportunities.push(
      "Internal AI knowledge assistant for staff to access policies, procedures, and operational guidance faster."
    );
    opportunities.push(
      "Workflow automation for customer inquiry routing, repetitive support tasks, and internal approvals."
    );
    opportunities.push(
      "Management / operations copilot for reporting summaries, recurring coordination tasks, and workflow monitoring."
    );

    recommendedOffer = "AI Knowledge Assistant";
    offerReason =
      "A knowledge assistant is a strong first angle for finance-related organizations because internal policies, procedures, and repetitive staff questions often create friction that AI can reduce quickly.";
  } else if (
    sector.includes("school") ||
    sector.includes("education") ||
    sector.includes("university") ||
    sector.includes("training")
  ) {
    painPoints.push(
      "Staff and students may repeatedly ask the same administrative or academic questions."
    );
    painPoints.push(
      "Policies, schedules, guidelines, and operational documents may be scattered across files and staff members."
    );
    painPoints.push(
      "Admissions, reporting, and internal coordination workflows may be slow and repetitive."
    );

    opportunities.push(
      "AI knowledge assistant for internal policies, academic procedures, and staff FAQs."
    );
    opportunities.push(
      "Workflow automation for inquiry handling, admissions-related follow-up, and reporting support."
    );
    opportunities.push(
      "Operations assistant for recurring coordination, reminders, and administrative follow-up."
    );

    recommendedOffer = "AI Knowledge Assistant";
    offerReason =
      "Education institutions often benefit quickly from an internal knowledge assistant because repeated questions, scattered documents, and administrative friction are common.";
  } else if (
    sector.includes("clinic") ||
    sector.includes("hospital") ||
    sector.includes("health")
  ) {
    painPoints.push(
      "Appointment coordination, service inquiries, and administrative follow-up may consume staff time."
    );
    painPoints.push(
      "Protocols, internal procedures, and service information may not be easily accessible to all staff."
    );
    painPoints.push(
      "Front-desk, reporting, and patient communication workflows may be repetitive."
    );

    opportunities.push(
      "AI service / FAQ assistant for common patient-facing inquiries."
    );
    opportunities.push(
      "Internal knowledge assistant for protocols, procedures, and admin guidance."
    );
    opportunities.push(
      "Workflow automation for appointment reminders, repetitive admin coordination, and reporting support."
    );

    recommendedOffer = "AI Workflow Automation Stack";
    offerReason =
      "Healthcare operations often contain repetitive admin workflows, appointment coordination, and staff information needs that make automation plus assistant support valuable.";
  } else if (
    sector.includes("logistics") ||
    sector.includes("transport") ||
    sector.includes("delivery")
  ) {
    painPoints.push(
      "Operational coordination, dispatch updates, customer follow-up, and reporting can become fragmented."
    );
    painPoints.push(
      "Teams may rely heavily on WhatsApp, calls, and manual coordination for recurring updates."
    );
    painPoints.push(
      "Internal operational knowledge and process clarity may be inconsistent."
    );

    opportunities.push(
      "Workflow automation for dispatch updates, internal follow-ups, and recurring coordination."
    );
    opportunities.push(
      "Customer update assistant for repetitive shipment / service inquiries."
    );
    opportunities.push(
      "Internal knowledge assistant for SOPs, operational processes, and reporting guidance."
    );

    recommendedOffer = "AI Workflow Automation Stack";
    offerReason =
      "Logistics and transport businesses often suffer from repetitive coordination work, fragmented updates, and follow-up overload, making workflow automation a strong first offer.";
  } else if (
    sector.includes("ngo") ||
    sector.includes("nonprofit") ||
    sector.includes("foundation")
  ) {
    painPoints.push(
      "Reporting, proposal support, knowledge access, and cross-team coordination may be time-consuming."
    );
    painPoints.push(
      "Institutional knowledge may be buried in documents, donor reports, and staff memory."
    );
    painPoints.push(
      "Operations and program teams may repeat the same administrative and information tasks."
    );

    opportunities.push(
      "Internal knowledge assistant for proposals, reports, policies, and SOPs."
    );
    opportunities.push(
      "Workflow automation for recurring reporting support, follow-up, and admin coordination."
    );
    opportunities.push(
      "Operations assistant for internal process guidance and document retrieval."
    );

    recommendedOffer = "AI Knowledge Assistant";
    offerReason =
      "NGOs often have heavy document-based workflows and repeated knowledge retrieval needs, which makes a knowledge assistant a strong first offer.";
  } else {
    painPoints.push(
      "The business may have repetitive administrative work, scattered internal knowledge, and slow coordination workflows."
    );
    painPoints.push(
      "Customer support or internal operations may depend too much on manual follow-up."
    );
    painPoints.push(
      "Important information may live across documents, messages, and staff memory rather than in an accessible system."
    );

    opportunities.push(
      "AI workflow audit to identify the highest-value automation opportunities."
    );
    opportunities.push(
      "Internal knowledge assistant if the business depends on many documents, SOPs, or repeated staff questions."
    );
    opportunities.push(
      "Workflow automation stack if recurring requests, approvals, follow-ups, or support tasks are major pain points."
    );
  }

  const notesText =
    input.notes && input.notes.length > 0
      ? input.notes.map((n) => `- ${n}`).join("\n")
      : "- No additional notes provided.";

  return `## Research Brief

### 1) Business Snapshot
- **Business:** ${business}
- **Sector:** ${input.sector || "Not specified"}
- **Region:** ${input.region || "Not specified"}
- **Research goal:** ${goal}
- This brief is a **founder-side research hypothesis** based on the information currently provided, not a fully validated field assessment.

### 2) Likely Operational Pain Points
${painPoints.map((item) => `- ${item}`).join("\n")}

### 3) Luuku AI Opportunity Angles
${opportunities.map((item) => `- ${item}`).join("\n")}

### 4) Recommended First Offer
- **Recommended offer:** ${recommendedOffer}
- **Why:** ${offerReason}

### 5) Outreach Hook
Luuku AI could approach **${business}** by offering to review how repetitive operational work, internal knowledge access, and workflow coordination are currently handled, then propose a practical AI solution that reduces staff time, improves response speed, and makes business knowledge easier to access.

### 6) Unknowns / What to Validate
- What tools the organization currently uses for communication, reporting, and knowledge storage.
- Which workflows are most repetitive, slow, or frustrating for staff.
- Whether the business has strong internal documentation that could power a knowledge assistant.
- Who inside the organization owns operations, digital transformation, or process improvement decisions.
- Whether the strongest pain point is customer-facing support, internal knowledge access, or back-office workflow coordination.

### Input Notes
${notesText}

### Research Mode Note
- This response was generated in **fallback mode** using Luuku AI research heuristics and offer-matching logic.`;
}

async function getResearchResponse(input: ResearchInput, researchProfile: string) {
  if (!config.openaiApiKey) {
    throw new Error("Missing OPENAI_API_KEY. Add it to your .env file.");
  }

  const userPrompt = `
## Luuku AI Research Agent Profile
${researchProfile}

---

## Target Business Input
Business: ${input.business || "Not provided"}
Sector: ${input.sector || "Not provided"}
Region: ${input.region || "Not provided"}
Goal: ${input.goal || "Not provided"}

Additional Notes:
${input.notes && input.notes.length > 0 ? input.notes.map((n) => `- ${n}`).join("\n") : "- none"}
`;

  const response = await client.responses.create({
    model: config.openaiModel,
    input: [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
  });

  return response.output_text;
}

function saveResearchLog(
  mode: AgentMode,
  rawInput: string,
  outputText: string,
  profileUsed: boolean
) {
  const logsDir = ensureLogsDir();
  const timestamp = makeTimestamp();

  const content = `# Luuku AI Research Agent Log

**Timestamp:** ${timestamp.iso}  
**Mode:** ${mode}  
**Research Profile Used:** ${profileUsed ? "yes" : "no"}

---

## Raw Input
${rawInput}

---

## Research Output
${outputText}
`;

  const filePath = path.join(logsDir, `research-${timestamp.fileSafe}.md`);
  fs.writeFileSync(filePath, content, "utf-8");
  return filePath;
}

async function collectMultilineInput(): Promise<string> {
  console.log(
    "Paste research input lines like:\nBusiness: ...\nSector: ...\nRegion: ...\nGoal: ...\nWhen done, type DONE on its own line.\n"
  );

  return new Promise((resolve) => {
    const lines: string[] = [];
    let buffer = "";

    process.stdin.setEncoding("utf8");
    process.stdin.resume();

    const onData = (chunk: string) => {
      buffer += chunk;

      const parts = buffer.split(/\r?\n/);
      buffer = parts.pop() ?? "";

      for (const rawLine of parts) {
        const line = rawLine.trim();

        if (line.toUpperCase() === "DONE") {
          process.stdin.off("data", onData);
          process.stdin.pause();
          resolve(lines.join("\n"));
          return;
        }

        if (line.length > 0) {
          lines.push(line);
        }
      }
    };

    process.stdin.on("data", onData);
  });
}

async function run() {
  console.log("=== Luuku AI Research Agent v0.7 ===");

  const rawInput = await collectMultilineInput();
  const parsed = parseResearchInput(rawInput);
  const researchProfile = loadResearchProfile();

  if (!parsed.business) {
    console.log("Missing required field: Business");
    return;
  }

  console.log("\nResearching...\n");

  let finalOutput = "";
  let mode: AgentMode = "fallback";

  try {
    finalOutput = await getResearchResponse(parsed, researchProfile);
    mode = "openai";
    console.log(finalOutput);
  } catch (error) {
    console.error("OpenAI unavailable. Switching to fallback mode...\n");
    finalOutput = buildFallbackResearch(parsed, researchProfile);
    mode = "fallback";
    console.log(finalOutput);
  } finally {
    const logPath = saveResearchLog(
      mode,
      rawInput,
      finalOutput,
      researchProfile !== "Research profile not found."
    );

    console.log(`\nLog saved to: ${logPath}`);
  }
}

run().catch((err) => {
  console.error("Unexpected error:", err);
});