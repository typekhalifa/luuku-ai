FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps ./apps
COPY packages ./packages
COPY luuku-ai ./luuku-ai
COPY prisma ./prisma
COPY tsconfig.json tsconfig.base.json ./

RUN npm ci
RUN npx prisma generate --schema prisma/schema.prisma
RUN npm run typecheck:backend

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist/backend ./dist/backend
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/luuku-ai ./luuku-ai

EXPOSE 3000

CMD ["node", "dist/backend/shared/api/server.js"]
