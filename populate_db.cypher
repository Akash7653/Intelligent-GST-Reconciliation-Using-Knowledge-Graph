// Neo4j Cypher Script to populate GST database with sample data
// Run this in Neo4j Browser or via driver

// Clear existing data (optional)
// MATCH (n) DETACH DELETE n;

// 1. Create or update Taxpayer nodes with risk levels
MERGE (fraud:Taxpayer {name: "FraudVendor"}) 
SET fraud.riskLevel = "HIGH", fraud.riskScore = 200, fraud.type = "Taxpayer";

MERGE (medium:Taxpayer {name: "MediumVendor"}) 
SET medium.riskLevel = "MEDIUM", medium.riskScore = 100, medium.type = "Taxpayer";

MERGE (good:Taxpayer {name: "GoodVendor"}) 
SET good.riskLevel = "LOW", good.riskScore = 0, good.type = "Taxpayer";

// 2. Create Invoice nodes for FraudVendor (received invoices)
CREATE (i1:Invoice {
  invoice_id: "INV001", 
  invoice_number: "INV/2024/001", 
  gst_amount: 25000,
  supplier: "MediumVendor",
  date: "2024-01-15"
});

CREATE (i2:Invoice {
  invoice_id: "INV002", 
  invoice_number: "INV/2024/002", 
  gst_amount: 35000,
  supplier: "GoodVendor",
  date: "2024-02-10"
});

CREATE (i3:Invoice {
  invoice_id: "INV003", 
  invoice_number: "INV/2024/003", 
  gst_amount: 20000,
  supplier: "MediumVendor",
  date: "2024-03-05"
});

CREATE (i4:Invoice {
  invoice_id: "INV004", 
  invoice_number: "INV/2024/004", 
  gst_amount: 15000,
  supplier: "FraudVendor",
  date: "2024-03-20"
});

// 3. Create GSTR3B nodes (tax reporting)
CREATE (g1:GSTR3B {period: "Jan-2024", total_itc: 25000});
CREATE (g2:GSTR3B {period: "Feb-2024", total_itc: 35000});
CREATE (g3:GSTR3B {period: "Mar-2024", total_itc: 15000});

// 4. Create relationships - FraudVendor RECEIVED invoices
MATCH (fraud:Taxpayer {name: "FraudVendor"}), (i1:Invoice {invoice_id: "INV001"})
CREATE (fraud)-[:RECEIVED]->(i1);

MATCH (fraud:Taxpayer {name: "FraudVendor"}), (i2:Invoice {invoice_id: "INV002"})
CREATE (fraud)-[:RECEIVED]->(i2);

MATCH (fraud:Taxpayer {name: "FraudVendor"}), (i3:Invoice {invoice_id: "INV003"})
CREATE (fraud)-[:RECEIVED]->(i3);

// 5. Create ISSUED relationships - who issued the invoices
MATCH (medium:Taxpayer {name: "MediumVendor"}), (i1:Invoice {invoice_id: "INV001"})
CREATE (medium)-[:ISSUED]->(i1);

MATCH (good:Taxpayer {name: "GoodVendor"}), (i2:Invoice {invoice_id: "INV002"})
CREATE (good)-[:ISSUED]->(i2);

MATCH (medium:Taxpayer {name: "MediumVendor"}), (i3:Invoice {invoice_id: "INV003"})
CREATE (medium)-[:ISSUED]->(i3);

MATCH (fraud:Taxpayer {name: "FraudVendor"}), (i4:Invoice {invoice_id: "INV004"})
CREATE (fraud)-[:ISSUED]->(i4);

// 6. Create REPORTED_IN relationships - which invoices are reported in GSTR3B
MATCH (i1:Invoice {invoice_id: "INV001"}), (g1:GSTR3B {period: "Jan-2024"})
CREATE (i1)-[:REPORTED_IN]->(g1);

MATCH (i2:Invoice {invoice_id: "INV002"}), (g2:GSTR3B {period: "Feb-2024"})
CREATE (i2)-[:REPORTED_IN]->(g2);

// Note: INV003 and INV004 are NOT reported - these will show as leakage/unreported

// 7. Circular trading setup - FraudVendor and MediumVendor trade with each other
CREATE (i5:Invoice {
  invoice_id: "INV005", 
  invoice_number: "INV/2024/005", 
  gst_amount: 18000,
  supplier: "FraudVendor",
  date: "2024-04-01"
});

CREATE (i6:Invoice {
  invoice_id: "INV006", 
  invoice_number: "INV/2024/006", 
  gst_amount: 22000,
  supplier: "MediumVendor",
  date: "2024-04-15"
});

MATCH (medium:Taxpayer {name: "MediumVendor"}), (i5:Invoice {invoice_id: "INV005"})
CREATE (medium)-[:RECEIVED]->(i5);

MATCH (fraud:Taxpayer {name: "FraudVendor"}), (i6:Invoice {invoice_id: "INV006"})
CREATE (fraud)-[:RECEIVED]->(i6);

// This creates a circular pattern: FraudVendor sells to MediumVendor, MediumVendor sells back to FraudVendor

// Verify data was created
RETURN "Data population complete" AS result;
