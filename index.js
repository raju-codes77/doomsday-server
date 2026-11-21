import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import movieRoutes from './routes/movieRoutes.js';
import cinemaRoutes from './routes/cinemaRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Ensure database connection middleware for serverless/local
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(500).json({ message: 'Database connection failed', error: err.message });
  }
});

// Routes
app.use('/api/movies', movieRoutes);
app.use('/api/cinemas', cinemaRoutes);

// Health check route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Doomsday Server is running!',
  });
});

// Start server locally when not running as a Vercel serverless function
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Doomsday Server running on port ${PORT}`);
  });
}

export default app;
