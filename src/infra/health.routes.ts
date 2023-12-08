import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.send('OK');
});

export { router as healthRouter };
