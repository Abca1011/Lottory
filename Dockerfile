FROM node:22-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY packages ./packages
COPY web ./web
COPY server ./server
COPY reference/template.xlsx ./reference/template.xlsx
COPY tsconfig.json ./
RUN npm run build
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
CMD ["npm","start"]
