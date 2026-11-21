import { ObjectId } from 'mongodb';
import Movie, { isValidObjectId } from '../models/Movie.js';
import { hasCircularDependency, calculateRewatchOrder } from '../utils/rewatchOrder.js';

// POST /api/movies - Create a new movie
export const createMovie = async (req, res) => {
  try {
    const { title, releaseYear, runtime, prerequisites, watched, posterUrl } = req.body;

    // 1. Basic presence validation
    if (!title || releaseYear === undefined || runtime === undefined) {
      return res.status(400).json({
        message: 'Title, releaseYear, and runtime are required.',
      });
    }

    // Validate title is a non-empty string
    if (typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({
        message: 'Title must be a non-empty string.',
      });
    }

    // 2. Validate releaseYear is an integer
    if (!Number.isInteger(releaseYear)) {
      return res.status(400).json({
        message: 'releaseYear must be a valid integer.',
      });
    }

    // 3. Validate runtime is an integer between 1 and 300
    if (!Number.isInteger(runtime) || runtime < 1 || runtime > 300) {
      return res.status(400).json({
        message: 'runtime must be an integer between 1 and 300.',
      });
    }

    // 4. Validate prerequisites if provided
    if (prerequisites !== undefined) {
      if (!Array.isArray(prerequisites)) {
        return res.status(400).json({
          message: 'prerequisites must be an array of movie IDs.',
        });
      }

      // Check each prerequisite is a valid MongoDB ObjectId
      for (const id of prerequisites) {
        if (!isValidObjectId(id)) {
          return res.status(400).json({
            message: `Invalid prerequisite movie ID: ${id}`,
          });
        }
      }

      // Check for duplicate IDs inside prerequisites array
      const uniquePrereqs = [...new Set(prerequisites.map(String))];
      if (uniquePrereqs.length !== prerequisites.length) {
        return res.status(400).json({
          message: 'prerequisites cannot contain duplicate movie IDs.',
        });
      }

      // Check that all prerequisite movies actually exist in database
      if (uniquePrereqs.length > 0) {
        const objectIds = uniquePrereqs.map((id) => new ObjectId(id));
        const count = await Movie.countDocuments({ _id: { $in: objectIds } });
        if (count !== uniquePrereqs.length) {
          return res.status(400).json({
            message: 'One or more prerequisite movies do not exist in the database.',
          });
        }
      }
    }

    // 5. Check for duplicate movie title
    const existingMovie = await Movie.findOne({ title: title.trim() });
    if (existingMovie) {
      return res.status(409).json({
        message: 'A movie with this title already exists.',
      });
    }

    // 6. Create and save the movie
    const savedMovie = await Movie.create({
      title: title.trim(),
      releaseYear,
      runtime,
      posterUrl: posterUrl ?? null,
      prerequisites: prerequisites || [],
      watched: watched ?? false,
    });

    return res.status(201).json(savedMovie);
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to create movie.',
      error: error.message,
    });
  }
};

// GET /api/movies - Get all movies with populated prerequisites
export const getMovies = async (req, res) => {
  try {
    const movies = await Movie.getCollection()
      .aggregate([
        {
          $lookup: {
            from: 'movies',
            localField: 'prerequisites',
            foreignField: '_id',
            pipeline: [
              {
                $project: {
                  title: 1,
                  releaseYear: 1,
                  runtime: 1,
                  watched: 1,
                  posterUrl: 1,
                },
              },
            ],
            as: 'prerequisites',
          },
        },
      ])
      .toArray();

    return res.status(200).json(movies);
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch movies.',
      error: error.message,
    });
  }
};

// PATCH /api/movies/:id - Update a movie
export const updateMovie = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Validate movie ID format
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: 'Invalid movie ID format.',
      });
    }

    // 2. Check movie exists
    const movie = await Movie.findById(id);
    if (!movie) {
      return res.status(404).json({
        message: 'Movie not found.',
      });
    }

    const { title, releaseYear, runtime, prerequisites, watched, posterUrl } = req.body;
    const updateFields = {};

    if (posterUrl !== undefined) {
      updateFields.posterUrl = posterUrl;
    }

    // 3. Validate title if provided
    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim() === '') {
        return res.status(400).json({
          message: 'Title must be a non-empty string.',
        });
      }

      // Check duplicate title with other movies
      const duplicate = await Movie.findOne({
        title: title.trim(),
        _id: { $ne: new ObjectId(id) },
      });

      if (duplicate) {
        return res.status(409).json({
          message: 'Another movie with this title already exists.',
        });
      }

      updateFields.title = title.trim();
    }

    // 4. Validate releaseYear if provided
    if (releaseYear !== undefined) {
      if (!Number.isInteger(releaseYear)) {
        return res.status(400).json({
          message: 'releaseYear must be a valid integer.',
        });
      }
      updateFields.releaseYear = releaseYear;
    }

    // 5. Validate runtime if provided
    if (runtime !== undefined) {
      if (!Number.isInteger(runtime) || runtime < 1 || runtime > 300) {
        return res.status(400).json({
          message: 'runtime must be an integer between 1 and 300.',
        });
      }
      updateFields.runtime = runtime;
    }

    // 6. Validate watched if provided
    if (watched !== undefined) {
      if (typeof watched !== 'boolean') {
        return res.status(400).json({
          message: 'watched must be a boolean value.',
        });
      }
      updateFields.watched = watched;
    }

    // 7. Validate prerequisites if provided
    if (prerequisites !== undefined) {
      if (!Array.isArray(prerequisites)) {
        return res.status(400).json({
          message: 'prerequisites must be an array of movie IDs.',
        });
      }

      // Check valid ObjectIds
      for (const prereqId of prerequisites) {
        if (!isValidObjectId(prereqId)) {
          return res.status(400).json({
            message: `Invalid prerequisite movie ID: ${prereqId}`,
          });
        }
      }

      // Prevent self-dependency
      if (prerequisites.some((prereqId) => String(prereqId) === String(id))) {
        return res.status(409).json({
          code: 'CIRCULAR_DEPENDENCY',
          message: 'This change would create a circular dependency.',
        });
      }

      // Check duplicates inside array
      const uniquePrereqs = [...new Set(prerequisites.map(String))];
      if (uniquePrereqs.length !== prerequisites.length) {
        return res.status(400).json({
          message: 'prerequisites cannot contain duplicate movie IDs.',
        });
      }

      // Make sure all prerequisite movies exist in database
      if (uniquePrereqs.length > 0) {
        const objectIds = uniquePrereqs.map((pId) => new ObjectId(pId));
        const count = await Movie.countDocuments({ _id: { $in: objectIds } });
        if (count !== uniquePrereqs.length) {
          return res.status(400).json({
            message: 'One or more prerequisite movies do not exist in the database.',
          });
        }
      }

      // Check circular dependency (direct and indirect)
      const isCircular = await hasCircularDependency(id, uniquePrereqs);
      if (isCircular) {
        return res.status(409).json({
          code: 'CIRCULAR_DEPENDENCY',
          message: 'This change would create a circular dependency.',
        });
      }

      updateFields.prerequisites = uniquePrereqs.map((pId) => new ObjectId(pId));
    }

    const updatedMovie = await Movie.updateOne(id, updateFields);
    return res.status(200).json(updatedMovie);
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to update movie.',
      error: error.message,
    });
  }
};

// GET /api/movies/:id/rewatch-order - Get rewatch order for a movie
export const getRewatchOrder = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate movie ID format
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: 'Invalid movie ID format.',
      });
    }

    const result = await calculateRewatchOrder(id);
    if (!result) {
      return res.status(404).json({
        message: 'Movie not found.',
      });
    }

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to calculate rewatch order.',
      error: error.message,
    });
  }
};

// DELETE /api/movies/:id - Delete a movie
export const deleteMovie = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: 'Invalid movie ID format.',
      });
    }

    const movie = await Movie.findById(id);
    if (!movie) {
      return res.status(404).json({
        message: 'Movie not found.',
      });
    }

    await Movie.deleteOne(id);
    return res.status(200).json({
      message: 'Movie deleted successfully.',
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to delete movie.',
      error: error.message,
    });
  }
};
