
const pg = require("knex")({
    client: "pg",
    connection: {
        host: process.env.DB_HOST_EXT,
        user: process.env.DB_USER_EXT,
        password: process.env.DB_PASS_EXT,
        database: process.env.DB_NAME_EXT,
        port: process.env.DB_PORT_EXT
    },
    searchPath: [process.env.DB_NAME_EXT, process.env.DB_SCHEMA_EXT],
    pool: {
        min: 0,
        max: 100
    }
});

// Realiza una consulta de prueba para verificar la conexi�n
pg.raw("SELECT * FROM solicitud_resultado limit 1")
    .then(() => {
        console.log("Conexi�n exitosa a la base de datos externa PostgreSQL.");
    })
    .catch((error) => {
        console.error("Error al conectar a la base de datos PostgreSQL:", error);
    });

module.exports = {
    pg
};