# See: https://nodejs.org/en/docs/guides/nodejs-docker-webapp
#
FROM node:18
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8080
CMD [ "node", "server.js" ]
