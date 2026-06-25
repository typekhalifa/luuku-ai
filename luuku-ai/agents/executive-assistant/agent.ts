import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";
import { config } from "../../shared/config/env";

const SYSTEM_PROMPT = `
You are the Executive Assistant Agent of Luuku AI.

Your role is to help the founder manage priorities, tasks, schedules, and daily execution.

Responsibilities:
- organize tasks by urgency, importance, and strategic value
- create realistic daily plans
- identify what must be done today versus what can wait
- suggest next actions
- reduce overwhelm by turning chaos into structure

Rules:
1. Prioritize high-impact business work first.
2. Separate urgent tasks from strategic tasks.
3. Recommend a realistic execution order.
4. Flag overload if too many tasks are assigned for one day.
5. Keep the output practical, concise, and useful.
6. Optimize for founder execution, not generic motivational advice.
7. Use markdown formatting for readability.
8. Use founder profile context and recent work history when making recommendations.

Return answers in this exact structure:

## Recent Execution Snapshot
A short recap of what was recently done, carried, or blocked.

## Founder Focus of the Day
A one-line summary of what matters most today.

## Priority Summary
- Top 3 priorities
- Urgent tasks
- Strategic tasks

## Suggested Plan
Provide a realistic order for the day.

## Carryover Decision
- Do today
- Carry to tomorrow
- Optional / later

## Risks / Notes
Mention overload, blockers, missing information, or unclear tasks.

## Next Best Actions
Give immediate next steps the founder should take.
`;

const client = new OpenAI({
  apiKey: config.openaiApiKey,
});

type AgentMode = "openai" | "fallback";
type TaskStatus = "DONE" | "CARRY" | "BLOCKED" | "DROPPED";

type ExecutionItem = {
  status: TaskStatus;
  task: string;
  note?: string;
};

function parseTasks(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-*]\s*/, ""));
}

function normalizeTask(task: string): string {
  return task.toLowerCase().replace(/\s+/g, " ").trim();
}

function scoreTask(task: string): number {
  const text = task.toLowerCase();
  let score = 0;

  // Tier 1: revenue / positioning / clients / outreach / offers / traction
  if (
    text.includes("positioning") ||
    text.includes("outreach") ||
    text.includes("offer") ||
    text.includes("client") ||
    text.includes("lead") ||
    text.includes("proposal") ||
    text.includes("follow up") ||
    text.includes("follow-up") ||
    text.includes("revenue") ||
    text.includes("businesses") ||
    text.includes("prospect") ||
    text.includes("sales") ||
    text.includes("service")
  ) {
    score += 10;
  }

  // Tier 2: internal strategic systems / company assets
  if (
    text.includes("luuku ai") ||
    text.includes("roadmap") ||
    text.includes("vision") ||
    text.includes("research agent") ||
    text.includes("architecture") ||
    text.includes("automation") ||
    text.includes("internal system") ||
    text.includes("agent")
  ) {
    score += 6;
  }

  // Tier 3: learning / study
  if (
    text.includes("study") ||
    text.includes("learn") ||
    text.includes("read") ||
    text.includes("rag") ||
    text.includes("evaluation")
  ) {
    score += 3;
  }

  // Tier 4: planning / admin
  if (
    text.includes("plan") ||
    text.includes("schedule") ||
    text.includes("organize") ||
    text.includes("tomorrow")
  ) {
    score += 1;
  }

  return score;
}

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

function loadFounderProfile(): string {
  const profilePath = path.resolve(process.cwd(), "data", "founder-profile.md");

  if (!fs.existsSync(profilePath)) {
    return "Founder profile not found.";
  }

  return fs.readFileSync(profilePath, "utf-8");
}

function loadRecentLogs(limit = 5): string {
  const logsDir = path.resolve(process.cwd(), "logs");

  if (!fs.existsSync(logsDir)) {
    return "No previous logs found.";
  }

  const files = fs
    .readdirSync(logsDir)
    .filter((file) => file.endsWith(".md"))
    .sort()
    .reverse()
    .slice(0, limit);

  if (files.length === 0) {
    return "No previous logs found.";
  }

  const contents = files.map((file) => {
    const filePath = path.join(logsDir, file);
    const content = fs.readFileSync(filePath, "utf-8");
    return `# Log File: ${file}\n${content}`;
  });

  return contents.join("\n\n---\n\n");
}

function detectRecurringBuckets(recentLogs: string): string[] {
  const text = recentLogs.toLowerCase();

  const clientTractionSignals = [
    "positioning",
    "outreach",
    "proposal",
    "offer",
    "client",
    "businesses",
    "research",
  ];

  const internalSystemSignals = [
    "roadmap",
    "agent",
    "architecture",
    "internal system",
    "automation",
  ];

  const found: string[] = [];

  const clientHits = clientTractionSignals.reduce((count, signal) => {
    return count + ((text.match(new RegExp(signal, "g")) || []).length);
  }, 0);

  const internalHits = internalSystemSignals.reduce((count, signal) => {
    return count + ((text.match(new RegExp(signal, "g")) || []).length);
  }, 0);

  if (clientHits >= 3) found.push("client traction");
  if (internalHits >= 3) found.push("internal systems");

  return found;
}

function buildFounderFocus(top3: string[]): string {
  const joined = top3.join(" ").toLowerCase();

  if (
    joined.includes("positioning") ||
    joined.includes("businesses") ||
    joined.includes("outreach") ||
    joined.includes("offer")
  ) {
    return "Push Luuku AI toward client-facing traction by clarifying the offer, identifying real prospects, and moving closer to outreach.";
  }

  if (joined.includes("agent") || joined.includes("architecture")) {
    return "Strengthen Luuku AI’s internal operating system while keeping the work tied to real business needs.";
  }

  return "Focus on the highest-leverage work first and reduce context switching.";
}

function parseExecutionFromLogs(recentLogs: string): ExecutionItem[] {
  const lines = recentLogs.split("\n").map((l) => l.trim());
  const executionItems: ExecutionItem[] = [];

  for (const line of lines) {
    const match = line.match(
      /^-\s*(DONE|CARRY|BLOCKED|DROPPED)\s*:\s*([^|]+?)(?:\s*\|\s*(.+))?$/i
    );

    if (match) {
      executionItems.push({
        status: match[1].toUpperCase() as TaskStatus,
        task: match[2].trim(),
        note: match[3]?.trim(),
      });
    }
  }

  return executionItems;
}

function summarizeExecutionPatterns(recentLogs: string) {
  const items = parseExecutionFromLogs(recentLogs);

  const carryCountByTask = new Map<string, number>();
  const blockedTasks = new Map<string, string | undefined>();
  const doneTasks = new Set<string>();

  // walk from oldest -> newest so newer blocked notes overwrite older ones
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    const key = normalizeTask(item.task);

    if (item.status === "CARRY") {
      carryCountByTask.set(key, (carryCountByTask.get(key) || 0) + 1);
    }

    if (item.status === "BLOCKED") {
      // always prefer the most recent blocked note if present
      const existing = blockedTasks.get(key);
      if (!existing || item.note) {
        blockedTasks.set(key, item.note);
      }
    }

    if (item.status === "DONE") {
      doneTasks.add(key);
    }
  }

  const repeatedlyCarried = Array.from(carryCountByTask.entries())
    .filter(([, count]) => count >= 2)
    .map(([task]) => task);

  return {
    repeatedlyCarried,
    blockedTasks,
    doneTasks,
    items,
  };
}

function buildExecutionSnapshot(recentLogs: string): string {
  const items = parseExecutionFromLogs(recentLogs);
  if (items.length === 0) {
    return "No recent execution updates found yet.";
  }

  // Prefer most recent entries because logs are loaded newest-first
  const latestDone = items.find((item) => item.status === "DONE");
  const latestCarry = items.find((item) => item.status === "CARRY");

  // Prefer the most recent BLOCKED entry WITH a note; if none, use the latest blocked
  const latestBlockedWithNote = items.find(
    (item) => item.status === "BLOCKED" && item.note
  );
  const latestBlocked = latestBlockedWithNote ?? items.find((item) => item.status === "BLOCKED");

  const lines: string[] = [];

  if (latestDone) {
    lines.push(`- Last completed: **${latestDone.task}**`);
  }

  if (latestCarry) {
    lines.push(`- Carried forward: **${latestCarry.task}**`);
  }

  if (latestBlocked) {
    if (latestBlocked.note) {
      lines.push(
        `- Blocked recently: **${latestBlocked.task}** — ${latestBlocked.note}`
      );
    } else {
      lines.push(`- Blocked recently: **${latestBlocked.task}**`);
    }
  }

  return lines.length > 0 ? lines.join("\n") : "No recent execution updates found yet.";
}

function matchExecutionReality(currentTasks: string[], recentLogs: string): string[] {
  const patterns = summarizeExecutionPatterns(recentLogs);
  const notes: string[] = [];

  for (const task of currentTasks) {
    const normalized = normalizeTask(task);

    if (patterns.repeatedlyCarried.includes(normalized)) {
      notes.push(
        `- **Execution reality:** "${task}" has been carried multiple times. Either reduce its scope or give it a protected execution block.`
      );
    }

    if (patterns.blockedTasks.has(normalized)) {
      const blocker = patterns.blockedTasks.get(normalized);
      if (blocker) {
        notes.push(
          `- **Execution reality:** "${task}" was previously blocked. Known blocker: ${blocker}`
        );
      } else {
        notes.push(
          `- **Execution reality:** "${task}" was previously blocked. Identify the blocker before keeping it in today's top priorities.`
        );
      }
    }
  }

  return Array.from(new Set(notes));
}

function buildFallbackPlan(
  tasksRaw: string,
  founderProfile: string,
  recentLogs: string
): string {
  const tasks = parseTasks(tasksRaw);

  if (tasks.length === 0) {
    return `## Recent Execution Snapshot
No recent execution updates found yet.

## Founder Focus of the Day
No founder focus available because no tasks were entered.

## Priority Summary
- No tasks provided
- Urgent tasks: none
- Strategic tasks: none

## Suggested Plan
Add a list of tasks so the Executive Assistant can structure the day.

## Carryover Decision
**Do today**
- none

**Carry to tomorrow**
- none

**Optional / later**
- none

## Risks / Notes
- No tasks were entered, so no prioritization can be done.

## Next Best Actions
- Write today's tasks as bullet points and run the assistant again.`;
  }

  const ranked = [...tasks].sort((a, b) => scoreTask(b) - scoreTask(a));
  const top3 = ranked.slice(0, 3);
  const urgent = ranked.slice(0, Math.min(2, ranked.length));
  const strategic = ranked.filter((t) => scoreTask(t) >= 8).slice(0, 5);

  const doToday = ranked.slice(0, Math.min(3, ranked.length));
  const carryToTomorrow = ranked.slice(3, Math.min(6, ranked.length));
  const optionalLater = ranked.slice(6);

  const overload = tasks.length > 4;
  const suggestedOrder = ranked.map((task, index) => `${index + 1}. ${task}`);

  const nextActions = [
    top3[0] ? `Start with: ${top3[0]}` : null,
    top3[1] ? `Then move to: ${top3[1]}` : null,
    carryToTomorrow.length > 0
      ? `Protect execution quality by moving ${carryToTomorrow.length} lower-priority item(s) into tomorrow instead of forcing them into today.`
      : `Finish the top priorities before switching into lower-value tasks.`,
  ].filter(Boolean) as string[];

  const recurringBuckets = detectRecurringBuckets(recentLogs);

  const recurringNotes =
    recurringBuckets.length > 0
      ? recurringBuckets
          .map((bucket) => {
            if (bucket === "client traction") {
              return "- Recurring unfinished **client traction** work detected (positioning / research / outreach / offers). Close one concrete client-facing loop before opening more threads.";
            }

            if (bucket === "internal systems") {
              return "- Recurring unfinished **internal systems** work detected (roadmap / agent / architecture work). Keep it in service of go-to-market progress rather than letting it replace traction work.";
            }

            return "";
          })
          .filter(Boolean)
          .join("\n")
      : "- No strong recurring unfinished clusters detected from recent logs.";

  const combinedMemory = `${founderProfile}\n${recentLogs}`.toLowerCase();
  let founderContextNote =
    "- Founder context loaded: prioritize business traction, company positioning, client opportunity creation, and strategic systems work over low-value busywork.";

  if (combinedMemory.includes("positioning") || combinedMemory.includes("outreach")) {
    founderContextNote =
      "- Founder context + recent logs suggest Luuku AI positioning and client-facing traction work should stay near the top until they are clearly advanced.";
  }

  const executionRealityNotes = matchExecutionReality(tasks, recentLogs);
  const founderFocus = buildFounderFocus(top3);
  const executionSnapshot = buildExecutionSnapshot(recentLogs);

  return `## Recent Execution Snapshot
${executionSnapshot}

## Founder Focus of the Day
${founderFocus}

## Priority Summary
**Top 3 priorities**
${top3.map((t) => `- ${t}`).join("\n")}

**Urgent tasks**
${urgent.map((t) => `- ${t}`).join("\n")}

**Strategic tasks**
${
  strategic.length > 0
    ? strategic.map((t) => `- ${t}`).join("\n")
    : "- No clearly strategic tasks detected from the current list."
}

## Suggested Plan
${suggestedOrder.join("\n")}

## Carryover Decision
**Do today**
${doToday.map((t) => `- ${t}`).join("\n") || "- none"}

**Carry to tomorrow**
${
  carryToTomorrow.length > 0
    ? carryToTomorrow.map((t) => `- ${t}`).join("\n")
    : "- none"
}

**Optional / later**
${
  optionalLater.length > 0
    ? optionalLater.map((t) => `- ${t}`).join("\n")
    : "- none"
}

## Risks / Notes
- ${
    overload
      ? "Your task list is overloaded for a single day. Focus on the Do today list and protect execution quality."
      : "Task load looks manageable if you stay disciplined about the ranked order."
  }
${founderContextNote}
${recurringNotes}
${
  executionRealityNotes.length > 0
    ? executionRealityNotes.join("\n")
    : "- No major execution-pattern warnings detected from recent status updates."
}
- This response was generated in **fallback mode** with founder profile + recent log awareness.

## Next Best Actions
${nextActions.map((a) => `- ${a}`).join("\n")}`;
}

async function getExecutiveAssistantResponse(
  tasks: string,
  founderProfile: string,
  recentLogs: string
) {
  if (!config.openaiApiKey) {
    throw new Error(
      "Missing OPENAI_API_KEY. Add it to your .env file in the project root."
    );
  }

  const userPrompt = `
## Founder Profile
${founderProfile}

---

## Recent Logs / Recent Work Context
${recentLogs}

---

## Founder Tasks / Priorities For Today
${tasks}
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

function saveRunLog(
  mode: AgentMode,
  tasks: string,
  outputText: string,
  founderProfileUsed: boolean,
  recentLogsUsed: boolean,
  executionUpdate: string
) {
  const logsDir = ensureLogsDir();
  const timestamp = makeTimestamp();

  const content = `# Luuku AI Executive Assistant Log

**Timestamp:** ${timestamp.iso}  
**Mode:** ${mode}  
**Founder Profile Used:** ${founderProfileUsed ? "yes" : "no"}  
**Recent Logs Used:** ${recentLogsUsed ? "yes" : "no"}

---

## Input Tasks
${tasks}

---

## Assistant Output
${outputText}

---

## Execution Update
${executionUpdate || "No execution update provided."}
`;

  const filePath = path.join(logsDir, `ea-${timestamp.fileSafe}.md`);
  fs.writeFileSync(filePath, content, "utf-8");

  return filePath;
}

async function collectMultilineTasks(prompt: string, doneWord = "DONE"): Promise<string> {
  console.log(`${prompt}\nWhen you're done, type ${doneWord} on its own line and press Enter.\n`);

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

        if (line.toUpperCase() === doneWord.toUpperCase()) {
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

function parseExecutionUpdate(raw: string): ExecutionItem[] {
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const items: ExecutionItem[] = [];

  for (const line of lines) {
    const match = line.match(
      /^(DONE|CARRY|BLOCKED|DROPPED)\s*:\s*([^|]+?)(?:\s*\|\s*(.+))?$/i
    );
    if (!match) continue;

    items.push({
      status: match[1].toUpperCase() as TaskStatus,
      task: match[2].trim(),
      note: match[3]?.trim(),
    });
  }

  return items;
}

function formatExecutionUpdate(items: ExecutionItem[]): string {
  if (items.length === 0) {
    return "No execution update provided.";
  }

  return items
    .map((item) => {
      if (item.note) {
        return `- ${item.status}: ${item.task} | ${item.note}`;
      }
      return `- ${item.status}: ${item.task}`;
    })
    .join("\n");
}

async function run() {
  console.log("=== Luuku AI Executive Assistant v0.6.2 ===");
  const tasks = await collectMultilineTasks(
    "Paste today's tasks / priorities, one per line."
  );

  console.log("\nThinking...\n");

  const founderProfile = loadFounderProfile();
  const recentLogs = loadRecentLogs(5);

  let finalOutput = "";
  let mode: AgentMode = "fallback";

  try {
    finalOutput = await getExecutiveAssistantResponse(
      tasks,
      founderProfile,
      recentLogs
    );
    mode = "openai";
    console.log(finalOutput);
  } catch (error) {
    console.error("OpenAI unavailable. Switching to fallback mode...\n");
    finalOutput = buildFallbackPlan(tasks, founderProfile, recentLogs);
    mode = "fallback";
    console.log(finalOutput);
  }

  console.log("\n=== Execution Update ===");
  console.log(
    "Now mark outcomes using lines like:\nDONE: task\nCARRY: task\nBLOCKED: task | blocker note\nDROPPED: task\n"
  );

  const executionRaw = await collectMultilineTasks(
    "Paste execution updates, one per line.",
    "END"
  );

  const executionItems = parseExecutionUpdate(executionRaw);
  const formattedExecution = formatExecutionUpdate(executionItems);

  const logPath = saveRunLog(
    mode,
    tasks,
    finalOutput,
    founderProfile !== "Founder profile not found.",
    recentLogs !== "No previous logs found.",
    formattedExecution
  );

  console.log("\nExecution update saved.");
  console.log(`Log saved to: ${logPath}`);
}

run().catch((err) => {
  console.error("Unexpected error:", err);
});