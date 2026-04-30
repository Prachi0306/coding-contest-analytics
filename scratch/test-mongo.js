const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error("MONGODB_URI is not set in .env file");
  process.exit(1);
}

const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 5000,
});

async function run() {
  try {
    console.log("Attempting to connect to:", uri.replace(/:([^:@]{1,})@/, ':****@')); // Hide password
    await client.connect();
    console.log("Connected successfully to server!");
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch (error) {
    console.error("Connection failed.");
    console.error("Error Name:", error.name);
    console.error("Error Message:", error.message);
    if (error.cause) {
        console.error("Error Cause:", error.cause);
    }
  } finally {
    await client.close();
  }
}

run().catch(console.dir);
