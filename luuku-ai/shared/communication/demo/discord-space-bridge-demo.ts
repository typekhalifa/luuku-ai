import {
    CommunicationSpace,
} from "../department-space";
import {
    normalizeDiscordInboundToSpace,
    resolveDiscordSpace,
    discordRecipientForSpace,
} from "../discord-space-bridge";

const spaces: CommunicationSpace[] = [
    {
        id: "research",
        name: "Research",
        department: "research",
        kind: "department",
        members: ["research-agent"],
        bindings: [
            {
                channel: "discord",
                externalId: "discord-research-001",
                name: "#research",
            },
        ],
    },
    {
        id: "finance",
        name: "Finance",
        department: "finance",
        kind: "restricted",
        members: ["finance-agent", "lex"],
        bindings: [],
    },
];

console.log("");
console.log("========================================");
console.log("      DISCORD SPACE BRIDGE TEST");
console.log("========================================");
console.log("");

const resolved = resolveDiscordSpace(
    spaces,
    "discord-research-001",
);

console.log(
    `Discord channel → space : ${resolved?.space.id ?? "none"}`,
);

const inbound = normalizeDiscordInboundToSpace(
    spaces,
    {
        channel: "discord",
        sender: {
            channel: "discord",
            externalId: "founder-001",
            displayName: "Founder",
        },
        content: "Research this prospect.",
        metadata: {
            discordChannelId: "discord-research-001",
        },
    },
);

console.log(
    `Inbound space resolved   : ${inbound.spaceId ?? "none"}`,
);

const outbound = discordRecipientForSpace(
    spaces[0],
    {
        channel: "discord",
        externalId: "founder-001",
        displayName: "Founder",
    },
);

console.log(
    `Outbound Discord channel : ${outbound.recipient.externalId ?? "none"}`,
);
console.log(
    `Finance binding          : ${resolveDiscordSpace(spaces, "finance-001")?.space.id ?? "none"}`,
);

if (
    resolved?.space.id !== "research" ||
    inbound.spaceId !== "research" ||
    outbound.recipient.externalId !== "discord-research-001" ||
    resolveDiscordSpace(spaces, "finance-001") !== undefined
) {
    throw new Error("Discord space bridge regression detected.");
}

console.log("");
console.log(
    "GREEN: Discord messages resolve through CommunicationSpace without making Discord the source of truth.",
);
