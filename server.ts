import { app } from './app';
import db from './src/config/db';
db.raw('SELECT 1')
  .then(() => console.log('Database connected successfully'))
  .catch((err) => console.error('Database connection error:', err));
app.listen(3000, () => {
  console.log('Server started on port 3000');
});
