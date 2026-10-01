import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

import { prisma } from "../database/client";

const scrypt = promisify(scryptCallback);
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export type MembershipRole = "OWNER" | "ADMIN" | "OPERATOR" | "VIEWER";

function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

async function hashPassword(password: string): Promise<string> {
    if (password.length < 12) {
        throw new Error("PASSWORD_TOO_SHORT");
    }

    const salt = randomBytes(16).toString("hex");
    const derived = (await scrypt(password, salt, 64)) as Buffer;
    return `scrypt$${salt}$${derived.toString("hex")}`;
}

async function verifyPassword(password: string, encoded: string): Promise<boolean> {
    const [algorithm, salt, digest] = encoded.split("$");
    if (algorithm !== "scrypt" || !salt || !digest) {
        return false;
    }

    const derived = (await scrypt(password, salt, 64)) as Buffer;
    const expected = Buffer.from(digest, "hex");
    return expected.length === derived.length && timingSafeEqual(expected, derived);
}

function hashSessionToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

export async function createUser(input: {
    email: string;
    name: string;
    password: string;
    companyId: string;
    role?: MembershipRole;
}) {
    const email = normalizeEmail(input.email);
    const passwordHash = await hashPassword(input.password);

    return prisma.user.create({
        data: {
            email,
            name: input.name.trim(),
            passwordHash,
            memberships: {
                create: {
                    companyId: input.companyId,
                    role: input.role ?? "OWNER",
                },
            },
        },
        select: {
            id: true,
            email: true,
            name: true,
        },
    });
}

export async function login(emailInput: string, password: string) {
    const email = normalizeEmail(emailInput);
    const user = await prisma.user.findUnique({
        where: { email },
        include: {
            memberships: {
                select: {
                    companyId: true,
                    role: true,
                    company: { select: { id: true, name: true } },
                },
            },
        },
    });

    if (!user || user.status !== "ACTIVE" || !(await verifyPassword(password, user.passwordHash))) {
        return null;
    }

    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    await prisma.session.create({
        data: {
            tokenHash: hashSessionToken(token),
            userId: user.id,
            expiresAt,
        },
    });

    return {
        token,
        expiresAt,
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            memberships: user.memberships,
        },
    };
}

export async function getSession(token: string) {
    const session = await prisma.session.findUnique({
        where: { tokenHash: hashSessionToken(token) },
        include: {
            user: {
                include: {
                    memberships: {
                        select: {
                            companyId: true,
                            role: true,
                            company: { select: { id: true, name: true } },
                        },
                    },
                },
            },
        },
    });

    if (!session || session.expiresAt <= new Date() || session.user.status !== "ACTIVE") {
        if (session) {
            await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
        }
        return null;
    }

    await prisma.session.update({
        where: { id: session.id },
        data: { lastSeenAt: new Date() },
    });

    return session;
}

export async function logout(token: string): Promise<void> {
    await prisma.session.deleteMany({
        where: { tokenHash: hashSessionToken(token) },
    });
}

export async function getMembership(userId: string, requestedCompanyId?: string) {
    const membership = requestedCompanyId
        ? await prisma.companyMembership.findUnique({
            where: { userId_companyId: { userId, companyId: requestedCompanyId } },
            select: { companyId: true, role: true },
        })
        : await prisma.companyMembership.findFirst({
            where: { userId },
            orderBy: { createdAt: "asc" },
            select: { companyId: true, role: true },
        });

    return membership;
}

export async function bootstrapFromEnv(): Promise<void> {
    const email = process.env.LUUKU_AUTH_BOOTSTRAP_EMAIL?.trim();
    const password = process.env.LUUKU_AUTH_BOOTSTRAP_PASSWORD;
    const name = process.env.LUUKU_AUTH_BOOTSTRAP_NAME?.trim();
    const companyId = process.env.LUUKU_AUTH_BOOTSTRAP_COMPANY_ID?.trim();

    if (!email || !password || !name || !companyId) {
        throw new Error(
            "LUUKU_AUTH_BOOTSTRAP_EMAIL, LUUKU_AUTH_BOOTSTRAP_PASSWORD, LUUKU_AUTH_BOOTSTRAP_NAME and LUUKU_AUTH_BOOTSTRAP_COMPANY_ID are required.",
        );
    }

    const company = await prisma.company.findUnique({ where: { id: companyId }, select: { id: true } });
    if (!company) {
        throw new Error("BOOTSTRAP_COMPANY_NOT_FOUND");
    }

    const existing = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
    if (existing) {
        throw new Error("BOOTSTRAP_USER_ALREADY_EXISTS");
    }

    await createUser({ email, password, name, companyId, role: "OWNER" });
}
