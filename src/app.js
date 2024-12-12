const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const moment = require('moment-timezone');
const createError = require('http-errors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const uuid = require('uuid');
const { logger, getErrorInfo } = require('./modules/logger/index');

const userRouter = require('./routes/users/index')
const controllerRouter = require('./routes/controller/index')
const certificadosRouter = require('./routes/certificados/index')
const empresasRouter = require('./routes/empresas/index')

const app = express();

const limiter = rateLimit({
    windowMs: parseInt(process.env.WINDOW_MS) * 60 * 1000, // 10 minutos
    max: parseInt(process.env.MAX_REQUESTS), // Limita cada IP a 100 solicitudes por ventana de tiempo
    message: `Demasiadas solicitudes desde esta dirección IP, por favor inténtalo nuevamente después de ${process.env.WINDOW_MS} minutos` // Mensaje personalizado
});

const corsOptions = {
    origin: (origin, callback) => callback(null, true),
    methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
    optionsSuccessStatus: 200,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'device-remember-token', 'Access-Control-Allow-Origin', 'Origin', 'Accept']
};

// Middleware personalizado para ajustar la hora del registro
/*morgan.token('date', (req, res, tz) => {
    return moment().tz(tz).format('DD/MMM/YYYY:HH:mm:ss ZZ');
});*/

// Usa 'date' con tu zona horaria preferida
const timezone = 'America/Asuncion'; // Ajusta esto a tu huso horario
moment.tz.setDefault(timezone);

//const morganFormat = `:remote-addr - :remote-user [:date[${timezone}]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"`;

//app.use(morgan(morganFormat));
app.use(cors(corsOptions));
app.use(express.json({ limit: "2048mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(helmet());
app.use(compression());
app.use(limiter);

// Middleware personalizado para ajustar la hora del registro
app.use((req, res, next) => {
    req.logger = logger.child({ requestId: uuid.v4() });
    req.logger.info('Request received', {
        method: req.method,
        url: req.originalUrl,
        params: req.params,
        query: req.query,
        body: req.body
    });
    next();
});

//rutas
app.use('/users', userRouter)
app.use('/controller', controllerRouter)
app.use('/certificados', certificadosRouter)
app.use('/empresas', empresasRouter)

app.use((req, res, next) => {
    res.set('Cache-Control', 'public, max-age=3600'); // 1 hora
    next();
});

// Middleware para manejar 404\
app.use((req, res, next) => {
    next(createError(404));
});

// Middleware de manejo de errores
app.use((err, req, res, next) => {
    req.logger.error('Error inesperado', getErrorInfo(err, req));
    res.locals.message = err.message;
    res.status(err.status || 500).json({
        status: "error",
        message: err.message
    });
});

module.exports = app;
