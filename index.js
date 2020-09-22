const axios = require('axios').default;
const apm = require('elastic-apm-node').start({
  ignoreUrls: ['/healthz'],
});

const http = require('http');
const app = require('express')();
const asyncHooks = require('async_hooks');

const store = new Map();

const asyncHook = asyncHooks.createHook({
  init: (asyncId, _, triggerAsyncId) => {
    if (store.has(triggerAsyncId)) {
      store.set(asyncId, store.get(triggerAsyncId))
    }
  },
  destroy: (asyncId) => {
    if (store.has(asyncId)) {
      store.delete(asyncId);
    }
  }
});

asyncHook.enable();

function hasProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

axios.interceptors.request.use((config) => {
  const asyncId = asyncHooks.executionAsyncId();

  if (!store.has(asyncId)) {
    return config;
  }

  const userCtx = store.get(asyncId);

  if (!config.headers) {
    config.headers = userCtx.reqHeaders;
  } else {
    Object.keys(userCtx.reqHeaders).forEach((key) => {
      if (!hasProperty(config.headers, key)) {
        config.headers[key] = userCtx.reqHeaders[key];
      }
    });
  }

  return config;
})

/**
 *
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 * @param {*} next
 */
function userContextHandler(req, res, next) {
  const userCtx = {
    userId: 1000, // TODO: query user info from session
    userName: 'userXXX',
    reqHeaders: {
    },
  };

  // 'host' 用在反向代理; 'user-agent'
  ['language', 'session-id'].forEach((key) => {
    if (req.headers[key]) {
      userCtx.reqHeaders[key] = req.headers[key];
    }
  });

  userCtx.reqHeaders["user-id"] = `${userCtx.userId}`;
  userCtx.reqHeaders["user-name"] = userCtx.userName;

  store.set(asyncHooks.executionAsyncId(), userCtx);
  next();
}

function logErrors (err, req, res, next) {
  console.error(err.stack);
  next(err);
}

function clientErrorHandler (err, req, res, next) {
  if (req.xhr) {
    res.status(500).send({ error: 'Something failed!' });
  } else {
    next(err);
  }
}

function errorHandler (err, req, res, next) {
  res.status(500);
  res.render('error', { error: err });
}

app.use(userContextHandler);
app.use(logErrors);
app.use(clientErrorHandler);
app.use(errorHandler);

app.get('/healthz', function (req, res) {
  res.send({
    msg: 'OK',
  });
});

app.get('/', async function (req, res, next) {
  try {
    const resAll = await Promise.all([
      axios.get('http://apm-nodejs-app-b:8080/api/hello-a-b'),
      axios.get('http://apm-nodejs-app-c:8080/api/hello-a-c'),
    ]);

    res.send({
      a: 'Hello World!',
      b: resAll[0].data,
      c: resAll[1].data,
    });
  }
  catch (err) {
    next(err);
  }
});

app.listen(8080);
