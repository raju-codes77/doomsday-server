import Cinema, { isValidObjectId } from '../models/Cinema.js';
import { calculateBooking } from '../utils/bookingCalculator.js';

// POST /api/cinemas - Create a cinema
export const createCinema = async (req, res) => {
  try {
    const { name, bundleSizes } = req.body;

    // 1. Validate name
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({
        message: 'Cinema name is required and must be a non-empty string.',
      });
    }

    // 2. Validate bundleSizes array
    if (!bundleSizes || !Array.isArray(bundleSizes)) {
      return res.status(400).json({
        message: 'bundleSizes is required and must be an array of integers.',
      });
    }

    if (bundleSizes.length < 1 || bundleSizes.length > 10) {
      return res.status(400).json({
        message: 'bundleSizes must contain between 1 and 10 bundle sizes.',
      });
    }

    // Check each bundle size is integer between 1 and 500
    for (const size of bundleSizes) {
      if (!Number.isInteger(size) || size < 1 || size > 500) {
        return res.status(400).json({
          message: 'Each bundle size must be an integer between 1 and 500.',
        });
      }
    }

    // Check for duplicate bundle sizes
    const uniqueSizes = new Set(bundleSizes);
    if (uniqueSizes.size !== bundleSizes.length) {
      return res.status(400).json({
        message: 'bundleSizes cannot contain duplicate numbers.',
      });
    }

    // 3. Check duplicate cinema name
    const existing = await Cinema.findOne({ name: name.trim() });
    if (existing) {
      return res.status(409).json({
        message: 'A cinema with this name already exists.',
      });
    }

    // 4. Create and save
    const savedCinema = await Cinema.create({
      name: name.trim(),
      bundleSizes,
    });

    return res.status(201).json(savedCinema);
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to create cinema.',
      error: error.message,
    });
  }
};

// GET /api/cinemas - Get all cinemas
export const getCinemas = async (req, res) => {
  try {
    const cinemas = await Cinema.find();
    return res.status(200).json(cinemas);
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch cinemas.',
      error: error.message,
    });
  }
};

// GET /api/cinemas/:id/booking?groupSize=6 - Get booking quote
export const getBookingQuote = async (req, res) => {
  try {
    const { id } = req.params;
    const { groupSize } = req.query;

    // 1. Validate cinema ID format
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: 'Invalid cinema ID format.',
      });
    }

    // 2. Check cinema exists
    const cinema = await Cinema.findById(id);
    if (!cinema) {
      return res.status(404).json({
        message: 'Cinema not found.',
      });
    }

    // 3. Validate groupSize query parameter
    if (groupSize === undefined) {
      return res.status(400).json({
        message: 'groupSize query parameter is required.',
      });
    }

    const parsedGroupSize = Number(groupSize);
    if (!Number.isInteger(parsedGroupSize) || parsedGroupSize < 1 || parsedGroupSize > 1000) {
      return res.status(400).json({
        message: 'groupSize must be an integer between 1 and 1000.',
      });
    }

    // 4. Calculate optimal ticket bundles
    const result = calculateBooking(cinema.bundleSizes, parsedGroupSize);

    return res.status(200).json({
      cinemaId: cinema._id,
      cinemaName: cinema.name,
      groupSize: parsedGroupSize,
      possible: result.possible,
      totalBundles: result.totalBundles,
      breakdown: result.breakdown,
      ...(result.message && { message: result.message }),
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to calculate booking quote.',
      error: error.message,
    });
  }
};
