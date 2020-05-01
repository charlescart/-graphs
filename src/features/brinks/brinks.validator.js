/* eslint-disable comma-dangle */
/* eslint-disable quotes */
const { celebrate, Joi, Segments } = require("celebrate");

const brinksValidator = {
  brinksValidator: celebrate({
    [Segments.BODY]: Joi.object().keys({
      nodes: Joi.array()
        .items(
          Joi.object()
            .keys({
              description: Joi.string().trim().required(),
              address: Joi.string().trim().required(),
              coordinates: Joi.object()
                .keys({
                  lat: Joi.number().required().label("latitud"),
                  lng: Joi.number().required().label("longitud"),
                })
                .and("lat", "lng")
                .required(),
              attentionHour: Joi.array()
                .items(
                  Joi.object()
                    .keys({
                      start: Joi.string().trim().required(),
                      end: Joi.string().trim().required(),
                    })
                    .and("start", "end")
                )
                .min(1)
                .required()
                .label("attention hours"),
              serviceTime: Joi.string().trim().required().label("service time"),
              serviceTimeWithin: Joi.boolean()
                .required()
                .label("service time within"),
              priority: Joi.number().min(0).required(),
              destination: Joi.string().trim(),
              blocked: Joi.boolean().required().optional(),
              finalDestination: Joi.boolean().label("final destination"),
            })
            .required()
        )
        .unique("description"),
      hourDeparture: Joi.string().trim().required(),
    }),
  }),
};

module.exports = brinksValidator;
