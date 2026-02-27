const neo4j = require('neo4j-driver');
const driver = neo4j.driver('bolt://localhost:7687', neo4j.auth.basic('neo4j', 'asdf@123'));
const session = driver.session();

async function removeDefaultVendor() {
  try {
    await session.run('MATCH (t:Taxpayer {name: "Delta Traders"}) DETACH DELETE t');
    console.log('✅ Delta Traders removed');
    
    const result = await session.run('MATCH (t:Taxpayer) RETURN COUNT(t) AS count');
    console.log('Remaining vendors:', result.records[0].get('count').low);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await session.close();
    await driver.close();
  }
}

removeDefaultVendor();
