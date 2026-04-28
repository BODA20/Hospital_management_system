import dotenv from 'dotenv';
import path from 'path';

// Load .env.test from the project root
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });
