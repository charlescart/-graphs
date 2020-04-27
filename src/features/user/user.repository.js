const Users = require("../../models/mysql/user.model");
const Roles = require("../../models/mysql/role.model");
const uuidV1 = require('uuid/v1');
const StandarException = require('../../exceptions/standard.exception');

const { Op } = require('../../database/db.mysql');

const userRepository = {
    findAll: async (req, res, next) => {
        let result, count;
        let query = {
            include: [{ model: Roles, attributes: ["id", "role"] }],
            limit: req.query.limit,
            offset: req.query.offset,
            order: [
                [req.query.order, req.query.sort]
            ],
            where: {
                active: req.query.filter
            }
        };

        await Users.findAndCountAll(query).then((users) => {
            // console.log(users.rows);
            count = users.count;
            // var array = [];
            users.rows.forEach((user) => {
                console.log(user.password);
                user.password = undefined;
                // array.push(user);
            });

            result = users.rows;
        }).catch(next);

        return { count, result };
    },

    updateUser: async (req, res, next) => {
        try {
            await userRepository.findOne(req, res, next);

            return await Users.update(
                {
                    name: req.body.name,
                    lastname: req.body.lastname,
                    avatar: req.body.avatar
                },
                { where: { id: req.params.id } }
            );
        } catch (error) {
            next(error);
        }
    },

    findOne: async (req, res, next) => {
        try {
            const user = await Users.findOne({
                include: [{ model: Roles, attributes: ["id", "role"] }],
                where: {
                    id: req.params.id
                }
            });

            if (!user) {
                throw new StandarException(404, 'User not exists');
            }

            user.password = undefined;
            return user;
        } catch (error) {
            next(error);
        }
    },

    findUser: async (req, res, next) => {
        try {
            let result;
            await Users.findAll({
                include: [{ model: Roles, attributes: ["id", "role"] }],
                where: {
                    [Op.or]: [
                        {
                            name: { [Op.like]: '%' + req.query.name + '%' }
                        },
                        {
                            lastname: { [Op.like]: '%' + req.query.lastname + '%' }
                        },
                        {
                            email: { [Op.like]: '%' + req.query.email + '%' }
                        },
                    ]
                }
            }).then(function (users) {
                var array = [];
                users.forEach(function (user) {
                    user.password = undefined;
                    array.push(user);
                });

                result = array;
            });

            return result;
        } catch (error) {
            next(error);
        }
    },

    verifyAccount: async (req, res, next) => {
        try {
            let user = await userRepository.findOne(req, res, next);

            if (user.access_token !== req.body.access_token) {
                throw new StandarException(404, "El access token no coincide");
            }
            return await Users.update(
                {
                    access_token: null,
                    active: 1
                },
                { where: { id: req.params.id } }
            );
        } catch (error) {
            next(error);
        }
    },

    deleteAccount: async (req, res, next) => {
        try {
            await userRepository.findOne(req, res, next);

            const rows = await Users.update(
                {
                    active: 0
                },
                { where: { id: req.params.id } }
            );

            return rows;
        } catch (error) {
            next(error);
        }
    },
}

module.exports = userRepository;