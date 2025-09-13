import dotenv from 'dotenv';
dotenv.config();

export const env = {
  PORT: process.env.PORT || '5000',
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/teatime',
  JWT_SECRET: process.env.JWT_SECRET || 'dev_secret_change_me',
  JWT_EXPIRES: process.env.JWT_EXPIRES || '1d',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@example.com'
};
