const utils = require('../modules/utils');
const { Storage } = require('@google-cloud/storage');
const { exec, spawn } = require('child_process');
const path = require('path');

// Función que envuelve spawn en una promesa para ver la salida en tiempo real
function spawnPromesa(comando, args, password) {
    return new Promise((resolve, reject) => {
        const childProcess = spawn(comando, args, { env: { ...process.env, PGPASSWORD: password } });

        // Capturar la salida estándar (stdout) en tiempo real
        childProcess.stdout.on('data', (data) => {
            console.log(`Salida: ${data}`);
        });

        // Capturar la salida de error (stderr) en tiempo real
        childProcess.stderr.on('data', (data) => {
            console.error(`Error: ${data}`);
        });

        // Escuchar cuando el proceso termina
        childProcess.on('close', (code) => {
            if (code === 0) {
                resolve('Restauración completada con éxito.');
            } else {
                reject(`El proceso terminó con código ${code}`);
            }
        });
    });
}

function execPromesa(comando, password) {
    return new Promise((resolve, reject) => {
        exec(comando, { env: { ...process.env, PGPASSWORD: password } }, (error, stdout, stderr) => {
            if (error) {
                reject(`Error ejecutando psql: ${error.message}`);
                return;
            }
            if (stderr) {
                reject(`Error en la ejecución de psql: ${stderr}`);
                return;
            }
            resolve(stdout);
        });
    });
}

async function maintenance(data) {
    try {

        let dataInsert = {
            ruc: data.ruc,
            dv: data.dv,
            razon_social: data.razon_social,
            servidor: data.servidor,
            usuario: data.usuario
        }

        const response = await utils.sp_controller(data.objeto, dataInsert, data.operacion);

        if (response.status === 'success') {
            return { status: 'success', message: 'Empresa registrada correctamente' }
        } else {
            console.error('Error al insertar los datos:', response.message);
            return { status: 'error', message: response.message }
        }

    } catch (error) {
        console.log(error)
        return { status: 'error', message: error.toString() }
    }
}

async function uploadToGoogleCloudStorage(logoBuffer, folder) {

    try {
        //Crea una instancia de Google Cloud Storage usando la clave de la cuenta de servicio

        const storage = new Storage({
            projectId: process.env.PROYECT_ID,
            keyFilename: process.env.PATH_STORAGE_KEY // Ruta al archivo JSON de la clave de la cuenta de servicio
        });

        const bucket = storage.bucket(process.env.BUCKET_NAME);
        const file = bucket.file(`${folder}/logo.png`);

        // Sube el archivo directamente desde el buffer
        await file.save(logoBuffer, {
            metadata: {
                contentType: 'image/png' // Solo estamos aceptando archivos PNG
            }
        });

        return { status: 'success', message: 'Logo subido al storage exitosamente' };
    } catch (error) {
        console.log("error: ", error)
        throw new Error("Error al subir el archivo al storage");
    }
}

module.exports = {
    maintenance,
    uploadToGoogleCloudStorage
}
