const oracledb = require('oracledb');

// Conexion de base de datos
class DatabaseFactory {
    static async connect(config) {
        return DatabaseFactory.connectOracle(config);
    }

    static async connectOracle(config) {
        await oracledb.createPool({
            user: config.user,
            password: config.password,
            connectString: `${config.host}:${config.port}/${config.database}`
        });
        console.log(`Conectado a Oracle: ${config.database}`);
        return oracledb.getPool();
    }
}

module.exports = {
    DatabaseFactory
};