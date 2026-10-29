# Étape 1 : compilation du frontend. Étape 2 : nginx non-root qui sert l'application et relaie /api vers Django (même origine).
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY infrastructure/nginx.conf /etc/nginx/conf.d/default.conf
COPY infrastructure/security-headers.conf /etc/nginx/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
