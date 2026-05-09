const pg = require('pg');
const { Client } = pg;

async function deepScan() {
  const client = new Client({
    connectionString: "postgresql://postgres_sanket_user:1qV7FEO9pnYWL9tLBOBOKu3vHdZ4or1f@dpg-d7s59gi8qa3s73dtee0g-a.oregon-postgres.render.com/postgres_sanket?ssl=true"
  });
  
  try {
    await client.connect();
    console.log("Connected for Deep Scan.");
    
    const res = await client.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
      ORDER BY table_schema, table_name;
    `);
    
    console.log("ALL TABLES IN DATABASE:");
    console.table(res.rows);
    
    const schemaRes = await client.query(`SELECT schema_name FROM information_schema.schemata;`);
    console.log("ALL SCHEMAS:");
    console.table(schemaRes.rows);

  } catch (err) {
    console.error("Deep Scan Error:", err);
  } finally {
    await client.end();
  }
}

deepScan();
