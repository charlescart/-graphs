const Router = require('express');
const userController = require('./user.controller');
//const logger = require('../../config/logger');
//logger.info('Template temp file was deleted correctly') // logger.error('Template temp file was deleted correctly')
var standarResponse = require("../../helpers/standard.response.helper");
var {
  verifytoken,
  verifyadmin,
  tokenVerify
} = require("../../middlewares/auth.middleware");
const {
  findAll,
  findOne,
  findUser,
  editUser,
  verifyAccount,
  deleteAccount
} = require("./user.validator");
var fileUpload = require('express-fileupload');

const userRoutes = (app) => {
  const router = new Router();
  app.use(fileUpload());
  app.use(tokenVerify);

  router.get('/all', [findAll, verifytoken, verifyadmin], async (req, res, next) => {
    let response, count, statusCode, error;
    try {
      response = await userController.findAll(req);
      count = response.count;
      result = response.result;
    } catch (e) {
      next(e);
    }

    standarResponse({ res, error, response, statusCode, entry: req });
  });

  router.get('/one/:id', findOne, async (req, res, next) => {
    let response, statusCode, error;
    try {
      response = await userController.findOne(req, res, next);
    } catch (e) {
      next(e);
    }

    standarResponse({ res, error, response, statusCode, entry: req.params });
  });

  router.put('/edit/:id', editUser, async (req, res, next) => {
    let response, statusCode, error;
    try {
      response = await userController.updateUser(req, res, next);
    } catch (e) {
      next(e);
    }

    standarResponse({ res, error, response: response > 0 ? "Success" : "Error", statusCode, entry: req.params });
  });

  router.get('/search', findUser, async (req, res, next) => {
    let response, statusCode, error;
    try {
      response = await userController.findUser(req, res, next);
    } catch (e) {
      next(e);
    }

    standarResponse({ res, error, response, statusCode, entry: req.query });
  });

  router.put('/verify-account/:id', verifyAccount, async (req, res, next) => {
    let response, statusCode, error;
    try {
      response = await userController.verifyAccount(req, res, next);
    } catch (e) {
      next(e);
    }

    standarResponse({ res, error, response: response > 0 ? 'Success' : 'Error', statusCode, entry: req.body });
  });

  router.delete('/delete-account/:id', [deleteAccount, verifytoken, verifyadmin], async (req, res, next) => {
    let response, statusCode, error;
    try {
      response = await userController.deleteAccount(req, res, next);
    } catch (e) {
      next(e);
    }

    standarResponse({ res, error, response: response > 0 ? 'Success' : 'Error', statusCode, entry: req.body });
  });

  app.use('/v1/user', router);
};

module.exports = userRoutes;