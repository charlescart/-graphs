const userRepository = require('./user.repository');
const uploadService = require("../../services/upload.service");
const { FOLDER_USER } = require("../../constant/constant").FOLDERS;

const userController = {
  findAll: async (req, res, next) => {
    try {
      let result = await userRepository.findAll(req, res, next);
      console.log(JSON.stringify(result));
      return result;
    } catch (error) {
      next(e);
    }
  },

  updateUser: async (req, res, next) => {
    try {
      let avatar;
      if (req.files) {
        avatar = await uploadService.saveFile(req, res, next, FOLDER_USER);
        if (avatar) {
          req.body.avatar = avatar;
        }
      }
      return await userRepository.updateUser(req, res, next);
    } catch (error) {
      console.log(error);
    }
  },

  findOne: async (req, res, next) => {
    try {
      return await userRepository.findOne(req, res, next);
    } catch (error) {
      console.log(error);
    }
  },

  findUser: async (req, res, next) => {
    try {
      return await userRepository.findUser(req, res, next);
    } catch (error) {
      console.log(error);
    }
  },

  verifyAccount: async (req, res, next) => {
    try {
      return await userRepository.verifyAccount(req, res, next);
    } catch (error) {
      console.log(error);
    }
  },

  deleteAccount: async (req, res, next) => {
    try {
      return await userRepository.deleteAccount(req, res, next);
    } catch (error) {
      console.log(error);
    }
  },
}

module.exports = userController;