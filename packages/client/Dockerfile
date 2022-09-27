################################
# first stage - build
FROM node:18
WORKDIR /var/lib/app

# install (and cache) full deps
COPY package.json ./
#COPY yarn.lock ./
RUN yarn install

# build
COPY tsconfig.json ./
COPY tsconfig.node.json ./
COPY vite.config.ts ./
COPY index.html ./
COPY src ./src
COPY public ./public

RUN yarn build

################################
FROM caddy:2-alpine

COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=0 /var/lib/app/dist /srv
