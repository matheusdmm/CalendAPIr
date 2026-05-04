import 'dotenv/config';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import calendarRouter from './routes/calendarRouter.js';
import { initializeDb } from './db/database.js';

const startServer = async () => {
  try {
    await initializeDb();

    const app = new Koa();

    app.use(bodyParser({
      enableTypes: ['json', 'text'],
      extendTypes: { text: ['text/calendar'] },
    }));

    app.use(calendarRouter.routes()).use(calendarRouter.allowedMethods());

    const PORT = Number(process.env.PORT) || 3000;
    app.listen(PORT, () => {
      console.log(`🚀 API @ http://localhost:${PORT}/api/v1/calendar/`);
    });
  } catch (err) {
    console.error('❌ Server or DB could not load:', err);
    process.exit(1);
  }
};

startServer();
