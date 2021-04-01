FROM arm32v7/node:14 AS builder

RUN apt-get update
RUN apt-get install -y build-essential
RUN npm install --global node-gyp
RUN npm install --global node-pre-gyp

# Install app dependencies manually from here
RUN npm install --global express
RUN npm install --global body-parser
RUN npm install --global async-mutex
RUN npm install --global superagent

# we use github repository as 8.0.1 has a bug for modbus ascii
RUN npm install --global --unsafe-perm yaacov/node-modbus-serial

WORKDIR /usr/src/html/public/js
RUN curl -o /usr/src/html/public/js/angular.min.js "https://code.angularjs.org/snapshot-stable/angular.min.js"
RUN curl -o /usr/src/html/public/js/angular.min.js.map "https://code.angularjs.org/snapshot-stable/angular.min.js.map"
RUN curl -o /usr/src/html/public/js/angular.js "https://code.angularjs.org/snapshot-stable/angular.js"
RUN curl -o /usr/src/html/public/js/angular.js.map "https://code.angularjs.org/snapshot-stable/angular.js.map"


FROM arm32v7/node:14

COPY --from=builder /usr/local/lib/node_modules /usr/local/lib/node_modules
COPY --from=builder /usr/src/html/public /usr/src/html/public

RUN npm install --global nodemon

# Create app directory
WORKDIR /usr/src/app

EXPOSE 80
ENV NODE_PATH /usr/local/lib/node_modules 

CMD [ "npm", "start" ]

