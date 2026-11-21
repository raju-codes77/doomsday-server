import express from 'express';
import {
  createMovie,
  getMovies,
  updateMovie,
  getRewatchOrder,
  deleteMovie,
} from '../controllers/movieController.js';

const router = express.Router();

router.post('/', createMovie);
router.get('/', getMovies);
router.patch('/:id', updateMovie);
router.get('/:id/rewatch-order', getRewatchOrder);
router.delete('/:id', deleteMovie);

export default router;
