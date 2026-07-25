import type {

  LuukuTool,

} from "../types/tool";

const tools: LuukuTool[] = [

  {
    id: "browser",
    name: "Browser",
    category: "Research",
    enabled: true,
  },

  {
    id: "search",
    name: "Google Search",
    category: "Research",
    enabled: true,
  },

  {
    id: "gmail",
    name: "Gmail",
    category: "Communication",
    enabled: false,
  },

  {
    id: "whatsapp",
    name: "WhatsApp",
    category: "Communication",
    enabled: false,
  },

  {
    id: "voice",
    name: "Voice Calling",
    category: "Communication",
    enabled: false,
  },

  {
    id: "crm",
    name: "CRM",
    category: "Business",
    enabled: true,
  },

  {
    id: "calendar",
    name: "Calendar",
    category: "Business",
    enabled: false,
  },

  {
    id: "rag",
    name: "Knowledge Base",
    category: "Memory",
    enabled: false,
  },

];

export function getTools() {

  return tools;

}