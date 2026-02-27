const neo4j = require("neo4j-driver");

const driver = neo4j.driver(
  "bolt://localhost:7687",
  neo4j.auth.basic("neo4j", "asdf@123")
);

async function populateDatabase() {
  const session = driver.session();

  try {
    console.log("🗑️  Clearing existing data...");
    await session.run("MATCH (n) DETACH DELETE n");

    console.log("📊 Creating comprehensive GST dataset...\n");

    // Create Taxpayers (Base entities)
    const taxpayers = [
      { id: "TP001", name: "ABC Manufacturing Ltd", gst: "27AADCA9603R1Z5" },
      { id: "TP002", name: "XYZ Trading Corp", gst: "18AABCT1234R1Z0" },
      { id: "TP003", name: "Prime Logistics Inc", gst: "29ABCDE1234F1Z5" },
      { id: "TP004", name: "Digital Solutions Ltd", gst: "07ABCDE1234F1Z5" },
      { id: "TP005", name: "Global Suppliers", gst: "22AABCT1234R1Z0" },
    ];

    console.log("Creating taxpayers...");
    for (const tp of taxpayers) {
      await session.run(
        "CREATE (t:Taxpayer {id: $id, name: $name, gst_number: $gst})",
        tp
      );
    }

    // Create HIGH RISK vendors (Fraudulent - no GSTR3B filed)
    const highRiskVendors = [
      { id: "V001", name: "ShadowTrade Systems", risk: "HIGH", created_date: "2023-01-15" },
      { id: "V002", name: "Ghost Commerce Ltd", risk: "HIGH", created_date: "2023-02-20" },
      { id: "V003", name: "Phantom Enterprises", risk: "HIGH", created_date: "2023-03-10" },
      { id: "V004", name: "Mystery Goods Co", risk: "HIGH", created_date: "2023-04-05" },
      { id: "V005", name: "Unknown Supplies Inc", risk: "HIGH", created_date: "2023-05-12" },
      { id: "V006", name: "Invisible Trading", risk: "HIGH", created_date: "2023-06-18" },
      { id: "V007", name: "Cryptic Business Ltd", risk: "HIGH", created_date: "2023-07-22" },
      { id: "V008", name: "Black Market Services", risk: "HIGH", created_date: "2023-08-30" },
    ];

    console.log("Creating HIGH RISK vendors...");
    for (const vendor of highRiskVendors) {
      await session.run(
        "CREATE (v:Vendor {id: $id, name: $name, risk_level: $risk, created_date: $created_date})",
        vendor
      );
    }

    // Create MEDIUM RISK vendors (Partial compliance - some invoices reported)
    const mediumRiskVendors = [
      { id: "V009", name: "Partial Traders Inc", risk: "MEDIUM", created_date: "2023-09-08" },
      { id: "V010", name: "Inconsistent Supply Co", risk: "MEDIUM", created_date: "2023-10-14" },
      { id: "V011", name: "Selective Compliance Ltd", risk: "MEDIUM", created_date: "2023-11-25" },
      { id: "V012", name: "Mixed Reports Services", risk: "MEDIUM", created_date: "2023-12-03" },
      { id: "V013", name: "Irregular Commerce Ltd", risk: "MEDIUM", created_date: "2024-01-10" },
      { id: "V014", name: "Sporadic Vendors Inc", risk: "MEDIUM", created_date: "2024-02-15" },
    ];

    console.log("Creating MEDIUM RISK vendors...");
    for (const vendor of mediumRiskVendors) {
      await session.run(
        "CREATE (v:Vendor {id: $id, name: $name, risk_level: $risk, created_date: $created_date})",
        vendor
      );
    }

    // Create LOW RISK vendors (Fully compliant)
    const lowRiskVendors = [
      { id: "V015", name: "Reliable Suppliers Ltd", risk: "LOW", created_date: "2023-01-20" },
      { id: "V016", name: "Compliant Trading Co", risk: "LOW", created_date: "2023-02-25" },
      { id: "V017", name: "Trusted Vendors Inc", risk: "LOW", created_date: "2023-03-15" },
      { id: "V018", name: "Certified Trade Solutions", risk: "LOW", created_date: "2023-04-22" },
      { id: "V019", name: "Legitimate Goods Ltd", risk: "LOW", created_date: "2023-05-18" },
      { id: "V020", name: "Honest Business Corp", risk: "LOW", created_date: "2023-06-28" },
      { id: "V021", name: "Standard Export Co", risk: "LOW", created_date: "2023-07-10" },
      { id: "V022", name: "Regular Suppliers Inc", risk: "LOW", created_date: "2023-08-15" },
    ];

    console.log("Creating LOW RISK vendors...");
    for (const vendor of lowRiskVendors) {
      await session.run(
        "CREATE (v:Vendor {id: $id, name: $name, risk_level: $risk, created_date: $created_date})",
        vendor
      );
    }

    // Create HIGH VOLUME INVOICES with realistic GST values
    console.log("Creating invoices and relationships...");

    // Invoice data with amounts
    const invoiceTemplates = [
      { amount: 50000, gst: 9000 },
      { amount: 75000, gst: 13500 },
      { amount: 100000, gst: 18000 },
      { amount: 125000, gst: 22500 },
      { amount: 150000, gst: 27000 },
      { amount: 200000, gst: 36000 },
      { amount: 250000, gst: 45000 },
      { amount: 300000, gst: 54000 },
      { amount: 400000, gst: 72000 },
      { amount: 500000, gst: 90000 },
    ];

    let invoiceCounter = 1;

    // HIGH RISK: 0% reporting (NO GSTR3B filed)
    for (const vendor of highRiskVendors) {
      for (let i = 0; i < 12; i++) {
        const template = invoiceTemplates[Math.floor(Math.random() * invoiceTemplates.length)];
        const invoiceId = `INV${String(invoiceCounter).padStart(5, "0")}`;
        invoiceCounter++;

        const invoiceDate = new Date();
        invoiceDate.setMonth(invoiceDate.getMonth() - Math.floor(Math.random() * 6));

        await session.run(
          `CREATE (i:Invoice {
            id: $id, 
            vendor_id: $vendor_id, 
            amount: $amount, 
            gst_amount: $gst, 
            invoice_date: $date
          })`,
          {
            id: invoiceId,
            vendor_id: vendor.id,
            amount: template.amount,
            gst: template.gst,
            date: invoiceDate.toISOString().split("T")[0],
          }
        );

        // Link vendor to taxpayer
        await session.run(
          "MATCH (v:Vendor {id: $vendor_id}) MATCH (t:Taxpayer) WITH v, t LIMIT 1 MERGE (t)-[:RECEIVED]->(v)",
          { vendor_id: vendor.id }
        );
      }
    }

    // MEDIUM RISK: 40% reporting (Some GSTR3B filed)
    for (const vendor of mediumRiskVendors) {
      for (let i = 0; i < 15; i++) {
        const template = invoiceTemplates[Math.floor(Math.random() * invoiceTemplates.length)];
        const invoiceId = `INV${String(invoiceCounter).padStart(5, "0")}`;
        invoiceCounter++;

        const invoiceDate = new Date();
        invoiceDate.setMonth(invoiceDate.getMonth() - Math.floor(Math.random() * 6));

        await session.run(
          `CREATE (i:Invoice {
            id: $id, 
            vendor_id: $vendor_id, 
            amount: $amount, 
            gst_amount: $gst, 
            invoice_date: $date
          })`,
          {
            id: invoiceId,
            vendor_id: vendor.id,
            amount: template.amount,
            gst: template.gst,
            date: invoiceDate.toISOString().split("T")[0],
          }
        );

        // Link vendor to taxpayer
        await session.run(
          "MATCH (v:Vendor {id: $vendor_id}) MATCH (t:Taxpayer) WITH v, t LIMIT 1 MERGE (t)-[:RECEIVED]->(v)",
          { vendor_id: vendor.id }
        );

        // 40% are reported in GSTR3B
        if (Math.random() < 0.4) {
          await session.run(
            `MATCH (i:Invoice {id: $invoice_id}) 
             MERGE (g:GSTR3B {period: "Q1-2024", vendor_id: $vendor_id}) 
             MERGE (i)-[:REPORTED_IN]->(g)`,
            { invoice_id: invoiceId, vendor_id: vendor.id }
          );
        }
      }
    }

    // LOW RISK: 95% reporting (Full compliance)
    for (const vendor of lowRiskVendors) {
      for (let i = 0; i < 18; i++) {
        const template = invoiceTemplates[Math.floor(Math.random() * invoiceTemplates.length)];
        const invoiceId = `INV${String(invoiceCounter).padStart(5, "0")}`;
        invoiceCounter++;

        const invoiceDate = new Date();
        invoiceDate.setMonth(invoiceDate.getMonth() - Math.floor(Math.random() * 6));

        await session.run(
          `CREATE (i:Invoice {
            id: $id, 
            vendor_id: $vendor_id, 
            amount: $amount, 
            gst_amount: $gst, 
            invoice_date: $date
          })`,
          {
            id: invoiceId,
            vendor_id: vendor.id,
            amount: template.amount,
            gst: template.gst,
            date: invoiceDate.toISOString().split("T")[0],
          }
        );

        // Link vendor to taxpayer
        await session.run(
          "MATCH (v:Vendor {id: $vendor_id}) MATCH (t:Taxpayer) WITH v, t LIMIT 1 MERGE (t)-[:RECEIVED]->(v)",
          { vendor_id: vendor.id }
        );

        // 95% are reported in GSTR3B
        if (Math.random() < 0.95) {
          await session.run(
            `MATCH (i:Invoice {id: $invoice_id}) 
             MERGE (g:GSTR3B {period: "Q1-2024", vendor_id: $vendor_id}) 
             MERGE (i)-[:REPORTED_IN]->(g)`,
            { invoice_id: invoiceId, vendor_id: vendor.id }
          );
        }
      }
    }

    // Create fraud networks (circular trading patterns)
    console.log("Creating fraud networks...");
    const fraudRingVendors = [highRiskVendors[0].id, highRiskVendors[1].id, highRiskVendors[2].id, highRiskVendors[3].id];
    for (let i = 0; i < fraudRingVendors.length; i++) {
      const fromId = fraudRingVendors[i];
      const toId = fraudRingVendors[(i + 1) % fraudRingVendors.length];
      await session.run(
        `MATCH (v1:Vendor {id: $from_id}) MATCH (v2:Vendor {id: $to_id}) 
         MERGE (v1)-[:SUPPLIES_TO]->(v2)`,
        { from_id: fromId, to_id: toId }
      );
    }

    // Verify data
    console.log("\n✅ Database population complete!\n");

    const results = await session.run(`
      RETURN 
        (SELECT COUNT(*) FROM (MATCH (v:Vendor) RETURN v)) as vendor_count,
        (SELECT COUNT(*) FROM (MATCH (i:Invoice) RETURN i)) as invoice_count,
        (SELECT COUNT(*) FROM (MATCH (v:Vendor {risk_level: 'HIGH'}) RETURN v)) as high_risk,
        (SELECT COUNT(*) FROM (MATCH (v:Vendor {risk_level: 'MEDIUM'}) RETURN v)) as medium_risk,
        (SELECT COUNT(*) FROM (MATCH (v:Vendor {risk_level: 'LOW'}) RETURN v)) as low_risk
    `);

    const vendorCount = await session.run("MATCH (v:Vendor) RETURN COUNT(v) as count");
    const invoiceCount = await session.run("MATCH (i:Invoice) RETURN COUNT(i) as count");
    const highRiskCount = await session.run("MATCH (v:Vendor {risk_level: 'HIGH'}) RETURN COUNT(v) as count");
    const mediumRiskCount = await session.run("MATCH (v:Vendor {risk_level: 'MEDIUM'}) RETURN COUNT(v) as count");
    const lowRiskCount = await session.run("MATCH (v:Vendor {risk_level: 'LOW'}) RETURN COUNT(v) as count");
    const leakageResult = await session.run(`
      MATCH (i:Invoice) 
      WHERE NOT (i)-[:REPORTED_IN]->(:GSTR3B) 
      RETURN SUM(i.gst_amount) as total_leakage
    `);

    console.log("📈 Dataset Summary:");
    console.log(`   Total Vendors: ${vendorCount.records[0].get("count").toNumber()}`);
    console.log(`   - HIGH RISK: ${highRiskCount.records[0].get("count").toNumber()}`);
    console.log(`   - MEDIUM RISK: ${mediumRiskCount.records[0].get("count").toNumber()}`);
    console.log(`   - LOW RISK: ${lowRiskCount.records[0].get("count").toNumber()}`);
    console.log(`   Total Invoices: ${invoiceCount.records[0].get("count").toNumber()}`);
    console.log(`   ITC Leakage: ₹${leakageResult.records[0].get("total_leakage").toNumber().toLocaleString()}`);
    console.log("\n✅ Ready for dashboard!");
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await session.close();
    await driver.close();
  }
}

populateDatabase();
