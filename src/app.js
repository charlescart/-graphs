const express = require('express');
const { urlencoded, json } = require('body-parser');
const cors = require('cors');
// const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
// const logger = require('./config/logger');
const handleError = require('./middlewares/error.middleware');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
});

const port = process.env.PORT;
const app = express();

app.use(limiter);

app.use(urlencoded({ extended: true }));
app.use(json());
app.use(cors());
// app.use(morgan('combined', { stream: logger.stream }));

app.get('/', (req, res) => {
  res.sendFile(path.join(`${__dirname}/index.html`));
});

/* features */
require('./features/hackaflow/hackaflow.router')(app);

app.use((err, req, res, next) => {
  handleError(err, res, req);
});

app.listen(port, () => {
  // logger.info(`We are live on ${port}`);

  // eslint-disable-next-line no-console
  console.info(`We are live on ${port}`);
});
