const neo4j = require('neo4j-driver');

const driver = neo4j.driver('bolt://localhost:7687', neo4j.auth.basic('neo4j', 'asdf@123'));
const session = driver.session();

const queries = [
  'MERGE (fraud:Taxpayer {name: "FraudVendor"}) SET fraud.riskLevel = "HIGH", fraud.riskScore = 200, fraud.type = "Taxpayer"',
  'MERGE (medium:Taxpayer {name: "MediumVendor"}) SET medium.riskLevel = "MEDIUM", medium.riskScore = 100, medium.type = "Taxpayer"',
  'MERGE (good:Taxpayer {name: "GoodVendor"}) SET good.riskLevel = "LOW", good.riskScore = 0, good.type = "Taxpayer"',
  'CREATE (i1:Invoice {invoice_id: "INV001", invoice_number: "INV/2024/001", gst_amount: 25000, supplier: "MediumVendor", date: "2024-01-15"})',
  'CREATE (i2:Invoice {invoice_id: "INV002", invoice_number: "INV/2024/002", gst_amount: 35000, supplier: "GoodVendor", date: "2024-02-10"})',
  'CREATE (i3:Invoice {invoice_id: "INV003", invoice_number: "INV/2024/003", gst_amount: 20000, supplier: "MediumVendor", date: "2024-03-05"})',
  'CREATE (i4:Invoice {invoice_id: "INV004", invoice_number: "INV/2024/004", gst_amount: 15000, supplier: "FraudVendor", date: "2024-03-20"})',
  'CREATE (i5:Invoice {invoice_id: "INV005", invoice_number: "INV/2024/005", gst_amount: 18000, supplier: "FraudVendor", date: "2024-04-01"})',
  'CREATE (i6:Invoice {invoice_id: "INV006", invoice_number: "INV/2024/006", gst_amount: 22000, supplier: "MediumVendor", date: "2024-04-15"})',
  'CREATE (g1:GSTR3B {period: "Jan-2024", total_itc: 25000})',
  'CREATE (g2:GSTR3B {period: "Feb-2024", total_itc: 35000})',
  'CREATE (g3:GSTR3B {period: "Mar-2024", total_itc: 15000})',
  'MATCH (fraud:Taxpayer {name: "FraudVendor"}), (i1:Invoice {invoice_id: "INV001"}) CREATE (fraud)-[:RECEIVED]->(i1)',
  'MATCH (fraud:Taxpayer {name: "FraudVendor"}), (i2:Invoice {invoice_id: "INV002"}) CREATE (fraud)-[:RECEIVED]->(i2)',
  'MATCH (fraud:Taxpayer {name: "FraudVendor"}), (i3:Invoice {invoice_id: "INV003"}) CREATE (fraud)-[:RECEIVED]->(i3)',
  'MATCH (medium:Taxpayer {name: "MediumVendor"}), (i5:Invoice {invoice_id: "INV005"}) CREATE (medium)-[:RECEIVED]->(i5)',
  'MATCH (fraud:Taxpayer {name: "FraudVendor"}), (i6:Invoice {invoice_id: "INV006"}) CREATE (fraud)-[:RECEIVED]->(i6)',
  'MATCH (medium:Taxpayer {name: "MediumVendor"}), (i1:Invoice {invoice_id: "INV001"}) CREATE (medium)-[:ISSUED]->(i1)',
  'MATCH (good:Taxpayer {name: "GoodVendor"}), (i2:Invoice {invoice_id: "INV002"}) CREATE (good)-[:ISSUED]->(i2)',
  'MATCH (medium:Taxpayer {name: "MediumVendor"}), (i3:Invoice {invoice_id: "INV003"}) CREATE (medium)-[:ISSUED]->(i3)',
  'MATCH (fraud:Taxpayer {name: "FraudVendor"}), (i4:Invoice {invoice_id: "INV004"}) CREATE (fraud)-[:ISSUED]->(i4)',
  'MATCH (fraud:Taxpayer {name: "FraudVendor"}), (i5:Invoice {invoice_id: "INV005"}) CREATE (fraud)-[:ISSUED]->(i5)',
  'MATCH (medium:Taxpayer {name: "MediumVendor"}), (i6:Invoice {invoice_id: "INV006"}) CREATE (medium)-[:ISSUED]->(i6)',
  'MATCH (i1:Invoice {invoice_id: "INV001"}), (g1:GSTR3B {period: "Jan-2024"}) CREATE (i1)-[:REPORTED_IN]->(g1)',
  'MATCH (i2:Invoice {invoice_id: "INV002"}), (g2:GSTR3B {period: "Feb-2024"}) CREATE (i2)-[:REPORTED_IN]->(g2)',
];

async function populate() {
  try {
    for (const query of queries) {
      await session.run(query);
    }
    console.log('✅ Database populated successfully!');
    const result = await session.run('MATCH (t:Taxpayer) RETURN COUNT(t) AS count');
    console.log('Total taxpayers:', result.records[0].get('count'));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await session.close();
    await driver.close();
  }
}

populate();
