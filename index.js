const fs = require('fs');
const config = require('config');
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const https = require('https');
const waivers = require('./lib/waivers');
const app = express();
const port = process.env.PORT || config.get('port');

app.options('*', cors({ origin: '*' }));

app.use(
  express.urlencoded({extended: true}),
  express.json(),
  helmet(),
  cors({ origin: '*' })
);

app.get('/ok', (req, res) => res.sendStatus(200));

app.get('/waivers', waivers.fetchAll);
app.post('/waivers', waivers.create);
app.get('/waivers/check', waivers.check);
app.get('/waivers/count', waivers.count);

app.use((err, req, res, next) => res.status(500).send({ message: "Something when wrong, please try again!" }));

if (config.get('certPath')) {
  const certPath = config.get('certPath');
  const certs = {
    key: fs.readFileSync(`${certPath}/privkey.pem`),
    cert: fs.readFileSync(`${certPath}/cert.pem`),
    ca: fs.readFileSync(`${certPath}/chain.pem`)
  };

  const server = https.createServer(certs, app);
  server.listen(port, () => console.log(`Listening on port ${port}`));
} else {
  app.listen(port, () => console.log(`Listening on port ${port}`));
}
