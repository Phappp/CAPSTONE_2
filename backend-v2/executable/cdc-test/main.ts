import { config } from 'dotenv';
import { Pipeline } from './pipeline';
import { LogSink } from './sink/log_sink';
import AppDataSource from '../../lib/database';

config();

async function main() {
  await AppDataSource.initialize();
  console.log('Database connected');
  console.log('Post and Tag entities have been removed');

  // Post-related CDC test has been disabled
  // const source = new PostSource();
  // const sink = new LogSink();
  // const pipline = new Pipeline(source, sink, []);
  // await pipline.run();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});