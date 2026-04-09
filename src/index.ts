import { startServer } from './server';

if (require.main === module) {
  void startServer();
}

export { startServer };
