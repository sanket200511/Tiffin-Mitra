const pg = require('pg');
const { Client } = pg;

async function addVerificationColumns() {
  const client = new Client({
    connectionString: "postgresql://postgres_sanket_user:1qV7FEO9pnYWL9tLBOBOKu3vHdZ4or1f@dpg-d7s59gi8qa3s73dtee0g-a.oregon-postgres.render.com/postgres_sanket?ssl=true&search_path=dabba"
  });
  
  try {
    await client.connect();
    console.log("Connected to database.");
    
    await client.query(`
      ALTER TABLE dabba.users 
      ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS verification_code VARCHAR(255),
      ADD COLUMN IF NOT EXISTS verification_expires TIMESTAMPTZ;
    `);
    
    console.log("SUCCESS: Verification columns added safely to dabba.users.");

  } catch (err) {
    console.error("Error adding columns:", err);
  } finally {
    await client.end();
  }
}

addVerificationColumns();
