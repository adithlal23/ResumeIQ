
const { connectMongo, closeMongo } = require("./mongo");

async function testMongo() {
  try {
    const db = await connectMongo();
    await db.command({ ping: 1 });

    console.log("MongoDB connection verified!");
    console.log("Database:", db.databaseName);
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
  } finally {
    await closeMongo();
  }
}

testMongo();
