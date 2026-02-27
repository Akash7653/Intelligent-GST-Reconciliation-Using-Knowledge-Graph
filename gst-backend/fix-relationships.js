const neo4j = require("neo4j-driver");

const driver = neo4j.driver(
  "bolt://localhost:7687",
  neo4j.auth.basic("neo4j", "asdf@123")
);

async function fixDatabase() {
  const session = driver.session();

  try {
    console.log("🔗 Creating explicit vendor-invoice relationships...");

    // Create ISSUED relationships from vendor queries to invoices
    await session.run(`
      MATCH (v:Vendor)
      MATCH (i:Invoice {vendor_id: v.id})
      MERGE (v)<-[:ISSUED]-(i)
    `);

    console.log("✅ Relationships created!");

    // Now verify leakage
    const leakageResult = await session.run(`
      MATCH (v:Vendor)<-[:ISSUED]-(i:Invoice)
      WHERE NOT (i)-[:REPORTED_IN]->(:GSTR3B)
      RETURN SUM(i.gst_amount) as total_leakage
    `);

    const leakage = leakageResult.records[0].get("total_leakage");
    console.log("💰 Total ITC Leakage: ₹" + (leakage?.toNumber?.() || leakage || 0).toLocaleString("en-IN"));

    session.close();
    driver.close();
  } catch (error) {
    console.error("❌ Error:", error.message);
    session.close();
    driver.close();
    process.exit(1);
  }
}

fixDatabase();
