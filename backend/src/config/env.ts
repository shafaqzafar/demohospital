import dotenv from 'dotenv'

dotenv.config()

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 4000),
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hospital_dev',
  JWT_SECRET: process.env.JWT_SECRET || 'dev_secret_change_me',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  BACKUP_DIR: process.env.BACKUP_DIR || 'backups',
  BACKUP_RETENTION_COUNT: Number(process.env.BACKUP_RETENTION_COUNT || 30),
  BACKUP_CRON: process.env.BACKUP_CRON || '0 2 * * *', // daily at 02:00
  ADMIN_KEY: process.env.ADMIN_KEY || 'admin_key_change_me',
}
