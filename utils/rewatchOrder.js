import Movie from '../models/Movie.js';

/**
 * Checks if adding proposedPrerequisites to a movie creates a circular dependency.
 * @param {string} targetMovieId - The ID of the movie being created or updated
 * @param {Array<string>} proposedPrerequisites - The list of prerequisite IDs
 * @returns {Promise<boolean>} - true if a cycle is detected, false otherwise
 */
export const hasCircularDependency = async (targetMovieId, proposedPrerequisites) => {
  if (!proposedPrerequisites || proposedPrerequisites.length === 0) {
    return false;
  }

  const targetIdStr = String(targetMovieId);

  // 1. Direct self-dependency check
  for (const prereqId of proposedPrerequisites) {
    if (String(prereqId) === targetIdStr) {
      return true;
    }
  }

  // 2. Indirect cycle check using Depth-First Search (DFS)
  // We check if any prerequisite can lead back to targetMovieId
  const visited = new Set();

  const dfs = async (currentMovieId) => {
    const currentIdStr = String(currentMovieId);

    // If we reached the target movie, a cycle exists
    if (currentIdStr === targetIdStr) {
      return true;
    }

    // Already explored this branch with no cycle
    if (visited.has(currentIdStr)) {
      return false;
    }

    visited.add(currentIdStr);

    // Fetch current movie's existing prerequisites from database
    const movie = await Movie.findById(currentMovieId);
    if (!movie || !movie.prerequisites || movie.prerequisites.length === 0) {
      return false;
    }

    // Check each of its prerequisites recursively
    for (const nextPrereqId of movie.prerequisites) {
      const cycleFound = await dfs(nextPrereqId);
      if (cycleFound) {
        return true;
      }
    }

    return false;
  };

  // Run DFS starting from each proposed prerequisite
  for (const prereqId of proposedPrerequisites) {
    const cycleFound = await dfs(prereqId);
    if (cycleFound) {
      return true;
    }
  }

  return false;
};

/**
 * Calculates the complete rewatch order for a target movie using post-order DFS.
 * Every prerequisite appears before any movie that depends on it.
 * The target movie itself is excluded.
 * @param {string} targetMovieId - ID of the target movie
 * @returns {Promise<object>} - Object with targetMovie, movies, watchedCount, totalMovies, remainingRuntime
 */
export const calculateRewatchOrder = async (targetMovieId) => {
  const targetMovie = await Movie.findById(targetMovieId);
  if (!targetMovie) {
    return null;
  }

  const orderedMovies = [];
  const visited = new Set();

  // Helper DFS function to traverse prerequisites bottom-up
  const visit = async (movieId) => {
    const idStr = String(movieId);

    // Skip if already added to avoid duplicates
    if (visited.has(idStr)) {
      return;
    }

    visited.add(idStr);

    const movie = await Movie.findById(movieId);
    if (!movie) {
      return;
    }

    // First visit all prerequisites of this movie
    if (movie.prerequisites && movie.prerequisites.length > 0) {
      for (const prereqId of movie.prerequisites) {
        await visit(prereqId);
      }
    }

    // After all prerequisites are added, add this movie (exclude the main target movie)
    if (idStr !== String(targetMovieId)) {
      orderedMovies.push(movie);
    }
  };

  // Start traversal from the direct prerequisites of the target movie
  if (targetMovie.prerequisites && targetMovie.prerequisites.length > 0) {
    for (const prereqId of targetMovie.prerequisites) {
      await visit(prereqId);
    }
  }

  // Calculate statistics
  const totalMovies = orderedMovies.length;
  const watchedCount = orderedMovies.filter((m) => m.watched).length;
  const remainingRuntime = orderedMovies
    .filter((m) => !m.watched)
    .reduce((total, m) => total + (m.runtime || 0), 0);

  return {
    targetMovie: {
      id: targetMovie._id,
      title: targetMovie.title,
    },
    movies: orderedMovies,
    watchedCount,
    totalMovies,
    remainingRuntime,
  };
};
