
const { MongoClient } = require("mongodb");
require("dotenv").config();

const client = new MongoClient(
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017"
);

let database;

async function connectMongo() {
  if (database) return database;

  await client.connect();
  database = client.db(process.env.MONGODB_NAME || "resumeiq");

  console.log("MongoDB connected successfully!");
  return database;
}

async function closeMongo() {
  await client.close();
  database = null;
}

module.exports = { connectMongo, closeMongo };

