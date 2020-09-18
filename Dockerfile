FROM node:lts
ENV PORT 8080
EXPOSE 8080

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY .npmrc .
COPY package.json .
COPY yarn.lock .

RUN yarn install
COPY . .

CMD ["yarn", "start"]
