import fs from "fs";
import path from "path";

const KNOWLEDGE_DIR = path.join(process.cwd(), "luuku-ai", "knowledge");

function loadJson(folder: string, file: string) {
  const fullPath = path.join(KNOWLEDGE_DIR, folder, `${file}.json`);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

function loadMarkdown(folder: string, file: string) {
  const fullPath = path.join(KNOWLEDGE_DIR, folder, `${file}.md`);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  return fs.readFileSync(fullPath, "utf8");
}

export function loadIndustry(name: string) {
  return loadJson("industries", name.toLowerCase());
}

export function loadOffer(name: string) {
  return loadJson("offers", name.toLowerCase());
}

export function loadProspect(name: string) {
  return loadJson("prospects", name.toLowerCase());
}

export function loadPlaybook(name: string) {
  return loadMarkdown("playbooks", name.toLowerCase());
}

export function loadTemplate(name: string) {
  return loadMarkdown("templates", name.toLowerCase());
}

export function loadPrompt(name: string) {
  return loadMarkdown("prompts", name.toLowerCase());
}