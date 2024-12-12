const db_local = require('./db/db_local');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const moment = require('moment-timezone');
const axios = require('axios')

async function descarga_documento(id_solicitud) {
    try {
        // Realiza la solicitud HTTP con Axios
        const response = await axios({
            url: process.env.URL_SOLICITUD + `/${id_solicitud}?access_token=`,
            method: 'GET',
            responseType: 'arraybuffer', // Necesario para manejar archivos grandes
        });

        const solicitudBuffer = Buffer.from(response.data);
        console.log('Archivo descargado correctamente.');

        return {
            status: 'success',
            solicitudBuffer
        };

    } catch (error) {
        console.error('Error al descargar el archivo:', error.message);
        return {
            status: 'error',
            message: error.message
        };
    }
}

function currentDate() {
    // Captura la fecha actual en la zona horaria especificada
    const currentDate = moment().tz(process.env.TIMEZONE).format('YYYY-MM-DD HH:mm:ss');

    //console.log(`Fecha actual en ${process.env.TIMEZONE}: ${currentDate}`);
    return currentDate
}

async function sp_controller(objeto, data, operacion) {
    let response
    // Construir la cadena SQL para la llamada a la función PostgreSQL
    const sql = jsonToSql(objeto, data, operacion);

    // Ejecutar la consulta
    await db_local.pg.raw(sql).then(async result => {
        response = {
            status: 'success',
            data: result.rows
        };
    }).catch(err => {
        console.log(err)
        let message
        if (err.toString().indexOf('obligatorios') != -1) {
            message = 'Complete los campos obligatorios'
        } else if (err.toString().indexOf('dependencias') != -1) {
            message = 'El registro no puede ser borrado, existen dependencias para este registro'
        } else if (err.toString().indexOf('existe') != -1) {
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
}

async function sp_controller_filter(objeto, data) {
    let response
    // Construir la cadena SQL para la llamada a la función PostgreSQL
    const sql = jsonToSqlFilter(objeto, data);

    // Ejecutar la consulta
    await db_local.pg.raw(sql).then(async result => {
        response = {
            status: 'success',
            data: result.rows
        };
    }).catch(err => {
        console.log(err)
        let message = err.toString()
        response = {
            status: 'error',
            message
        };
    })

    return response;

}

async function sp_controller_list(objeto) {
    var sql = "select * from sp_" + objeto + "_list()";

    await db_local.pg.raw(sql).then(result => {
        response = {
            status: 'success',
            data: result.rows
        };
    }).catch(err => {
        console.log(err)
        let message = err.toString()
        response = {
            status: 'error',
            message
        };
    })

    return response;
}

const formatDate = (date) => {
    return date.toISOString().slice(0, 19).replace('T', ' ');
};

function escapeValue(value) {
    if (value === null || value === undefined) {
        return 'NULL';
    }

    if (Array.isArray(value)) {
        return `ARRAY[${value.map(v => `'${v}'`).join(', ')}]::uuid[]`;
    }

    if (typeof value === 'string') {
        return `'${value.replace(/'/g, "''")}'`; // Escapar comillas simples
    }

    if (value instanceof Date) {
        return `'${formatDate(value)}'`; // Formatear fechas
    }

    return value.toString(); // Convertir otros tipos a string
}

// Función para convertir el JSON en una consulta SQL
function jsonToSql(objeto, data, operacion) {
    let dataEntries = '';

    if (data && Object.keys(data).length > 0) {
        dataEntries = Object.entries(data)
            .map(([key, value]) => `${key}_x => ${escapeValue(value)}`)
            .join(', ');
        dataEntries += ', '; // Agregar coma al final si hay parámetros de datos
    }

    return `SELECT * FROM sp_${objeto}(${dataEntries}operacion => '${operacion}')`;
}

function jsonToSqlFilter(objeto, data) {
    let dataEntries = '';

    if (data && Object.keys(data).length > 0) {
        dataEntries = Object.entries(data)
            .map(([key, value]) => `${key}_x => ${escapeValue(value)}`)
            .join(', ');
    }

    return `SELECT * FROM sp_${objeto}_list_filter(${dataEntries})`;
}

async function conectar_db_cliente() {
    var bd = await db_local.pg.table('empresas').where('status', true)

    var pg = null

    if (bd.length > 0) {
        pg = require("knex")({
            client: "pg",
            connection: {
                host: bd[0].host,
                user: bd[0].usuariodba,
                password: bd[0].password_bd,
                database: bd[0].basededatos,
                port: bd[0].port
            },
            searchPath: [bd[0].basededatos, 'public'],
            pool: {
                min: 0,
                max: 100
            }
        });

        return pg
    } else {
        return pg
    }
}

function verifyJWT(req, res, next) {
    var token = req.headers.authorization.split(' ');
    if (!token) return res.status(415).send({ auth: false, message: 'No token provided.' });
    jwt.verify(token[1], process.env.SECRET, function (err, decoded) {
        if (err) return res.status(415).send({ auth: false, message: 'Failed to authenticate token: ' + err });
        return next(decoded.id, decoded.perfil, token[1]);
    });
}

function cryptPasswordSync(password) {
    var salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(password, salt);
}

function comparePassword(plainPass, hashword, callback) {
    bcrypt.compare(plainPass, hashword, function (err, isPasswordMatch) {
        return err == null ? callback(null, isPasswordMatch) : callback(err);
    });
}

async function emailExists(email, table, id = null) {
    return db.pg.select('*').table(table).where('email', email).where('id', '<>', id).then(function (users) {
        if (users.length === 1) {
            return true;
        } else {
            return false;
        }
    });
}

function validateEmail(email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

function cryptPassword(password, callback) {
    return bcrypt.genSalt(10, function (err, salt) {
        if (err)
            throw callback(err);

        return bcrypt.hash(password, salt, function (err, hash) {
            return callback(err, hash);
        });
    });
}

function simpleRandomHash(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

async function sendMail(bodyParameters) {
    try {

        let response = await axios.post(`${process.env.URL_ENVIO_CORREO}/api/send_mail_test`,
            bodyParameters,
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

        console.log("response prueba mail: ", response.data)

        return { status: "success", message: response.data.message };

    } catch (error) {
        console.error("Error al enviar el correo: ", error.response.data.message);
        return error.response.data.message
    }
}

module.exports = {
    descarga_documento,
    currentDate,
    sp_controller,
    sp_controller_filter,
    sp_controller_list,
    jsonToSql,
    conectar_db_cliente,
    verifyJWT,
    cryptPasswordSync,
    comparePassword,
    emailExists,
    validateEmail,
    cryptPassword,
    simpleRandomHash,
    sendMail
}