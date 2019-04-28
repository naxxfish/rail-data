FROM node:10.15.3
WORKDIR /usr/src/app
COPY ./package.json /usr/src/app
ENV NODE_ENV=production
RUN npm install --only=production
COPY . /usr/src/app
CMD [ "node", "service.js" ]