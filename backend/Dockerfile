FROM node:22-alpine AS builder
WORKDIR /app

COPY ["package.json", "package-lock.json", "tsconfig.json", "tsconfig.build.json", "nest-cli.json", "./"]
RUN npm ci --ignore-scripts --no-audit --no-fund

COPY ["src", "./src"]
RUN npm run build

FROM node:22-alpine
ENV TZ=Asia/Ho_Chi_Minh
ENV NODE_ENV=production
WORKDIR /app

COPY ["package.json", "package-lock.json", ".sequelizerc", "./"]
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund && npm cache clean --force
COPY ["sequelize", "./sequelize"]
COPY --from=builder /app/dist ./dist

EXPOSE 5000
CMD ["node", "dist/main"]
