FROM node:18

WORKDIR /sauna-checker

COPY package.json pnpm-lock.yaml ./

RUN corepack enable \
    && corepack prepare pnpm@8.6.1 --activate \
    && pnpm install

COPY . .

RUN pnpm build

EXPOSE 3000

CMD ["pnpm", "start"]
