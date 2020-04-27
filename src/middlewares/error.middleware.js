var standarResponse = require("../helpers/standard.response.helper");
const { isCelebrate } = require('celebrate');

const handleError = (err, res, req) => {
    const { statusCode, message: msg } = err;

    if (isCelebrate(err))
        err = err.joi.details;


    standarResponse({
        err, res, req, msg, status: statusCode || 400, code: 1,
    });
};

module.exports = handleError;