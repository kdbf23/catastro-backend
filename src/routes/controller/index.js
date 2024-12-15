let express = require('express');
let router = express.Router();
const utils = require('../../modules/utils');
const axios = require('axios');
const FormData = require('form-data');
const db_externa = require('../../modules/db/db_externa');
const cron = require('node-cron');

// Programar la tarea cada 5 minutos
//cron.schedule('*/5 * * * *', () => {
//    console.log("Buscando documentos pendientes...");
//    envio_documentos();
//});

//envio_documentos();

async function envio_documentos() {

    try {

        let solicitudes = await db_externa.pg.raw(`select sr.*
            from solicitud_resultado sr
            join solicitud_servicio ss 
            on ss.id = sr.id_solicitud_servicio 
            where ss.finalizado is false
            and sr.verificado is true
            and sr.id_dataflow is null`)

        console.log("Solicitudes: ", solicitudes.rows.length)

        let solicitudes_servicios = await db_externa.pg.raw(`select id,
            ss.finalizado,
            ss.formulario->'departamento_descripcion'->>'value' AS "Departamento",
            ss.formulario->'distrito_descripcion'->>'value' AS "Distrito"
            from solicitud_servicio ss 
            where ss.finalizado is false
                and ss.formulario->'departamento'->>'value' = 'A'
                and ss.formulario->'distrito'->>'value'= '1' limit 1`)

        console.log("solicitudes resultados: ", solicitudes_servicios.rows)

        let firmante = await db_externa.pg.table('usuario')
            .select('id', 'nombre', 'apellido', 'mail')
            .where('es_recurrente', false).whereRaw("lower(nombre) like lower('%karina%')")
            .first()

        console.log("firmante: ", firmante)

        if (solicitudes.rows.length > 0) {

            for (const solicitud of solicitudes.rows) {

                console.log("Solicitud: ", solicitud.id_solicitud_servicio)

                console.log("Documento: ", solicitud.nombre_documento)

                let response_solicitud = await utils.descarga_documento(solicitud.id_solicitud_servicio)

                if (response_solicitud.status == 'success') {

                    const data = new FormData();

                    data.append('file', response_solicitud.solicitudBuffer, {
                        filename: `${solicitud.nombre_documento}.pdf`, // Nombre del archivo
                        contentType: 'application/pdf', // Tipo MIME
                    });

                    let config = {
                        method: 'post',
                        maxBodyLength: Infinity,
                        url: process.env.URL_DATAFLOW + '/uploads',
                        headers: {
                            'x-api-key': process.env.X_API_KEY,
                            ...data.getHeaders()
                        },
                        data: data
                    };

                    await axios.request(config)
                        .then(async (response) => {
                            console.log("Response upload: ", response.data);

                            let dataflow_id = response.data.id

                            let data = JSON.stringify({
                                "files": [
                                    {
                                        "displayName": `${solicitud.id_solicitud_servicio}-${solicitud.id}-${solicitud.nombre_documento}`,
                                        "id": dataflow_id,
                                        "name": `${solicitud.nombre_documento}.pdf`,
                                        "contentType": "application/pdf"
                                    }
                                ],
                                "flowActions": [
                                    {
                                        "type": "Signer",
                                        "step": 1,
                                        "user": {
                                            "name": firmante.nombre + " " + firmante.apellido,
                                            "identifier": "1152429",
                                            "email": firmante.mail
                                        }
                                    }
                                ]
                            });

                            let config = {
                                method: 'post',
                                maxBodyLength: Infinity,
                                url: process.env.URL_DATAFLOW + '/documents',
                                headers: {
                                    'x-api-key': process.env.X_API_KEY,
                                    'Content-Type': 'application/json'
                                },
                                data: data
                            };

                            await axios.request(config)
                                .then(async (response) => {
                                    console.log("Response upload documents: ", response.data);

                                    await db_externa.pg.table('solicitud_resultado')
                                        .update({
                                            id_dataflow: dataflow_id
                                        }).where('id', solicitud.id)

                                    console.log("Solicitud actualizada")

                                })
                                .catch((error) => {
                                    console.log(error);
                                });
                        })
                        .catch((error) => {
                            console.log(error);
                        });


                    console.log(`Documento enviado: ${solicitud.nombre_documento}`)
                } else {
                    console.log(response_solicitud.message)
                }
            }

        } else {
            console.log("No hay solicitudes")
        }

    } catch (error) {
        console.log(error)
    }
}

router.post('/inject', async (req, res, next) => {

    try {
        let data = req.body.data
        let operacion = req.body.operacion
        let objeto = req.body.objeto

        await utils.sp_controller(objeto, data, operacion)
            .then((response) => {
                if (response.status == 'success') {
                    return res.status(200).json({
                        status: "success",
                        data: response.data
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

router.post('/getList', async (req, res, next) => {
    try {
        let objeto = req.body.objeto

        utils.sp_controller_list(objeto)
            .then((response) => {
                if (response.status == 'success') {
                    return res.status(200).json({
                        status: "success",
                        data: response.data
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

router.post('/getListFilter', async (req, res, next) => {

    try {
        let data = req.body.data
        let objeto = req.body.objeto

        utils.sp_controller_filter(objeto, data)
            .then((response) => {
                if (response.status == 'success') {
                    return res.status(200).json({
                        status: "success",
                        data: response.data
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

router.post('/send-test-correo', async (req, res, next) => {

    try {
        let data = req.body.data

        let responseSendMail = await utils.sendMail(data)

        if (responseSendMail.status == 'success') {
            return res.status(200).json({
                status: "success",
                message: responseSendMail.message
            });
        } else {
            return res.status(400).json({
                status: "error",
                message: responseSendMail.message
            });
        }

    } catch (error) {
        console.log("error al enviar correo: ", error.response.data)
        return res.status(400).json({
            status: "error",
            message: error.response.data
        });
    }
})

module.exports = router;