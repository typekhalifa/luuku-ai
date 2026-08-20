import { PrismaClient } from "@prisma/client";

import { prisma } from "../database/client";
import { CommunicationChannel, ChannelIdentity } from "./channel";

export type IdentityResolutionStatus =
    | "resolved"
    | "unresolved"
    | "ambiguous";

export type IdentityResolutionMethod =
    | "channel-external-id"
    | "email"
    | "phone"
    | "conversation-participant"
    | "none";

export interface IdentityResolutionInput {
    channel?: CommunicationChannel;
    externalId?: string;
    email?: string;
    phoneNumber?: string;
    conversationId?: string;
}

export interface IdentityResolutionResult {
    status: IdentityResolutionStatus;
    method: IdentityResolutionMethod;
    confidence: number;
    contactId?: string;
    companyId?: string;
    conversationId?: string;
    matchedIdentities: ChannelIdentity[];
    requiresReview: boolean;
    reason: string;
}

function normalizeEmail(value?: string): string | undefined {
    const normalized = value?.trim().toLowerCase();
    return normalized || undefined;
}

function normalizePhone(value?: string): string | undefined {
    if (!value) {
        return undefined;
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return undefined;
    }

    const hasPlus = trimmed.startsWith("+");
    const digits = trimmed.replace(/\D/g, "");

    if (!digits) {
        return undefined;
    }

    return hasPlus ? `+${digits}` : digits;
}

function normalizeExternalId(value?: string): string | undefined {
    const normalized = value?.trim();
    return normalized || undefined;
}

function identityKey(identity: ChannelIdentity): string {
    return `${identity.channel}:${identity.externalId ?? ""}`;
}

function asChannelIdentity(value: unknown): ChannelIdentity | undefined {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return undefined;
    }

    const record = value as Record<string, unknown>;
    if (typeof record.channel !== "string") {
        return undefined;
    }

    return {
        channel: record.channel as CommunicationChannel,
        externalId:
            typeof record.externalId === "string"
                ? record.externalId
                : undefined,
        displayName:
            typeof record.displayName === "string"
                ? record.displayName
                : undefined,
    };
}

function participantIdentities(value: unknown): ChannelIdentity[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map(asChannelIdentity)
        .filter((identity): identity is ChannelIdentity => Boolean(identity));
}

function uniqueIds(ids: Array<string | undefined>): string[] {
    return [...new Set(ids.filter((id): id is string => Boolean(id)))];
}

export class CommunicationIdentityResolver {
    constructor(private readonly db: PrismaClient = prisma) {}

    async resolve(input: IdentityResolutionInput): Promise<IdentityResolutionResult> {
        const channel = input.channel;
        const externalId = normalizeExternalId(input.externalId);

        // A channel external id already carries enough information to select
        // the CRM identifier type for common outbound channels. This keeps
        // email addresses on the email path and phone numbers on the phone path
        // instead of requiring every caller to duplicate that mapping.
        const email = normalizeEmail(
            input.email || (channel === "email" ? externalId : undefined),
        );
        const phoneNumber = normalizePhone(
            input.phoneNumber ||
                (channel === "voice" || channel === "whatsapp"
                    ? externalId
                    : undefined),
        );

        if (channel && externalId) {
            const byChannel = await this.resolveByChannelIdentity(channel, externalId);
            if (byChannel) {
                return byChannel;
            }
        }

        const emailContactIds = email
            ? await this.contactIdsByEmail(email)
            : [];
        const phoneContactIds = phoneNumber
            ? await this.contactIdsByPhone(phoneNumber)
            : [];

        const emailAndPhoneIds = uniqueIds([
            ...emailContactIds,
            ...phoneContactIds,
        ]);

        if (emailAndPhoneIds.length > 1) {
            return {
                status: "ambiguous",
                method: "none",
                confidence: 0,
                matchedIdentities: [],
                requiresReview: true,
                reason:
                    "Email and phone identifiers resolve to different CRM contacts.",
            };
        }

        if (emailAndPhoneIds.length === 1) {
            const contactId = emailAndPhoneIds[0];
            const contact = await this.db.contact.findUnique({
                where: { id: contactId },
                select: { id: true, companyId: true, email: true, phoneNumber: true },
            });

            if (!contact) {
                return this.unresolved("CRM contact disappeared during resolution.");
            }

            return {
                status: "resolved",
                method: email ? "email" : "phone",
                confidence: email && phoneNumber && emailContactIds.length === 1 && phoneContactIds.length === 1
                    ? 100
                    : 95,
                contactId: contact.id,
                companyId: contact.companyId,
                matchedIdentities: this.contactIdentities(contact),
                requiresReview: false,
                reason: email && phoneNumber
                    ? "Email and phone identifiers resolve to the same CRM contact."
                    : "Exact CRM contact identifier match.",
            };
        }

        if (input.conversationId) {
            const conversation = await this.db.communicationConversation.findUnique({
                where: { id: input.conversationId },
                select: { id: true, participants: true },
            });

            if (conversation) {
                const identities = participantIdentities(conversation.participants);
                const contactIds = await this.resolveParticipantContacts(identities);

                if (contactIds.length === 1) {
                    const contact = await this.db.contact.findUnique({
                        where: { id: contactIds[0] },
                        select: { id: true, companyId: true, email: true, phoneNumber: true },
                    });

                    if (contact) {
                        return {
                            status: "resolved",
                            method: "conversation-participant",
                            confidence: 90,
                            contactId: contact.id,
                            companyId: contact.companyId,
                            conversationId: conversation.id,
                            matchedIdentities: identities,
                            requiresReview: false,
                            reason: "Conversation participants resolve to one CRM contact.",
                        };
                    }
                }

                if (contactIds.length > 1) {
                    return {
                        status: "ambiguous",
                        method: "conversation-participant",
                        confidence: 0,
                        conversationId: conversation.id,
                        matchedIdentities: identities,
                        requiresReview: true,
                        reason: "Conversation participants resolve to multiple CRM contacts.",
                    };
                }
            }
        }

        return this.unresolved("No sufficiently strong CRM identity match was found.");
    }

    private async resolveByChannelIdentity(
        channel: CommunicationChannel,
        externalId: string,
    ): Promise<IdentityResolutionResult | undefined> {
        const conversations = await this.db.communicationConversation.findMany({
            where: { channel },
            select: { id: true, participants: true },
            orderBy: { updatedAt: "desc" },
            take: 500,
        });

        const matches = conversations.filter((conversation) =>
            participantIdentities(conversation.participants).some(
                (identity) =>
                    identity.channel === channel &&
                    identity.externalId === externalId,
            ),
        );

        if (matches.length === 0) {
            return undefined;
        }

        const contactIds = uniqueIds(
            (
                await Promise.all(
                    matches.flatMap((conversation) =>
                        participantIdentities(conversation.participants).map((identity) =>
                            this.contactIdForIdentity(identity),
                        ),
                    ),
                )
            ).flat(),
        );

        if (contactIds.length > 1) {
            return {
                status: "ambiguous",
                method: "channel-external-id",
                confidence: 0,
                conversationId: matches[0].id,
                matchedIdentities: participantIdentities(matches[0].participants),
                requiresReview: true,
                reason: "One channel identity appears across multiple CRM contacts.",
            };
        }

        if (contactIds.length === 1) {
            const contact = await this.db.contact.findUnique({
                where: { id: contactIds[0] },
                select: { id: true, companyId: true, email: true, phoneNumber: true },
            });

            if (contact) {
                return {
                    status: "resolved",
                    method: "channel-external-id",
                    confidence: 100,
                    contactId: contact.id,
                    companyId: contact.companyId,
                    conversationId: matches[0].id,
                    matchedIdentities: participantIdentities(matches[0].participants),
                    requiresReview: false,
                    reason: "Exact channel identity matched an existing CRM contact.",
                };
            }
        }

        return {
            status: "unresolved",
            method: "channel-external-id",
            confidence: 0,
            conversationId: matches[0].id,
            matchedIdentities: participantIdentities(matches[0].participants),
            requiresReview: false,
            reason: "Channel identity matched a conversation but not a CRM contact.",
        };
    }

    private async contactIdsByEmail(email: string): Promise<string[]> {
        const contacts = await this.db.contact.findMany({
            where: { email: { equals: email, mode: "insensitive" } },
            select: { id: true },
        });

        return contacts.map((contact) => contact.id);
    }

    private async contactIdsByPhone(phoneNumber: string): Promise<string[]> {
        const contacts = await this.db.contact.findMany({
            where: { phoneNumber },
            select: { id: true },
        });

        return contacts.map((contact) => contact.id);
    }

    private async contactIdForIdentity(
        identity: ChannelIdentity,
    ): Promise<string | undefined> {
        const externalId = normalizeExternalId(identity.externalId);
        if (!externalId) {
            return undefined;
        }

        if (identity.channel === "email") {
            const ids = await this.contactIdsByEmail(externalId);
            return ids.length === 1 ? ids[0] : undefined;
        }

        if (identity.channel === "voice" || identity.channel === "whatsapp") {
            const ids = await this.contactIdsByPhone(externalId);
            return ids.length === 1 ? ids[0] : undefined;
        }

        return undefined;
    }

    private async resolveParticipantContacts(
        identities: ChannelIdentity[],
    ): Promise<string[]> {
        const ids = await Promise.all(
            identities.map((identity) => this.contactIdForIdentity(identity)),
        );

        return uniqueIds(ids);
    }

    private contactIdentities(contact: {
        email: string | null;
        phoneNumber: string | null;
    }): ChannelIdentity[] {
        const identities: ChannelIdentity[] = [];

        if (contact.email) {
            identities.push({
                channel: "email",
                externalId: contact.email.toLowerCase(),
            });
        }

        if (contact.phoneNumber) {
            const phone = normalizePhone(contact.phoneNumber);
            if (phone) {
                identities.push({
                    channel: "voice",
                    externalId: phone,
                });
                identities.push({
                    channel: "whatsapp",
                    externalId: phone,
                });
            }
        }

        return identities;
    }

    private unresolved(reason: string): IdentityResolutionResult {
        return {
            status: "unresolved",
            method: "none",
            confidence: 0,
            matchedIdentities: [],
            requiresReview: false,
            reason,
        };
    }
}
