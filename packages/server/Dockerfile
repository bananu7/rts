################################
# first stage - build
FROM node:18
WORKDIR /var/lib/app

# install (and cache) full deps
COPY package.json ./
COPY yarn.lock ./
RUN yarn install

# build
COPY tsconfig.json ./
COPY src/*.ts ./
RUN yarn build

################################
# second stage - run
FROM node:18
WORKDIR /var/lib/app

# install run deps
COPY package.json ./
RUN yarn install --production

COPY --from=0 /var/lib/app/dist .
COPY version.txt ./
COPY assets ./assets

EXPOSE 9208
CMD [ "node", "index.js" ]
