const utils = require('../modules/utils');
const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');
const forge = require('node-forge');
const { Storage } = require('@google-cloud/storage');
const tmp = require('tmp');

async function insertData(empresa, certData, usuario) {
    try {

        let data = {
            empresa,
            emisor: certData.emisor,
            titular: certData.titular,
            fecha_emision: certData.fecha_emision,
            fecha_vencimiento: certData.fecha_vencimiento,
            serial_number: certData.serialNumber,
            usuario
        }

        const response = await utils.sp_controller('certificados', data, 'A');

        if (response.status === 'success') {
            return { status: 'success', message: 'Información del certificado guardada correctamente' }
        } else {
            console.error('Error al insertar los datos:', response.message);
            return { status: 'error', message: response.message }
        }

    } catch (error) {
        console.log(error)
        throw new Error('Error al guardar la información del certificado');
    }
}

async function createAndUploadTempFiles(keyData, folder) {
    // Crear archivos temporales para las claves y el PIN
    const privateKeyPath = tmp.tmpNameSync({ postfix: '.pem' });
    const publicKeyPath = tmp.tmpNameSync({ postfix: '.pem' });
    const pinFilePath = tmp.tmpNameSync({ postfix: '.txt' });
    const p12FilePath = tmp.tmpNameSync({ postfix: '.p12' });

    fs.writeFileSync(privateKeyPath, keyData.privateKey);
    fs.writeFileSync(publicKeyPath, keyData.publicKey);
    fs.writeFileSync(pinFilePath, keyData.pin);  // Guardar el PIN en un archivo de texto
    fs.writeFileSync(p12FilePath, keyData.certP12, 'binary');  // Guardar el archivo .p12 en formato binario

    // Subir claves y PIN a Google Cloud Storage en la carpeta específica
    await uploadToGoogleCloudStorage(publicKeyPath, `${folder}/publicKey.pem`);
    await uploadToGoogleCloudStorage(privateKeyPath, `${folder}/privateKey.pem`);
    await uploadToGoogleCloudStorage(pinFilePath, `${folder}/pin.txt`);  // Subir el archivo del PIN
    await uploadToGoogleCloudStorage(p12FilePath, `${folder}/cert.p12`);  // Subir el archivo .p12

    // Eliminar archivos temporales
    fs.unlinkSync(privateKeyPath);
    fs.unlinkSync(publicKeyPath);
    fs.unlinkSync(pinFilePath);
    fs.unlinkSync(p12FilePath);

    return { status: 'success', message: 'Llaves y certificado subidos al storage exitosamente' };
}

async function uploadToGoogleCloudStorage(filePath, destinationPath) {

    try {
        //Crea una instancia de Google Cloud Storage usando la clave de la cuenta de servicio

        const storage = new Storage({
            projectId: process.env.PROYECT_ID,
            keyFilename: process.env.PATH_STORAGE_KEY // Ruta al archivo JSON de la clave de la cuenta de servicio
        });

        const bucket = storage.bucket(process.env.BUCKET_NAME);
        const result = await bucket.upload(filePath, {
            destination: destinationPath,
            metadata: {
                contentType: "application/x-pem-file", // Ajusta el tipo de contenido según sea necesario
            }
        });
        return { status: 'success', message: result[0].metadata.mediaLink }
    } catch (error) {
        console.log("error: ", error)
        throw new Error("Error al subir las claves al storage");
    }
}


async function convertAndExtractKeys(certBuffer, pin, originalFilename) {
    return new Promise((resolve, reject) => {
        tmp.dir({ unsafeCleanup: true }, (err, tempDir, cleanupCallback) => {
            if (err) {
                return reject(err);
            }

            // Determinar el nombre del archivo a usar
            let certPath = path.join(tempDir, 'cert.pfx');
            if (path.extname(originalFilename).toLowerCase() === '.p12') {
                certPath = path.join(tempDir, 'cert.pfx');
            }

            const keyTxtPath = path.join(tempDir, 'key.txt');
            const privateKeyPath = path.join(tempDir, 'privatekey.pem');
            const publicKeyPath = path.join(tempDir, 'publickey.pem');
            const certP12Path = path.join(tempDir, 'cert.p12');

            // Guardar el buffer en un archivo temporal
            fs.writeFileSync(certPath, certBuffer);

            const cmd1 = `openssl pkcs12 -in ${certPath} -legacy -nodes -passin pass:${pin} > ${keyTxtPath}`;
            const cmd2 = `awk '/BEGIN PRIVATE KEY/,/END PRIVATE KEY/' ${keyTxtPath} > ${privateKeyPath}`;
            const cmd3 = `awk '/BEGIN CERTIFICATE/,/END CERTIFICATE/ {print} /END CERTIFICATE/ {exit}' ${keyTxtPath} > ${publicKeyPath}`;
            const cmd4 = `openssl pkcs12 -export -out ${certP12Path} -in ${publicKeyPath} -inkey ${privateKeyPath} -passin pass:${pin} -passout pass:${pin}`;

            exec(`${cmd1} && ${cmd2} && ${cmd3} && ${cmd4}`, (error, stdout, stderr) => {
                if (error) {
                    cleanupCallback();
                    return reject(`Error: ${stderr}`);
                }

                const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
                const publicKey = fs.readFileSync(publicKeyPath, 'utf8');
                const certP12 = fs.readFileSync(certP12Path, 'binary');

                cleanupCallback();
                resolve({
                    privateKey,
                    publicKey,
                    pin,
                    certP12
                });
            });
        });
    });
}

async function validatePin(certBuffer, pin) {
    try {
        const p12Asn1 = forge.asn1.fromDer(certBuffer.toString('binary'));
        forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, pin);
        return { valid: true };
    } catch (error) {
        return { valid: false, message: 'PIN incorrecto' };
    }
}

async function getCertificateData(certBuffer, pin) {
    try {
        const p12Asn1 = forge.asn1.fromDer(certBuffer.toString('binary'));
        const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, pin);

        const bags = p12.getBags({ bagType: forge.pki.oids.certBag });
        const certBag = bags[forge.pki.oids.certBag][0];

        const certificate = certBag.cert;

        const emisor = certificate.issuer.attributes.find(attr => attr.shortName === 'CN').value;
        const titular = certificate.subject.attributes.find(attr => attr.shortName === 'CN').value;
        const fecha_emision = certificate.validity.notBefore;
        const fecha_vencimiento = certificate.validity.notAfter;
        const serialNumber = certificate.serialNumber;

        return {
            emisor,
            titular,
            fecha_emision,
            fecha_vencimiento,
            serialNumber
        };
    } catch (error) {
        console.error(error);
        throw new Error('Error al obtener los datos del certificado');
    }
}

module.exports = {
    insertData,
    validatePin,
    getCertificateData,
    convertAndExtractKeys,
    createAndUploadTempFiles,
    uploadToGoogleCloudStorage
}