import {
    discordBinding,
    resolveDiscordSpaceBinding,
} from "../discord-space-binding";
import { CommunicationSpace } from "../department-space";

const researchSpace: CommunicationSpace = {
    id: "research",
    name: "Research",
    department: "research",
    kind: "department",
    members: ["lex", "research-agent"],
    bindings: [
        discordBinding("discord-research-001", "#research"),
    ],
};

const financeSpace: CommunicationSpace = {
    id: "finance",
    name: "Finance",
    department: "finance",
    kind: "restricted",
    members: ["lex", "finance-agent"],
    bindings: [],
};

const researchBinding = resolveDiscordSpaceBinding(researchSpace);
const financeBinding = resolveDiscordSpaceBinding(financeSpace);

console.log("");
console.log("========================================");
console.log("     DISCORD SPACE BINDING TEST");
console.log("========================================");
console.log("");
console.log(
    `Research Discord channel : ${researchBinding?.channelId ?? "none"}`,
);
console.log(
    `Research channel name    : ${researchBinding?.channelName ?? "none"}`,
);
console.log(
    `Finance Discord channel  : ${financeBinding?.channelId ?? "none"}`,
);

if (
    researchBinding?.spaceId !== "research" ||
    researchBinding.channelId !== "discord-research-001" ||
    researchBinding.channelName !== "#research" ||
    financeBinding !== undefined
) {
    throw new Error("Discord space binding resolution failed");
}

console.log("");
console.log(
    "GREEN: Discord is resolved as a channel binding without becoming the source of truth.",
);
