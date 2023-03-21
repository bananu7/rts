# This is the unified Dockerfile that bundles the server and client

################################
# first stage - build
FROM node:18
WORKDIR /var/lib/app

# install deps for both packages
COPY package.json ./
COPY yarn.lock ./

RUN npm install -g lerna
RUN lerna init

# Install dependencies for both client and server
RUN mkdir -p ./packages/rts-client
COPY ./packages/rts-client/package.json ./packages/rts-client

RUN mkdir -p ./packages/rts-server
COPY ./packages/rts-server/yarn.lock ./
COPY ./packages/rts-server/package.json ./packages/rts-server

RUN yarn install

# build server
WORKDIR /var/lib/app/packages/rts-server

COPY ./packages/rts-server/tsconfig.json ./

RUN mkdir -p ./src
COPY ./packages/rts-server/src/*.ts ./src/

RUN yarn build

# build client
WORKDIR /var/lib/app/packages/rts-client
COPY ./packages/rts-client/tsconfig.json ./
COPY ./packages/rts-client/vite.config.ts ./
COPY ./packages/rts-client/tsconfig.node.json ./

COPY ./packages/rts-client/src ./src
COPY ./packages/rts-client/public ./public
COPY ./packages/rts-client/index.html ./

# get assets
RUN git clone https://github.com/bananu7/rts-assets.git --depth 1
RUN apt-get update
RUN apt-get install -y git-lfs
RUN git lfs install
RUN cd rts-assets && git lfs pull
RUN cp ./rts-assets/models/**/*.glb ./public/

RUN yarn build


################################
# second stage - run
FROM node:18
WORKDIR /var/lib/app

# install run deps
COPY ./packages/rts-server/package.json ./
RUN yarn install --production

RUN mkdir -p server
COPY --from=0 /var/lib/app/packages/rts-server/dist ./
COPY ./packages/rts-server/version.txt ./

# static files - assets and client frontend build
COPY ./packages/rts-server/assets ./assets
COPY --from=0 /var/lib/app/packages/rts-client/dist ./rts-client

EXPOSE 9208
CMD [ "node", "index.js" ]


