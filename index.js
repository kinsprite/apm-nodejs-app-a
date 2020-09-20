const axios = require('axios').default;
const apm = require('elastic-apm-node').start({
  ignoreUrls: ['/healthz'],
});

const app = require('express')();

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

app.use(logErrors);
app.use(clientErrorHandler);
app.use(errorHandler);

app.get('/healthz', function (req, res) {
  res.send({
    msg: 'OK',
  });
});

app.get('/',  async function (req, res) {

  const resAll = await Promise.all([
    axios.get('http://apm-nodejs-app-b:8080/api/hello-a-b'),
    axios.get('http://apm-nodejs-app-c:8080/api/hello-a-c'),
  ]);

  res.send({
    a: 'Hello World!',
    b: resAll[0].data,
    c: resAll[1].data,
  });
});

app.use(function logErrors (err, req, res, next) {
  console.error(err.stack);

  if (req.xhr) {
    // res.status(500).send({ error: 'Something failed!' });
    res.status(500).render('error', { error: err });
  } else {
    next(err);
  }
});

app.listen(8080);
