const pg = require('pg');
const { Client } = pg;

async function checkTables() {
  const client = new Client({
    connectionString: "postgresql://postgres_sanket_user:1qV7FEO9pnYWL9tLBOBOKu3vHdZ4or1f@dpg-d7s59gi8qa3s73dtee0g-a.oregon-postgres.render.com/postgres_sanket?ssl=true"
  });
  
  try {
    await client.connect();
    console.log("Connected to database.");
    
    const res = await client.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'dabba' OR table_name = 'users'
      ORDER BY table_schema, table_name;
    `);
    
    console.log("Tables found:");
    console.table(res.rows);
    
    const schemaRes = await client.query(`SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'dabba';`);
    console.log("Schema 'dabba' exists:", schemaRes.rows.length > 0);

  } catch (err) {
    console.error("Error checking tables:", err);
  } finally {
    await client.end();
  }
}

checkTables();
