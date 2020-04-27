const { celebrate, Joi, Segments } = require('celebrate');

const userValidator = {
  findAll: celebrate({
    [Segments.QUERY]: Joi.object().keys({
      page: Joi.number().allow('', null).default(1),
      order: Joi.string().valid('id', 'username', 'name', 'lastname', 'email').allow('', null).default('id'),
      sort: Joi.string().valid('ASC', 'DESC').allow('', null).default('ASC'),
      limit: Joi.number().allow('', null).default(2),
      offset: Joi.number().allow('', null).default(0),
      filter: Joi.number().valid(1, 0).allow('', null).default(1),
    }),
  }),

  editUser: celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().required(),
    }),
    [Segments.BODY]: Joi.object().keys({
      name: Joi.string().min(3).max(80).allow('', null),
      lastname: Joi.string().min(3).max(80).allow('', null),
      avatar: Joi.string().allow('', null),
    }),
  }),

  findOne: celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().required(),
    }),
  }),

  findUser: celebrate({
    [Segments.QUERY]: Joi.object().keys({
      email: Joi.string().allow('', null),
      name: Joi.string().allow('', null),
      lastname: Joi.string().allow('', null),
    })
  }),

  verifyAccount: celebrate({
    [Segments.BODY]: Joi.object().keys({
      access_token: Joi.string().min(15).required(),
    }),
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().required(),
    })
  }),

  deleteAccount: celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().required(),
    }),
  }),

}

module.exports = userValidator;
