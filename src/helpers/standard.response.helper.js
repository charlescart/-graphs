const _ = require('lodash');

const standardResponse = (opts) => {

    _.defaults(opts, { status: 200, code: 0, msg: `ok` });

    let { res, req, response, status, err, code, msg } = opts;
    let { body, query, params } = req;
    let result = { entry: { body, query, params }, response, code, msg };

    objectSafe(result.entry);
    objectSafe(response);

    if (err) {
        result.code = 1;
        result.msg = msg;
        result.error = err;
    }

    res.status(status).json(result);
};

/**
 * @function: objectSafe
 * @params: obj: Object.
 * @description: Cambia el valor de keys en el objecto.
 */
const objectSafe = obj => {
    for (let key in obj) {
        if (_.includes(keysToRemove, key)) obj[key] = undefined;
        if (typeof obj[key] == 'object') objectSafe(obj[key]);
    }
}

/**
 * @description: keys a remover.
 */
const keysToRemove = [
    'password', 'repeat_password', 'access_token'
];

module.exports = standardResponse;