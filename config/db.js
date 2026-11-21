import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

let db = null;
let client = null;

export const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;

    if (!mongoURI) {
      throw new Error('MONGODB_URI is not defined in the environment variables');
    }

    client = new MongoClient(mongoURI);
    await client.connect();
    db = client.db('doomsday');

    // Ensure unique indexes
    await db.collection('movies').createIndex({ title: 1 }, { unique: true });
    await db.collection('cinemas').createIndex({ name: 1 }, { unique: true });

    console.log('MongoDB connected successfully');
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

export const getDB = () => {
  if (!db) {
    throw new Error('Database not initialized. Please call connectDB first.');
  }
  return db;
};

export default connectDB;
