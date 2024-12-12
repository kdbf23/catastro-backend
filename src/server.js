require("dotenv").config();
const http = require('http');
const app = require('./app');
const debug = require('debug')('countries:server');

const port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

const server = http.createServer(app);

server.listen(port, '0.0.0.0');  // Escuchar en todas las interfaces IPv4
server.on('error', onError);
server.on('listening', onListening);

function normalizePort(val) {
    const port = parseInt(val, 10);
    if (isNaN(port)) {
        return val;
    }
    if (port >= 0) {
        return port;
    }
    return false;
}

function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }
    const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;
    switch (error.code) {
        case 'EACCES':
            console.error(bind + ' se requieren privilegios elevados');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(bind + ' ya está en uso');
            process.exit(1);
            break;
        default:
            throw error;
    }
}

function onListening() {
    const addr = server.address();
    console.log(`Listening on port ${addr.port}`);
    debug('Listening on ' + addr.port);
}
