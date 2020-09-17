const axios = require('axios').default;
const apm = require('elastic-apm-node').start({
  ignoreUrls: ['/healthz'],
});

const app = require('express')();

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

app.listen(8080);
