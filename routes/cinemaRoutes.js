import express from 'express';
import {
  createCinema,
  getCinemas,
  getBookingQuote,
} from '../controllers/cinemaController.js';

const router = express.Router();

router.post('/', createCinema);
router.get('/', getCinemas);
router.get('/:id/booking', getBookingQuote);

export default router;
