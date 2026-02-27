const neo4j = require('neo4j-driver');
const driver = neo4j.driver('bolt://localhost:7687', neo4j.auth.basic('neo4j', 'asdf@123'));
const session = driver.session();

async function reset() {
  try {
    // Clear all data
    await session.run('MATCH (n) DETACH DELETE n');
    console.log('✅ Database cleared');

    // Recreate vendors
    await session.run('CREATE (fraud:Taxpayer {name: "FraudVendor", riskLevel: "HIGH", riskScore: 200, type: "Taxpayer"})');
    await session.run('CREATE (medium:Taxpayer {name: "MediumVendor", riskLevel: "MEDIUM", riskScore: 100, type: "Taxpayer"})');
    await session.run('CREATE (good:Taxpayer {name: "GoodVendor", riskLevel: "LOW", riskScore: 0, type: "Taxpayer"})');
    console.log('✅ Vendors created');

    // Create invoices
    await session.run('CREATE (i1:Invoice {invoice_id: "INV001", invoice_number: "INV/2024/001", gst_amount: 25000, supplier: "MediumVendor", date: "2024-01-15"})');
    await session.run('CREATE (i2:Invoice {invoice_id: "INV002", invoice_number: "INV/2024/002", gst_amount: 35000, supplier: "GoodVendor", date: "2024-02-10"})');
    await session.run('CREATE (i3:Invoice {invoice_id: "INV003", invoice_number: "INV/2024/003", gst_amount: 20000, supplier: "MediumVendor", date: "2024-03-05"})');
    await session.run('CREATE (i4:Invoice {invoice_id: "INV004", invoice_number: "INV/2024/004", gst_amount: 15000, supplier: "FraudVendor", date: "2024-03-20"})');
    await session.run('CREATE (i5:Invoice {invoice_id: "INV005", invoice_number: "INV/2024/005", gst_amount: 18000, supplier: "FraudVendor", date: "2024-04-01"})');
    await session.run('CREATE (i6:Invoice {invoice_id: "INV006", invoice_number: "INV/2024/006", gst_amount: 22000, supplier: "MediumVendor", date: "2024-04-15"})');
    console.log('✅ Invoices created');

    // Create GSTR3B
    await session.run('CREATE (g1:GSTR3B {period: "Jan-2024", total_itc: 25000})');
    await session.run('CREATE (g2:GSTR3B {period: "Feb-2024", total_itc: 35000})');
    await session.run('CREATE (g3:GSTR3B {period: "Mar-2024", total_itc: 15000})');
    console.log('✅ GSTR3B periods created');

    // Create relationships - RECEIVED
    await session.run('MATCH (fraud:Taxpayer {name: "FraudVendor"}), (i1:Invoice {invoice_id: "INV001"}) CREATE (fraud)-[:RECEIVED]->(i1)');
    await session.run('MATCH (fraud:Taxpayer {name: "FraudVendor"}), (i2:Invoice {invoice_id: "INV002"}) CREATE (fraud)-[:RECEIVED]->(i2)');
    await session.run('MATCH (fraud:Taxpayer {name: "FraudVendor"}), (i3:Invoice {invoice_id: "INV003"}) CREATE (fraud)-[:RECEIVED]->(i3)');
    await session.run('MATCH (medium:Taxpayer {name: "MediumVendor"}), (i5:Invoice {invoice_id: "INV005"}) CREATE (medium)-[:RECEIVED]->(i5)');
    await session.run('MATCH (fraud:Taxpayer {name: "FraudVendor"}), (i6:Invoice {invoice_id: "INV006"}) CREATE (fraud)-[:RECEIVED]->(i6)');
    console.log('✅ RECEIVED relationships created');

    // Create relationships - ISSUED
    await session.run('MATCH (medium:Taxpayer {name: "MediumVendor"}), (i1:Invoice {invoice_id: "INV001"}) CREATE (medium)-[:ISSUED]->(i1)');
    await session.run('MATCH (good:Taxpayer {name: "GoodVendor"}), (i2:Invoice {invoice_id: "INV002"}) CREATE (good)-[:ISSUED]->(i2)');
    await session.run('MATCH (medium:Taxpayer {name: "MediumVendor"}), (i3:Invoice {invoice_id: "INV003"}) CREATE (medium)-[:ISSUED]->(i3)');
    await session.run('MATCH (fraud:Taxpayer {name: "FraudVendor"}), (i4:Invoice {invoice_id: "INV004"}) CREATE (fraud)-[:ISSUED]->(i4)');
    await session.run('MATCH (fraud:Taxpayer {name: "FraudVendor"}), (i5:Invoice {invoice_id: "INV005"}) CREATE (fraud)-[:ISSUED]->(i5)');
    await session.run('MATCH (medium:Taxpayer {name: "MediumVendor"}), (i6:Invoice {invoice_id: "INV006"}) CREATE (medium)-[:ISSUED]->(i6)');
    console.log('✅ ISSUED relationships created');

    // Create relationships - REPORTED_IN
    await session.run('MATCH (i1:Invoice {invoice_id: "INV001"}), (g1:GSTR3B {period: "Jan-2024"}) CREATE (i1)-[:REPORTED_IN]->(g1)');
    await session.run('MATCH (i2:Invoice {invoice_id: "INV002"}), (g2:GSTR3B {period: "Feb-2024"}) CREATE (i2)-[:REPORTED_IN]->(g2)');
    console.log('✅ REPORTED_IN relationships created');

    // Verify
    const vendors = await session.run('MATCH (t:Taxpayer) RETURN COUNT(t) AS count');
    const invoices = await session.run('MATCH (i:Invoice) RETURN COUNT(i) AS count');
    console.log(`\n✅ Setup complete: ${vendors.records[0].get('count').low} vendors, ${invoices.records[0].get('count').low} invoices`);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await session.close();
    await driver.close();
  }
}

reset();
