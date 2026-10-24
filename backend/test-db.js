
const pool = require("./db");

async function testConnection() {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      "SELECT DATABASE() AS databaseName"
    );

    console.log("MySQL connected successfully!");
    console.log("Database:", rows[0].databaseName);

    connection.release();
  } catch (error) {
    console.error("MySQL connection failed:", error.message);
  } finally {
    await pool.end();
  }
}

testConnection();
