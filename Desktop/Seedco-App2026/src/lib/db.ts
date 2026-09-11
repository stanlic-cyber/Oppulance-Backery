import { MongoClient } from 'mongodb';

// MongoDB Connection
let mongoClient: MongoClient | null = null;
let mongoDb: any = null;

export async function initMongoDB() {
  if (mongoClient) return mongoDb;

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  mongoClient = new MongoClient(mongoUri);

  try {
    await mongoClient.connect();
    mongoDb = mongoClient.db(process.env.MONGODB_DB || 'seedco');
    console.log('✓ MongoDB connected');
    return mongoDb;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

export const mongodb = {
  getDb: () => mongoDb,
  getCollection: (name: string) => mongoDb?.collection(name),
};

export async function initializeDatabases() {
  try {
    console.log('Initializing databases...');

    try {
      await initMongoDB();
    } catch (err: any) {
      console.warn('⚠ MongoDB unavailable:', err.message);
    }

    console.log('✓ Server initialized (with available databases)');
    return true;
  } catch (error) {
    console.error('Unexpected initialization error:', error);
    return false;
  }
}

export async function closeDatabases() {
  if (mongoClient) await mongoClient.close();
  console.log('All database connections closed');
}
