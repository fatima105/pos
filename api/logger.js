const { createLogger, format, transports } = require('winston');
const path = require('path');

const logger = createLogger({
  level: 'error', // log only errors
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    new transports.File({ filename: path.join(__dirname, 'error.log') })
  ],
});

module.exports = logger;
