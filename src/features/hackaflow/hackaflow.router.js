const Router = require('express');
// const fileUpload = require('express-fileupload');
const hackController = require('./hackaflow.controller');
// const logger = require('../../config/logger');
// logger.info('Template temp file was deleted correctly') // logger.error('Template temp file was deleted correctly')
const standarResponse = require('../../helpers/standard.response.helper');
const {
  verifytoken,
  verifyadmin,
  // tokenVerify,
} = require('../../middlewares/auth.middleware');

const {
  qrValidator,
} = require('./hack.validator');

const hackRoutes = (app) => {
  const router = new Router();
  // app.use(fileUpload());
  // app.use(tokenVerify);

  router.post('/qr', [qrValidator], async (req, res, next) => {
    await hackController
      .qr(req, res, next)
      .then((response) => standarResponse({ res, req, response }))
      .catch((e) => next(e));
  });

  // router.get('/one/:id', findOne, async (req, res, next) => {
  //   let response; let statusCode; let
  //     error;
  //   try {
  //     response = await userController.findOne(req, res, next);
  //   } catch (e) {
  //     next(e);
  //   }

  //   standarResponse({
  //     res, error, response, statusCode, entry: req.params,
  //   });
  // });

  // router.put('/edit/:id', editUser, async (req, res, next) => {
  //   let response; let statusCode; let
  //     error;
  //   try {
  //     response = await userController.updateUser(req, res, next);
  //   } catch (e) {
  //     next(e);
  //   }

  //   standarResponse({
  //     res, error, response: response > 0 ? 'Success' : 'Error', statusCode, entry: req.params,
  //   });
  // });

  // router.get('/search', findUser, async (req, res, next) => {
  //   let response; let statusCode; let
  //     error;
  //   try {
  //     response = await userController.findUser(req, res, next);
  //   } catch (e) {
  //     next(e);
  //   }

  //   standarResponse({
  //     res, error, response, statusCode, entry: req.query,
  //   });
  // });

  // router.put('/verify-account/:id', verifyAccount, async (req, res, next) => {
  //   let response; let statusCode; let
  //     error;
  //   try {
  //     response = await userController.verifyAccount(req, res, next);
  //   } catch (e) {
  //     next(e);
  //   }

  //   standarResponse({
  //     res, error, response: response > 0 ? 'Success' : 'Error', statusCode, entry: req.body,
  //   });
  // });

  // router.delete('/delete-account/:id', [deleteAccount, verifytoken, verifyadmin], async (req, res, next) => {
  //   let response; let statusCode; let
  //     error;
  //   try {
  //     response = await userController.deleteAccount(req, res, next);
  //   } catch (e) {
  //     next(e);
  //   }

  //   standarResponse({
  //     res, error, response: response > 0 ? 'Success' : 'Error', statusCode, entry: req.body,
  //   });
  // });

  app.use('/hackaflow/v1', router);
};

module.exports = hackRoutes;
