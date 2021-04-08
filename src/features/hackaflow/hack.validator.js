/* eslint-disable comma-dangle */
/* eslint-disable quotes */
const { celebrate, Joi, Segments } = require("celebrate");

const hackValidator = {
  qrValidator: celebrate({
    [Segments.BODY]: Joi.object().keys({
      channelId: Joi.string().trim().required(),
    }),
  }),
};

module.exports = hackValidator;
