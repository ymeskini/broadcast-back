FROM node:21-alpine as base
LABEL fly_launch_runtime="Node.js"

WORKDIR /app

COPY package-lock.json package.json .swcrc ./
RUN npm ci
COPY . .

FROM base as build
RUN npm run build

FROM node:21-alpine as deployment
COPY package-lock.json package.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./

ENV NODE_ENV="production"
EXPOSE 3000

CMD ["node", "index.js"]