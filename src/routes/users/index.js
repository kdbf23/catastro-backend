const express = require('express');
const router = express.Router();
const aes256 = require('aes256');
const jwt = require('jsonwebtoken');
const db = require('../../modules/db/db_local');
const utils = require('../../modules/utils');
const utilsUsuarios = require('../../modules/utilsUsuarios');
const { getErrorInfo } = require('../../modules/logger/index');

router.post('/controller', async (req, res, next) => {

    try {
        let data = req.body.data
        let operacion = req.body.operacion
        let objeto = req.body.objeto

        await utilsUsuarios.sp_controller(objeto, data, operacion)
            .then((response) => {
                if (response.status == 'success') {
                    return res.status(200).json({
                        status: response.status
                    });
                } else {
                    return res.status(400).json({
                        status: "error",
                        message: response.message
                    });
                }

            })
    } catch (error) {
        console.log(error)
        next(error)
    }
})

router.post('/getListPerfiles', async (req, res, next) => {

    try {
        let perfiles = await db.pg.select('p.id', 'p.perfil', 'p.desc_perfil')
            .table('usuario as u')
            .join('usuario_perfiles as up', 'u.id', 'up.user_id')
            .join('perfiles as p', 'up.perfil_id', 'p.id')
            .where('u.email', req.body.email)

        return res.status(200).json({
            status: "success",
            data: perfiles
        });

    } catch (error) {
        next(error); // Pasa el error al middleware de manejo de errores
    }

})

router.post('/login', async function (req, res, next) {

    try {

        let username = aes256.decrypt(process.env.APP_KEY_PASS, req.body.username);
        let pass = aes256.decrypt(process.env.APP_KEY_PASS, req.body.pass);

        const users = await db.pg.select('*').table('usuario')
            .where('active', true).where('email', username).orWhere('username', username)

        if (users.length == 0) {
            return res.status(200).send({
                error: [{
                    type: "email",
                    message: "Verifique su usuario"
                }]
            });
        } else {

            utils.comparePassword(pass.replace(/ /g, ''), users[0].password, async function (err, result) {
                if (result === false) {
                    return res.status(200).send({
                        error: [{
                            type: "password",
                            message: "Verifique su contraseña"
                        }]
                    });
                } else {

                    const user_profile = await db.pg.select('perfiles.perfil').table('usuario_perfiles')
                        .join('usuario', 'usuario.id', 'usuario_perfiles.user_id')
                        .join("perfiles", "perfiles.id", "usuario_perfiles.perfil_id")
                        .where('user_id', users[0].id)

                    const id = users[0].id;
                    const perfil = user_profile[0].perfil;
                    let token = jwt.sign({ id, perfil }, process.env.SECRET, {
                        expiresIn: 300000
                    });

                    let user = getUser(id, perfil);
                    user.then((u) => {
                        if (!u) {
                            return res.status(200).send({
                                status: "error",
                                message: "El usuario no existe"
                            });
                        } else {
                            return res.status(200).send({ user: u, access_token: token });
                        }
                    });
                }
            })
        }
    } catch (error) {
        req.logger.error(`Error ${req.originalUrl}`, getErrorInfo(error, req));
        //console.log(error.message)
        return res.status(200).send({
            error: [{
                type: "password",
                message: error.message
            }]
        });
    }

});

router.post('/loginemail', async function (req, res, next) {

    try {
        let email = aes256.decrypt(process.env.APP_KEY_PASS, req.body.username);
        let perfil = aes256.decrypt(process.env.APP_KEY_PASS, req.body.perfil);

        const users = await db.pg.table('usuario').where('email', email)

        const id = users[0].id;
        let token = jwt.sign({ id, perfil }, process.env.SECRET, {
            expiresIn: 300000
        });

        let user = getUser(id, perfil);
        user.then((u) => {
            if (!u) {
                return res.status(200).send({
                    status: "error",
                    message: "El usuario no existe"
                });
            } else {
                return res.status(200).send({ user: u, access_token: token });
            }
        });
    } catch (error) {
        next(error); // Pasa el error al middleware de manejo de errores
    }

});

function getUser(id, perfil) {
    return new Promise((resolve, reject) => {
        db.pg.table('usuario as u')
            .select(
                'u.username',
                'u.email',
                'p.perfil',
                'e.razon_social',
                'e.ruc',
                'e.id as id_empresa',
                db.pg.raw(`COALESCE(
            json_agg(
                json_build_object(
                    'cod_privilegio', pr.codigo
                )
            ) FILTER (WHERE pr.codigo IS NOT NULL AND pp.active is true), '[]'
        ) AS privilegios`)
            )
            .join('empresas as e', 'e.id', 'u.empresa')
            .join('usuario_perfiles as up', 'up.user_id', 'u.id')
            .join('perfiles as p', 'p.id', 'up.perfil_id')
            .leftJoin('perfiles_privilegios as pp', 'pp.perfil_id', 'p.id')
            .leftJoin('privilegios as pr', 'pr.id', 'pp.privilegio_id')
            .where('u.id', id)
            .andWhere('p.perfil', perfil)
            .groupBy('u.username', 'u.email', 'p.perfil', 'e.razon_social', 'e.id')
            .then(function (users) {
                if (users.length === 0) {
                    reject(false);
                } else {

                    let user = {
                        role: [users[0].perfil],
                        data: {
                            'username': users[0].username,
                            'displayName': users[0].razon_social,
                            'email': users[0].email,
                            'photoURL': users[0].avatar,
                            'empresa': users[0].id_empresa,
                            'ruc_empresa': users[0].ruc,
                            'privilegios': users[0].privilegios,
                            shortcuts: [
                                'calendar',
                                'mail',
                                'contacts',
                                'todo'
                            ]
                        }
                    };
                    resolve(user);
                }
            });
    });
}

//token access
router.get('/access-token', function (req, res, next) {
    return utils.verifyJWT(req, res, (id, perfil, token) => {
        let user = getUser(id, perfil);
        user.then((u) => {
            if (!u) {
                return res.status(404).send('User not found!');
            } else {
                return res.status(200).send({ user: u, access_token: token });
            }
        });
    });
});

router.post('/check-change-pwd', async (req, res, next) => {
    const data = await db.pg('usuario')
        .select(
            'change_pwd'
        )
        .where('email', req.body.email)
    return res.json({
        data: data[0]
    })
})


router.post("/password-reset", async (req, res, next) => {

    const password = utils.simpleRandomHash(10)
    const cryptedPassword = utils.cryptPasswordSync(password)

    await db.pg
        .table("usuario")
        .where("id", req.body.id)
        .update({
            password: cryptedPassword
        })
        .then(async () => {
            let empleado = await db.pg("employee").where("user_id", req.body.id)

            let message = 'Reseteo contraseña de usuario: ' + empleado[0].email;
            utils.insertLogs(req.body.creator, message, 'Reset de contraseña', 'INFO');

            let emailData = {
                email: empleado[0].email,
                nombres: empleado[0].nombres,
                apellidos: empleado[0].apellidos,
                password: password,
            }

            await EnviaEmail(emailData, 'notification-reset-pass')
                .then(async response => {
                    console.log(response)
                    if (response.data.status == 'success') {
                        return res.status(200).json({
                            status: 'success',
                            message: "Contraseña reseteada exitósamente!"
                        })
                    } else {
                        return res.status(200).json({
                            status: 'success',
                            message: response
                        })
                    }

                }).catch(e => {
                    console.log(e.error)
                    utils.insertLogs(req.body.creator, e.error, 'Reset de contraseña', 'ERROR');
                    return res.status(400).json({
                        status: 'error',
                        message: e.error
                    })
                })

        })
        .catch(e => {
            console.log('Users UPDATE ERR ', e)
            utils.insertLogs(req.body.creator, e.error, 'Reset de contraseña', 'ERROR');
            return res.status(400).json({
                status: 'error',
                message: e.error
            })
        })
})

router.post("/desactivate", async (req, res, next) => {

    await db.pg
        .table("usuario")
        .where("id", req.body.id)
        .update({
            active: req.body.active
        })
        .then(async () => {
            let usuario = await db.pg("usuario").where("id", req.body.id)
            let response

            if (req.body.active == 0) {
                response = "Usuario desactivado exitósamente!";
                let message = 'Desactivacion de usuario ' + usuario[0].email + "/" + usuario[0].name;
                utils.insertLogs(req.body.creator, message, 'Acceso de Usuario', 'INFO');
            } else {
                let message = 'Activacion de usuario ' + usuario[0].email + "/" + usuario[0].name;
                utils.insertLogs(req.body.creator, message, 'Acceso de Usuario', 'INFO');
                response = "Usuario activado exitósamente!";
            }

            return res.status(200).json({
                status: 'success',
                message: response
            })
        })
        .catch(e => {
            console.log('Users UPDATE ERR ', e)
            return res.status(400).json({
                status: 'error',
                message: e.error
            })
        })
})

router.get('/user-list', async (req, res, next) => {
    const data = await db.pg('usuario')
    res.json({
        status: 'success',
        data: data
    })
})

router.post('/change-password', async (req, res, next) => {
    utils.insertLogs(req.body.email, 'Usuario: ' + req.body.email, 'Cambio de contraseña', 'INFO');
    utils.cryptPassword(req.body.password, async (err, password) => {
        await db.pg('usuario')
            .where('email', req.body.email)
            .update({
                password,
                change_pwd: false,
            })
            .then(() => {
                return res.json({
                    status: 'success',
                    data: 'Contraseña actualizada con éxito',
                })
            })
            .catch(e => {
                console.log('ERROR changing password: ', e)
                return res.json({
                    status: 'error',
                })
            })
    })
})

module.exports = router;