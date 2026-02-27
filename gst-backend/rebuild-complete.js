const neo4j = require('neo4j-driver');
const driver = neo4j.driver('bolt://localhost:7687', neo4j.auth.basic('neo4j', 'asdf@123'));
const session = driver.session();

async function rebuildWithAllVendors() {
  try {
    // Clear everything
    await session.run('MATCH (n) DETACH DELETE n');
    console.log('✅ Database cleared');

    // List of vendors with risk levels
    const vendors = [
      { name: 'FraudVendor', level: 'HIGH', score: 200 },
      { name: 'MediumVendor', level: 'MEDIUM', score: 100 },
      { name: 'GoodVendor', level: 'LOW', score: 0 },
      { name: 'Nova Industries', level: 'LOW', score: 0 },
      { name: 'Apex Traders', level: 'LOW', score: 0 },
      { name: 'Prime Export', level: 'MEDIUM', score: 100 },
      { name: 'Zenith Pvt Ltd', level: 'HIGH', score: 180 }
    ];

    // Create all vendors
    for (const vendor of vendors) {
      await session.run(
        `CREATE (t:Taxpayer {name: $name, riskLevel: $level, riskScore: $score, type: "Taxpayer"})`,
        { name: vendor.name, level: vendor.level, score: vendor.score }
      );
    }
    console.log(`✅ ${vendors.length} vendors created`);

    // Create invoices
    const invoices = [
      { id: 'INV001', num: 'INV/2024/001', gst: 25000, supplier: 'MediumVendor' },
      { id: 'INV002', num: 'INV/2024/002', gst: 35000, supplier: 'GoodVendor' },
      { id: 'INV003', num: 'INV/2024/003', gst: 20000, supplier: 'MediumVendor' },
      { id: 'INV004', num: 'INV/2024/004', gst: 15000, supplier: 'FraudVendor' },
      { id: 'INV005', num: 'INV/2024/005', gst: 18000, supplier: 'FraudVendor' },
      { id: 'INV006', num: 'INV/2024/006', gst: 22000, supplier: 'MediumVendor' },
      { id: 'INV007', num: 'INV/2024/007', gst: 30000, supplier: 'Nova Industries' },
      { id: 'INV008', num: 'INV/2024/008', gst: 28000, supplier: 'Prime Export' }
    ];

    for (const inv of invoices) {
      await session.run(
        `CREATE (i:Invoice {invoice_id: $id, invoice_number: $num, gst_amount: $gst, supplier: $supplier, date: "2024-04-01"})`,
        { id: inv.id, num: inv.num, gst: inv.gst, supplier: inv.supplier }
      );
    }
    console.log(`✅ ${invoices.length} invoices created`);

    // Create GSTR3B
    await session.run('CREATE (g1:GSTR3B {period: "Jan-2024", total_itc: 25000})');
    await session.run('CREATE (g2:GSTR3B {period: "Feb-2024", total_itc: 35000})');
    await session.run('CREATE (g3:GSTR3B {period: "Mar-2024", total_itc: 15000})');
    console.log('✅ GSTR3B periods created');

    // Create RECEIVED relationships
    const received = [
      { vendor: 'FraudVendor', invoice: 'INV001' },
      { vendor: 'FraudVendor', invoice: 'INV002' },
      { vendor: 'FraudVendor', invoice: 'INV003' },
      { vendor: 'MediumVendor', invoice: 'INV005' },
      { vendor: 'FraudVendor', invoice: 'INV006' },
      { vendor: 'Prime Export', invoice: 'INV007' },
      { vendor: 'Zenith Pvt Ltd', invoice: 'INV008' }
    ];

    for (const r of received) {
      await session.run(
        `MATCH (t:Taxpayer {name: $vendor}), (i:Invoice {invoice_id: $invoice}) CREATE (t)-[:RECEIVED]->(i)`,
        { vendor: r.vendor, invoice: r.invoice }
      );
    }
    console.log('✅ RECEIVED relationships created');

    // Create ISSUED relationships
    const issued = [
      { vendor: 'MediumVendor', invoice: 'INV001' },
      { vendor: 'GoodVendor', invoice: 'INV002' },
      { vendor: 'MediumVendor', invoice: 'INV003' },
      { vendor: 'FraudVendor', invoice: 'INV004' },
      { vendor: 'FraudVendor', invoice: 'INV005' },
      { vendor: 'MediumVendor', invoice: 'INV006' },
      { vendor: 'Nova Industries', invoice: 'INV007' },
      { vendor: 'Prime Export', invoice: 'INV008' }
    ];

    for (const i of issued) {
      await session.run(
        `MATCH (t:Taxpayer {name: $vendor}), (inv:Invoice {invoice_id: $invoice}) CREATE (t)-[:ISSUED]->(inv)`,
        { vendor: i.vendor, invoice: i.invoice }
      );
    }
    console.log('✅ ISSUED relationships created');

    // Create REPORTED_IN
    await session.run('MATCH (i:Invoice {invoice_id: "INV001"}), (g:GSTR3B {period: "Jan-2024"}) CREATE (i)-[:REPORTED_IN]->(g)');
    await session.run('MATCH (i:Invoice {invoice_id: "INV002"}), (g:GSTR3B {period: "Feb-2024"}) CREATE (i)-[:REPORTED_IN]->(g)');
    console.log('✅ REPORTED_IN relationships created');

    // Create TRADES_WITH for vendor connections
    const trades = [
      { from: 'MediumVendor', to: 'FraudVendor' },
      { from: 'FraudVendor', to: 'MediumVendor' },
      { from: 'GoodVendor', to: 'FraudVendor' },
      { from: 'Prime Export', to: 'Zenith Pvt Ltd' },
      { from: 'Zenith Pvt Ltd', to: 'Prime Export' },
      { from: 'Nova Industries', to: 'Apex Traders' },
      { from: 'FraudVendor', to: 'Prime Export' }
    ];

    for (const t of trades) {
      await session.run(
        `MATCH (a:Taxpayer {name: $from}), (b:Taxpayer {name: $to}) CREATE (a)-[:TRADES_WITH]->(b)`,
        { from: t.from, to: t.to }
      );
    }
    console.log('✅ TRADES_WITH relationships created');

    // Verify
    const v = await session.run('MATCH (t:Taxpayer) RETURN COUNT(t) AS count');
    const inv = await session.run('MATCH (i:Invoice) RETURN COUNT(i) AS count');
    const rel = await session.run('MATCH ()-[r]->() RETURN COUNT(r) AS count');
    
    console.log(`\n✅ Setup complete:`);
    console.log(`   Vendors: ${v.records[0].get('count').low}`);
    console.log(`   Invoices: ${inv.records[0].get('count').low}`);
    console.log(`   Relationships: ${rel.records[0].get('count').low}`);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await session.close();
    await driver.close();
  }
}

rebuildWithAllVendors();
