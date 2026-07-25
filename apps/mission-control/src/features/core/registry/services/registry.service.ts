import type {

  LuukuAgent,

} from "../types/agent";

const agents: LuukuAgent[] = [

  {

    id: "research",

    name: "Research AI",

    role: "Market Intelligence",

    status: "running",

    capabilities: [

      "Search",

      "Browser",

      "Scraping",

    ],

  },

  {

    id: "sales",

    name: "Sales AI",

    role: "Sales Automation",

    status: "idle",

    capabilities: [

      "CRM",

      "Email",

      "Lead Scoring",

    ],

  },

  {

    id: "executive",

    name: "Executive AI",

    role: "CEO Assistant",

    status: "running",

    capabilities: [

      "Planning",

      "Reporting",

      "Decision Support",

    ],

  },

];

export function getRegistry() {

  return agents;

}