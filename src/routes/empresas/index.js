var express = require('express');
var router = express.Router();
const multer = require('multer');
const utils = require('../../modules/utilsEmpresas');
const { getErrorInfo } = require('../../modules/logger/index'); // Importa la función auxiliar

// Configuración de multer para la subida de archivos
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/insert', upload.single('logo'), async (req, res, next) => {
    try {
        let data = req.body;
        const logo = req.file;

        let responseInsertEmpresa = await utils.maintenance(data)

        if (responseInsertEmpresa.status != 'success') {
            req.logger.error('Alta Empresa:', getErrorInfo(responseInsertEmpresa, req));
            return res.status(400).json({ status: 'error', message: responseInsertEmpresa.message });
        }

        const folder = `${data.ruc}-${data.dv}`;

        // Crear y subir archivos temporales
        const responseUploadLogo = await utils.uploadToGoogleCloudStorage(logo.buffer, folder);

        if (responseUploadLogo.status != 'success') {
            req.logger.error('Carga Logo:', getErrorInfo(responseUploadLogo, req));
            return res.status(400).json({ status: 'error', message: responseUploadLogo.message });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Registro guardado exitósamente'
        });

    } catch (error) {
        console.log(error)
        next(error)
    }
});

module.exports = router;