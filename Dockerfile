FROM node:onbuild

RUN groupadd -r nodejs && useradd -r -g nodejs nodejs
# RUN apt-get update && apt-get install python make gcc

WORKDIR /home/nodejs/jsb-sync/

COPY package.json /home/nodejs/jsb-sync/

RUN npm install

COPY . /home/nodejs/jsb-sync

ENV NODE_PORT 8443
ENV NODE_PATH /home/nodejs/jsb-sync/lib/

CMD ["node", "index.js"]

EXPOSE 8443

