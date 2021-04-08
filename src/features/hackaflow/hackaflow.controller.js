const hackRepository = require('./hack.repository');

const hackController = {
  // eslint-disable-next-line arrow-body-style
  qr: async (req) => {
    return hackRepository.qr(req.body);
  },

  // promiseAll: async (req) => {
  //   console.time('total');
  //   // const aux = brinksRepository.promiseAll(req);
  //   console.timeEnd('total');
  //   return true;
  // },
};

module.exports = hackController;
