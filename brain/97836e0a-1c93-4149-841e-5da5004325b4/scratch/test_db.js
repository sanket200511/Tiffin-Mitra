import pg from 'pg';
const { Client } = pg;

const url = "postgresql://neondb_owner:npg_bzYHg2M1eDSG@ep-bitter-mode-aplz1m1i.c-7.us-east-1.aws.neon.tech/dabba?sslmode=require";

async function test() {
  const client = new Client({ connectionString: url });
  try {
    console.log("Connecting to:", url);
    await client.connect();
    console.log("Connected successfully!");
    const res = await client.query('SELECT 1');
    console.log("Query result:", res.rows);
  } catch (err) {
    console.error("Connection failed:", err);
  } finally {
    await client.end();
  }
}

test();
