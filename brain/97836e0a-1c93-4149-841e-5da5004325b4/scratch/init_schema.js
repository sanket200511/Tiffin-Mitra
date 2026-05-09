import pg from 'pg';
const { Client } = pg;

// Use the URL from env
const url = "postgresql://postgres_sanket_user:1qV7FEO9pnYWL9tLBOBOKu3vHdZ4or1f@dpg-d7s59gi8qa3s73dtee0g-a.oregon-postgres.render.com/postgres_sanket?ssl=true";

async function initSchema() {
  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    console.log("Connected to Render DB.");
    await client.query('CREATE SCHEMA IF NOT EXISTS dabba;');
    console.log("Schema 'dabba' created or already exists.");
  } catch (err) {
    console.error("Failed to create schema:", err);
  } finally {
    await client.end();
  }
}

initSchema();
