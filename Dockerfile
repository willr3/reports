FROM node:16-alpine AS BUILDER

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

COPY . .

RUN npm install --force

RUN npm install -g webpack@4.44.2
RUN npm install -g webpack-cli
RUN npm install webpack-node-externals --force
RUN npm install -g babel-polyfill

# If you are building your code for production
# RUN npm ci --only=production



RUN npm run build
RUN PUBLIC_URL='/' webpack --config webpack.server.js
#RUN npm install -g browserify
#RUN npm install brfs
#RUN browserify -t brfs build/server.prod.js > build/server.bundle.js

#RUN npm prune --production

FROM node:16-alpine

# Create app directory
WORKDIR /usr/src/app

#COPY --from=BUILDER /usr/src/app/src ./src
COPY --from=BUILDER /usr/src/app/build ./build
COPY --from=BUILDER /usr/src/app/node_modules ./node_modules

EXPOSE 3001

CMD [ "node", "build/server.prod.js" ]
