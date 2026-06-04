import express from 'express';
import cors from 'cors';
import * as path from 'path';
import router from './routes.js';
import { initStorage } from './storage.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API Router
app.use('/api', router);

// Static frontend distribution serve point
const publicDir = process.env.PUBLIC_DIR || path.join(process.cwd(), 'public');
app.use(express.static(publicDir));

// React SPA fallback routing
app.get('*', (req, res, next) => {
  // If the path starts with /api, let Express handle it normally (should have been matched by router already)
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(publicDir, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('SweetHomePage API Server is online. Frontend assets not found in public folder.');
    }
  });
});

async function main() {
  try {
    console.log('Initializing local configuration storage...');
    await initStorage();
    
    app.listen(PORT, () => {
      console.log(`========================================`);
      console.log(` SweetHomePage running on port ${PORT}`);
      console.log(` Data storage folder: ${path.resolve(process.env.DATA_DIR || './data')}`);
      console.log(` Static public folder: ${path.resolve(publicDir)}`);
      console.log(`========================================`);
    });
  } catch (err) {
    console.error('Critical boot error occurred:', err);
    process.exit(1);
  }
}

main();
