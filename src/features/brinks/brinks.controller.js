/* eslint-disable quotes */
/* eslint-disable no-console */
// eslint-disable-next-line no-unused-vars

const brinksRepository = require("./brinks.repository");

const brinksController = {
  algorithm: async (req, res, next) => {
    return brinksRepository.algorithm(req);
  },
};

module.exports = brinksController;
