FROM node:22-alpine AS builder

WORKDIR /app

COPY ["package.json", "package-lock.json", "tsconfig.*", "nest-cli.json", "./"]
RUN npm install

COPY ["src", "./src"]
RUN npm run build-bundle

FROM node:22-alpine
ENV TZ=Asia/Ho_Chi_Minh

WORKDIR /app
# RUN apk update
# RUN apk add libreoffice
# RUN apk --no-cache add msttcorefonts-installer fontconfig && \
#     update-ms-fonts && \
#     fc-cache -f

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY [".sequelizerc", "./"]
COPY ["sequelize", "./sequelize"]

# Remove prepare (husky)
RUN npm pkg delete scripts.prepare && npm install -only=prod

COPY --from=builder /app/dist ./dist

ENTRYPOINT node dist/main