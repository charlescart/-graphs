const dbConfig = require("../config/db.config");
const Sequelize = require('sequelize');

const mysqlConnect = {
  sequelizeConnection: null,
  singleton: () => {
    //console.log(mysqlConnect.sequelizeConnection);
    if(mysqlConnect.sequelizeConnection === null) {
      try {
        mysqlConnect.sequelizeConnection = new Sequelize(
          dbConfig.DB,
          dbConfig.USER,
          dbConfig.PASSWORD, {
          host: dbConfig.HOST,
          dialect: 'mysql'
        });

        mysqlConnect.sequelizeConnection.authenticate()
        .then(() => {
          console.log('DB Connected');
        })
        .catch(err => {
          console.log('No DB connected');
        });
      } catch (err) {
        throw err;
      }

      return mysqlConnect.sequelizeConnection;
    }
  }
}

const db ={};
db.Sequelize = Sequelize;
db.sequelize = mysqlConnect.singleton();

const Op = Sequelize.Op;

module.exports = {
  db,
  Op
};
/**
 * Examples relation ship models
 */
/*
db.roles.belongsTo(db.roles, {foreignKey:'parent'});
db.permissions.belongsToMany(db.roles, {through: 'permission_role', foreignKey:'permission_id'});
db.rodeos.hasMany(db.rodeo_evento, {as:'evento_rodeo', foreignKey:'id_rodeo',targetKey:'id_rodeo', sourceKey:'id_rodeo'});
*/
