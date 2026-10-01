import type { Request, Response } from "express";

const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;

function clientKey(request: Request): string {
    return request.ip || request.socket.remoteAddress || "unknown";
}

function rateLimited(request: Request): boolean {
    const now = Date.now();
    const key = clientKey(request);
    const current = loginAttempts.get(key);
    if (!current || current.resetAt <= now) {
        loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
        return false;
    }
    current.count += 1;
    return current.count > LOGIN_MAX_ATTEMPTS;
}

import { login, logout, getSession } from "../../auth/auth.service";

function sessionToken(request: Request): string | undefined {
    return request.header("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith("luuku_session="))?.slice("luuku_session=".length);
}

export async function loginController(request: Request, response: Response): Promise<void> {
    const email = typeof request.body?.email === "string" ? request.body.email : "";
    const password = typeof request.body?.password === "string" ? request.body.password : "";

    if (rateLimited(request)) {
        response.status(429).json({ error: "TOO_MANY_LOGIN_ATTEMPTS" });
        return;
    }

    if (!email || !password) {
        response.status(400).json({ error: "EMAIL_AND_PASSWORD_REQUIRED" });
        return;
    }

    const result = await login(email, password);
    if (!result) {
        response.status(401).json({ error: "INVALID_CREDENTIALS" });
        return;
    }

    const secure = process.env.NODE_ENV === "production";
    response.setHeader(
        "Set-Cookie",
        `luuku_session=${result.token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800${secure ? "; Secure" : ""}`,
    );

    response.json(result.user);
}

export async function logoutController(request: Request, response: Response): Promise<void> {
    const token = sessionToken(request);
    if (token) {
        await logout(token);
    }

    response.setHeader(
        "Set-Cookie",
        "luuku_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0",
    );
    response.status(204).end();
}

export async function meController(request: Request, response: Response): Promise<void> {
    const token = sessionToken(request);
    if (!token) {
        response.status(401).json({ error: "UNAUTHORIZED" });
        return;
    }

    const session = await getSession(token);
    if (!session) {
        response.status(401).json({ error: "UNAUTHORIZED" });
        return;
    }

    response.json({
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        memberships: session.user.memberships,
    });
}
