import { Router } from 'express';

const router = Router();

router.post('/weekly', async (_req, res) => {
  res.json({
    message: 'AI insights are generated via Claude Code CLI sessions. Use the /api/stats endpoints to pull your data.',
    hint: 'Ask Claude: "Analyze my Pulse data for this week"',
  });
});

export default router;
