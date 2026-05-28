import winston from 'winston';
import path from 'path';

const logDirectory = path.join(process.cwd(), 'logs');

const logger = winston.createLogger({
  level: 'info', 
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), 
    winston.format.json() 
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(), 
        winston.format.simple()    
      )
    }),


    new winston.transports.File({ 
      filename: path.join(logDirectory, 'error.log'), 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: path.join(logDirectory, 'combined.log') 
    })
  ],
});

export default logger;