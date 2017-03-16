FROM node:latest

RUN groupadd -r nodejs && useradd -r -g nodejs nodejs
# RUN apt-get update && apt-get install python make gcc

WORKDIR /home/nodejs/jsb-sync/

COPY package.json /home/nodejs/jsb-sync/

RUN npm install

COPY . /home/nodejs/jsb-sync

RUN chmod +x /home/nodejs/jsb-sync/wait-for-redis.sh

ENV NODE_ENV production
ENV NODE_PORT 22160
ENV NODE_PATH /home/nodejs/jsb-sync/lib/

ENTRYPOINT ["/home/nodejs/jsb-sync/wait-for-redis.sh", "node", "index.js"]
