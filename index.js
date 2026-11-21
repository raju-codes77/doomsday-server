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

// Start server only after successful database connection
const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Doomsday Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
