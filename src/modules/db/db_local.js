
const pg = require("knex")({
    client: "pg",
    connection: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    },
    searchPath: [process.env.DB_NAME, process.env.DB_SCHEMA],
    pool: {
        min: 0,
        max: 100
    }
});

// Realiza una consulta de prueba para verificar la conexi�n
pg.raw("SELECT * FROM usuario")
    .then(() => {
        console.log("Conexi�n exitosa a la base de datos interna PostgreSQL.");
    })
    .catch((error) => {
        console.error("Error al conectar a la base de datos PostgreSQL:", error);
    });

module.exports = {
    pg
};