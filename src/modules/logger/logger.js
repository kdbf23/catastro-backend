// logger.js
const winston = require('winston');
require('winston-daily-rotate-file');
const { format } = winston;
const { combine, timestamp, printf, errors } = format;
const path = require('path');

// Formato de los logs
const logFormat = printf(({ level, message, timestamp, ...meta }) => {
  return `${timestamp} ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
});

// Transporte de archivo con rotación diaria
const dailyRotateFileTransport = new winston.transports.DailyRotateFile({
  filename: path.join(__dirname, 'logs/application-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '50m',
  maxFiles: '15d',
});

const logger = winston.createLogger({
  level: 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }), // Log de errores con stack trace
    logFormat
  ),
  transports: [
    new winston.transports.Console(), // Transporte para la consola
    dailyRotateFileTransport // Transporte para archivo con rotación
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: path.join(__dirname, 'logs/exceptions.log') })
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: path.join(__dirname, 'logs/rejections.log') })
  ]
});

module.exports = logger;
