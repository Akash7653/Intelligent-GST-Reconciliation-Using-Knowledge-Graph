const neo4j = require('neo4j-driver');
const driver = neo4j.driver('bolt://localhost:7687', neo4j.auth.basic('neo4j', 'asdf@123'));
const session = driver.session();

Promise.all([
  session.run('MATCH (v:Vendor {risk_level: "HIGH"}) RETURN COUNT(v) as count'),
  session.run('MATCH (v:Vendor {risk_level: "MEDIUM"}) RETURN COUNT(v) as count'),
  session.run('MATCH (v:Vendor {risk_level: "LOW"}) RETURN COUNT(v) as count'),
  session.run('MATCH (i:Invoice) RETURN COUNT(i) as count'),
  session.run('MATCH (i:Invoice) WHERE NOT (i)-[:REPORTED_IN]->(:GSTR3B) RETURN SUM(i.gst_amount) as leakage')
]).then(results => {
  console.log('\n📊 DATABASE VERIFICATION:');
  console.log('========================');
  console.log('HIGH RISK Vendors: ' + results[0].records[0].get('count').toNumber());
  console.log('MEDIUM RISK Vendors: ' + results[1].records[0].get('count').toNumber());
  console.log('LOW RISK Vendors: ' + results[2].records[0].get('count').toNumber());
  console.log('Total Vendors: ' + (results[0].records[0].get('count').toNumber() + results[1].records[0].get('count').toNumber() + results[2].records[0].get('count').toNumber()));
  console.log('\nTotal Invoices Created: ' + results[3].records[0].get('count').toNumber());
  console.log('Total ITC Leakage: ₹' + results[4].records[0].get('leakage').toNumber().toLocaleString('en-IN'));
  console.log('========================\n');
  session.close();
  driver.close();
}).catch(err => {
  console.error('Error:', err);
  session.close();
  driver.close();
  process.exit(1);
});
