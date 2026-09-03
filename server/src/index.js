import { createApp } from './app.js';
import { config } from './config.js';
import { dbFilePath } from './db/index.js';

const app = createApp();

app.listen(config.port, () => {
  console.log(`AVSAR API listening on http://localhost:${config.port}  [${config.env}]`);
  console.log(`Database: ${dbFilePath}`);
});
