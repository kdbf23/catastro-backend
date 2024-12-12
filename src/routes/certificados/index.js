var express = require('express');
var router = express.Router();
const multer = require('multer');
const tmp = require('tmp');
const fs = require('fs');
const db = require('../../modules/db/db_local');
const utils = require('../../modules/utilsCertificados');
const { getErrorInfo } = require('../../modules/logger/index'); // Importa la función auxiliar

router.get('/list', async (req, res, next) => {

    try {
        var certificados = await db.pg.table('certificados as c')
            .select('c.id', 'e.razon_social', 'c.emisor', 'c.titular',
                db.pg.raw(`TO_CHAR(c.fecha_emision, 'DD/MM/YYYY HH24:MI:SS') as fecha_emision`),
                db.pg.raw(`TO_CHAR(c.fecha_vencimiento, 'DD/MM/YYYY HH24:MI:SS') as fecha_vencimiento`))
            .join('empresas as e', 'e.id', 'c.empresa')
            .orderBy('c.created_at', 'desc')

        return res.status(200).json({
            status: "success",
            data: certificados
        });

    } catch (error) {
        console.log(error)
        next(error)
    }
})

// Configuración de multer para la subida de archivos
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/insert', upload.single('file'), async (req, res, next) => {
    try {
        const { pin, empresa, usuario } = req.body;
        const certBuffer = req.file.buffer;
        const originalFilename = req.file.originalname;

        if (!certBuffer || !pin) {
            return res.status(400).json({
                status: 'error',
                message: 'Archivo y PIN son requeridos'
            });
        }

        // Validar el PIN
        const pinValidation = await utils.validatePin(certBuffer, pin);
        if (!pinValidation.valid) {
            req.logger.error('Carga Certificado:', getErrorInfo(pinValidation, req));
            return res.status(400).json({ status: 'error', message: pinValidation.message });
        }

        // Obtener los datos de la empresa
        let empresaData = await db.pg.table('empresas').where('id', empresa).select('ruc', 'dv');

        if (!empresaData || empresaData.length === 0) {
            req.logger.error('Carga Certificado:', getErrorInfo('Empresa no encontrada', req));
            return res.status(400).json({ status: 'error', message: 'Empresa no encontrada' });
        }

        // Obtener las llaves
        const keyData = await utils.convertAndExtractKeys(certBuffer, pin, originalFilename);

        const ruc = empresaData[0].ruc;
        const dv = empresaData[0].dv;
        const folder = `${ruc}-${dv}`;

        // Crear y subir archivos temporales
        const responseUploadCertificado = await utils.createAndUploadTempFiles(keyData, folder);

        if (responseUploadCertificado.status != 'success') {
            req.logger.error('Carga Certificado:', getErrorInfo(responseUploadCertificado, req));
            return res.status(400).json({ status: 'error', message: responseUploadCertificado.message });
        }

        // Obtener los datos del certificado
        const certData = await utils.getCertificateData(certBuffer, pin);

        let responseInsertCertificado = await utils.insertData(empresa, certData, usuario)

        if (responseInsertCertificado.status != 'success') {
            req.logger.error('Carga Certificado:', getErrorInfo(responseInsertCertificado, req));
            return res.status(400).json({ status: 'error', message: 'El certificado ya existe' });
        }

        req.logger.info('Carga Certificado:', getErrorInfo(responseUploadCertificado, req));

        // Responder con los datos del certificado
        return res.status(200).json({
            status: 'success',
            message: 'Certificado validado exitósamente'
        });

    } catch (error) {
        console.log(error)
        next(error)
    }
});

module.exports = router;