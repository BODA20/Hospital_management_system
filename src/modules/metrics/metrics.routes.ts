import express from 'express';
import { getMetricsSummary } from './controllers/metrics.controller';
import { protect, restrictTo } from '../../common/middleware/auth';

const router = express.Router();

router.use(protect);
router.use(restrictTo('admin'));

router.route('/summary').get(getMetricsSummary);

export default router;
