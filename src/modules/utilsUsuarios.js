const db = require('./db/db_local');
const utils = require('./utils');

module.exports = {

    sp_controller: async function (objeto, data, operacion) {
        let response
        // Verificar si la contraseña ha sido modificada
        if (data.id) {
            const existingUser = await db.pg(objeto).where({ id: data.id }).first();

            if (data.password && existingUser && data.password !== existingUser.password) {
                // Encriptar la contraseña solo si ha sido modificada
                data.password = utils.cryptPasswordSync(data.password);
            }
        } else {
            data.password = utils.cryptPasswordSync(data.password);
        }

        let sql = utils.jsonToSql(objeto, data, operacion)
        // Llamar a la función en PostgreSQL
        await db.pg.raw(sql)
            .then(() => {
                response = {
                    status: 'success'
                };
            }).catch(err => {
                console.log(err)
                let message
                if (err.toString().indexOf('obligatorios') != -1) {
                    message = 'Complete los campos obligatorios'
                } else if (err.toString().indexOf('dependencias') != -1) {
                    message = 'El registro no puede ser borrado, existen dependencias para este registro'
                } else if (err.toString().indexOf('unicidad') != -1) {
                    message = 'El registro ya existe'
                } else {
                    message = err.toString()
                }

                response = {
                    status: 'error',
                    message
                };
            })

        return response;

    },
}