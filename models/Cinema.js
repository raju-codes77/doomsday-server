import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';

export const isValidObjectId = (id) => {
  if (!id) return false;
  const str = String(id);
  return ObjectId.isValid(str) && new ObjectId(str).toString() === str;
};

const getCollection = () => {
  return getDB().collection('cinemas');
};

const Cinema = {
  getCollection,

  create: async (data) => {
    const doc = {
      name: data.name.trim(),
      bundleSizes: data.bundleSizes,
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
};

export default Cinema;
