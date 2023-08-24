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

RUN apt-get update
RUN apt-get install -y git-lfs cmake

# Install dependencies for both client and server
RUN mkdir -p ./packages/client
COPY ./packages/client/package.json ./packages/client

RUN mkdir -p ./packages/server
COPY ./packages/server/yarn.lock ./
COPY ./packages/server/package.json ./packages/server

RUN yarn install

# build server
WORKDIR /var/lib/app/packages/server

COPY ./packages/server/tsconfig.json ./

RUN mkdir -p ./src
COPY ./packages/server/src/*.ts ./src/

RUN yarn build

# build client
WORKDIR /var/lib/app/packages/client
COPY ./packages/client/tsconfig.json ./
COPY ./packages/client/vite.config.ts ./
COPY ./packages/client/tsconfig.node.json ./

COPY ./packages/client/src ./src
COPY ./packages/client/public ./public
COPY ./packages/client/index.html ./

# get assets
RUN git clone https://github.com/bananu7/rts-assets.git --depth 1
RUN git lfs install
RUN cd rts-assets && git lfs pull
RUN cp ./rts-assets/models/**/*.glb ./public/

RUN yarn build


################################
# second stage - run
FROM node:18
WORKDIR /var/lib/app

# install run deps
RUN apt-get update
RUN apt-get install -y cmake

COPY ./packages/server/package.json ./
RUN yarn install --production

RUN mkdir -p server
COPY --from=0 /var/lib/app/packages/server/dist ./
COPY ./packages/server/version.txt ./

# static files - assets and client frontend build
COPY ./packages/server/assets ./assets
COPY --from=0 /var/lib/app/packages/client/dist ./client

CMD [ "node", "index.js" ]
