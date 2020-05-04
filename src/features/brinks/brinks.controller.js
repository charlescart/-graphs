/* eslint-disable quotes */
/* eslint-disable no-console */
const brinksRepository = require("./brinks.repository");

const brinksController = {
  // eslint-disable-next-line arrow-body-style
  algorithm: async (req, res, next) => {
    return brinksRepository.algorithm(req);
  },
};

module.exports = brinksController;
