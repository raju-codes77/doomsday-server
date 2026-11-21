import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';

export const isValidObjectId = (id) => {
  if (!id) return false;
  const str = String(id);
  return ObjectId.isValid(str) && new ObjectId(str).toString() === str;
};

const getCollection = () => {
  return getDB().collection('movies');
};

const Movie = {
  getCollection,

  create: async (data) => {
    const prereqObjectIds = (data.prerequisites || []).map((id) =>
      id instanceof ObjectId ? id : new ObjectId(String(id))
    );

    const doc = {
      title: data.title.trim(),
      releaseYear: data.releaseYear,
      runtime: data.runtime,
      posterUrl: data.posterUrl ?? null,
      prerequisites: prereqObjectIds,
      watched: data.watched ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await getCollection().insertOne(doc);
    return { _id: result.insertedId, ...doc };
  },

  findById: async (id) => {
    if (!isValidObjectId(id)) return null;
    return await getCollection().findOne({ _id: new ObjectId(String(id)) });
  },

  findOne: async (query) => {
    return await getCollection().findOne(query);
  },

  find: async (query = {}) => {
    return await getCollection().find(query).toArray();
  },

  countDocuments: async (query = {}) => {
    return await getCollection().countDocuments(query);
  },

  updateOne: async (id, updateFields) => {
    if (!isValidObjectId(id)) return null;

    const updateDoc = { ...updateFields, updatedAt: new Date() };
    if (updateDoc.prerequisites) {
      updateDoc.prerequisites = updateDoc.prerequisites.map((pId) =>
        pId instanceof ObjectId ? pId : new ObjectId(String(pId))
      );
    }

    await getCollection().updateOne(
      { _id: new ObjectId(String(id)) },
      { $set: updateDoc }
    );

    return await getCollection().findOne({ _id: new ObjectId(String(id)) });
  },

  deleteOne: async (id) => {
    if (!isValidObjectId(id)) return null;
    const result = await getCollection().deleteOne({ _id: new ObjectId(String(id)) });
    return result.deletedCount > 0;
  },
};

export default Movie;
