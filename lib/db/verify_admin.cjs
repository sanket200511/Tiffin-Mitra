const pg = require('pg');
const { Client } = pg;

async function verifyAdmin() {
  const client = new Client({
    connectionString: "postgresql://postgres_sanket_user:1qV7FEO9pnYWL9tLBOBOKu3vHdZ4or1f@dpg-d7s59gi8qa3s73dtee0g-a.oregon-postgres.render.com/postgres_sanket?ssl=true&search_path=dabba"
  });
  
  try {
    await client.connect();
    console.log("Connected to database.");
    
    const email = 'sanketkurve.2005@gmail.com';
    
    await client.query(
      `UPDATE dabba.users SET email_verified = true WHERE email = $1;`,
      [email]
    );
    
    console.log(`SUCCESS: User ${email} is now marked as email_verified.`);

  } catch (err) {
    console.error("Error verifying admin:", err);
  } finally {
    await client.end();
  }
}

verifyAdmin();
