const neo4j = require('neo4j-driver');
const driver = neo4j.driver('bolt://localhost:7687', neo4j.auth.basic('neo4j', 'asdf@123'));
const session = driver.session();

async function addRelationships() {
  try {
    // Create TRADES_WITH relationships between vendors based on invoices
    
    // FraudVendor receives from MediumVendor (invoices INV001, INV003)
    await session.run('MATCH (fraud:Taxpayer {name: "FraudVendor"}), (medium:Taxpayer {name: "MediumVendor"}) CREATE (medium)-[:TRADES_WITH {type: "supplier"}]->(fraud)');
    
    // FraudVendor receives from GoodVendor (invoice INV002)
    await session.run('MATCH (fraud:Taxpayer {name: "FraudVendor"}), (good:Taxpayer {name: "GoodVendor"}) CREATE (good)-[:TRADES_WITH {type: "supplier"}]->(fraud)');
    
    // MediumVendor receives from FraudVendor (invoice INV005) - Circular trading
    await session.run('MATCH (fraud:Taxpayer {name: "FraudVendor"}), (medium:Taxpayer {name: "MediumVendor"}) CREATE (fraud)-[:TRADES_WITH {type: "supplier"}]->(medium)');
    
    console.log('✅ Vendor relationships created');
    
    // Verify relationships
    const rel = await session.run('MATCH (a:Taxpayer)-[r:TRADES_WITH]->(b:Taxpayer) RETURN COUNT(r) AS count');
    console.log(`✅ Total relationships: ${rel.records[0].get('count').low}`);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await session.close();
    await driver.close();
  }
}

addRelationships();
