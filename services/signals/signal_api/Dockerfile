FROM node:10.15.3
WORKDIR /usr/src/app
COPY . /usr/src/app
ENV NODE_ENV=production
RUN npm install --only=production
CMD [ "node", "app.js" ]