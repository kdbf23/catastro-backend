// logHelpers.js
function getErrorInfo(err, req) {
    return {
        route: req.originalUrl,
        message: err.message,
        stack: err.stack,
        params: req.params,
        query: req.query,
        body: req.body,
        headers: req.headers,
        ip: req.ip,
        referer: req.get('referer'),
        userAgent: req.get('User-Agent'),
        time: new Date().toISOString()
    };
}

/*
Explicación
req.headers: Captura todos los encabezados de la solicitud.
req.ip: Captura la dirección IP del cliente.
req.method: Captura el método HTTP de la solicitud.
req.originalUrl: Captura la URL completa de la solicitud.
req.get('referer'): Captura la página de referencia desde la cual el usuario llegó.
req.get('User-Agent'): Captura información sobre el cliente que hizo la solicitud.
new Date().toISOString(): Captura la hora en que se recibió la solicitud o ocurrió el error.
*/

module.exports = {
    getErrorInfo
};
