const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const sanitizer = require('express-sanitizer');
const waivers = require('./lib/waivers');
const app = express();
const port = process.env.PORT || 1337;

app.options('*', cors());

app.use(
  express.urlencoded({extended: true}),
  express.json(),
  helmet(),
  cors()
);

app.get('/ok', (req, res) => res.sendStatus(200));

app.get('/waivers', waivers.fetchAll);
app.post('/waivers', waivers.create);
app.get('/waivers/check', waivers.check);

app.use((err, req, res, next) => res.status(500).send({ message: "Something when wrong, please try again!" }));

app.listen(port, () => console.log(`Listening on port ${port}`));
