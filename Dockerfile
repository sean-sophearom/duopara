FROM node:22-bookworm-slim

ENV NPM_CONFIG_UPDATE_NOTIFIER=false

WORKDIR /opt/duopara

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json nx.json ./
COPY packages ./packages

RUN npm install \
  && npm run db:generate \
  && npm cache clean --force

COPY docker/entrypoint.sh /usr/local/bin/duopara-entrypoint
RUN chmod +x /usr/local/bin/duopara-entrypoint

WORKDIR /workspace

EXPOSE 3009 5173 5174

ENTRYPOINT ["duopara-entrypoint"]
CMD ["sh"]
