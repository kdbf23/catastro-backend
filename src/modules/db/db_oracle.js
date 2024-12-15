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

// Ejemplo de uso
(async () => {
    const config = {
        user: process.env.DB_USER_ORACLE,
        password: process.env.DB_PASS_ORACLE,
        host: process.env.DB_HOST_ORACLE,
        port: process.env.DB_PORT_ORACLE,
        database: process.env.DB_NAME_ORACLE
    };

    try {
        const pool = await DatabaseFactory.connect(config);
        console.log('Conexión exitosa');

        // Cerrar la conexión
        await pool.close();
    } catch (error) {
        console.error('Error en la conexión:', error);
    }
})();