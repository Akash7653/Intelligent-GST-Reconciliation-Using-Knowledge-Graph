// ============================================
// GST Intelligence Platform - Database Seed
// Run each statement in Neo4j Browser
// ============================================

// 1. Create Taxpayer nodes with risk levels
MERGE (fraud:Taxpayer {name: "FraudVendor"}) 
SET fraud.riskLevel = "HIGH", fraud.riskScore = 200, fraud.type = "Taxpayer";

// 2. Create second taxpayer
MERGE (medium:Taxpayer {name: "MediumVendor"}) 
SET medium.riskLevel = "MEDIUM", medium.riskScore = 100, medium.type = "Taxpayer";

// 3. Create third taxpayer
MERGE (good:Taxpayer {name: "GoodVendor"}) 
SET good.riskLevel = "LOW", good.riskScore = 0, good.type = "Taxpayer";

// 4. Create Invoice 1
CREATE (i1:Invoice {
  invoice_id: "INV001",
  invoice_number: "INV/2024/001",
  gst_amount: 25000,
  supplier: "MediumVendor",
  date: "2024-01-15"
});

// 5. Create Invoice 2
CREATE (i2:Invoice {
  invoice_id: "INV002",
  invoice_number: "INV/2024/002",
  gst_amount: 35000,
  supplier: "GoodVendor",
  date: "2024-02-10"
});

// 6. Create Invoice 3
CREATE (i3:Invoice {
  invoice_id: "INV003",
  invoice_number: "INV/2024/003",
  gst_amount: 20000,
  supplier: "MediumVendor",
  date: "2024-03-05"
});

// 7. Create Invoice 4
CREATE (i4:Invoice {
  invoice_id: "INV004",
  invoice_number: "INV/2024/004",
  gst_amount: 15000,
  supplier: "FraudVendor",
  date: "2024-03-20"
});

// 8. Create Invoice 5 (for circular trading)
CREATE (i5:Invoice {
  invoice_id: "INV005",
  invoice_number: "INV/2024/005",
  gst_amount: 18000,
  supplier: "FraudVendor",
  date: "2024-04-01"
});

// 9. Create Invoice 6 (for circular trading)
CREATE (i6:Invoice {
  invoice_id: "INV006",
  invoice_number: "INV/2024/006",
  gst_amount: 22000,
  supplier: "MediumVendor",
  date: "2024-04-15"
});

// 10. Create GSTR3B 1
CREATE (g1:GSTR3B {period: "Jan-2024", total_itc: 25000});

// 11. Create GSTR3B 2
CREATE (g2:GSTR3B {period: "Feb-2024", total_itc: 35000});

// 12. Create GSTR3B 3
CREATE (g3:GSTR3B {period: "Mar-2024", total_itc: 15000});

// 13. FraudVendor receives Invoice 1
MATCH (fraud:Taxpayer {name: "FraudVendor"}), (i1:Invoice {invoice_id: "INV001"})
CREATE (fraud)-[:RECEIVED]->(i1);

// 14. FraudVendor receives Invoice 2
MATCH (fraud:Taxpayer {name: "FraudVendor"}), (i2:Invoice {invoice_id: "INV002"})
CREATE (fraud)-[:RECEIVED]->(i2);

// 15. FraudVendor receives Invoice 3
MATCH (fraud:Taxpayer {name: "FraudVendor"}), (i3:Invoice {invoice_id: "INV003"})
CREATE (fraud)-[:RECEIVED]->(i3);

// 16. MediumVendor receives Invoice 5
MATCH (medium:Taxpayer {name: "MediumVendor"}), (i5:Invoice {invoice_id: "INV005"})
CREATE (medium)-[:RECEIVED]->(i5);

// 17. FraudVendor receives Invoice 6
MATCH (fraud:Taxpayer {name: "FraudVendor"}), (i6:Invoice {invoice_id: "INV006"})
CREATE (fraud)-[:RECEIVED]->(i6);

// 18. MediumVendor issues Invoice 1
MATCH (medium:Taxpayer {name: "MediumVendor"}), (i1:Invoice {invoice_id: "INV001"})
CREATE (medium)-[:ISSUED]->(i1);

// 19. GoodVendor issues Invoice 2
MATCH (good:Taxpayer {name: "GoodVendor"}), (i2:Invoice {invoice_id: "INV002"})
CREATE (good)-[:ISSUED]->(i2);

// 20. MediumVendor issues Invoice 3
MATCH (medium:Taxpayer {name: "MediumVendor"}), (i3:Invoice {invoice_id: "INV003"})
CREATE (medium)-[:ISSUED]->(i3);

// 21. FraudVendor issues Invoice 4
MATCH (fraud:Taxpayer {name: "FraudVendor"}), (i4:Invoice {invoice_id: "INV004"})
CREATE (fraud)-[:ISSUED]->(i4);

// 22. FraudVendor issues Invoice 5
MATCH (fraud:Taxpayer {name: "FraudVendor"}), (i5:Invoice {invoice_id: "INV005"})
CREATE (fraud)-[:ISSUED]->(i5);

// 23. MediumVendor issues Invoice 6
MATCH (medium:Taxpayer {name: "MediumVendor"}), (i6:Invoice {invoice_id: "INV006"})
CREATE (medium)-[:ISSUED]->(i6);

// 24. Invoice 1 reported in GSTR3B Jan-2024
MATCH (i1:Invoice {invoice_id: "INV001"}), (g1:GSTR3B {period: "Jan-2024"})
CREATE (i1)-[:REPORTED_IN]->(g1);

// 25. Invoice 2 reported in GSTR3B Feb-2024
MATCH (i2:Invoice {invoice_id: "INV002"}), (g2:GSTR3B {period: "Feb-2024"})
CREATE (i2)-[:REPORTED_IN]->(g2);

// Note: INV003, INV004, INV005, INV006 NOT reported = Leakage amount

// ============================================
// Verification Query
// ============================================
MATCH (t:Taxpayer)
RETURN t.name AS name, t.riskLevel AS riskLevel, COUNT(t) AS count;
