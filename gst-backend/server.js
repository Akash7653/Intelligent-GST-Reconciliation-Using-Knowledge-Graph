const express = require("express");
const http = require("http");
const neo4j = require("neo4j-driver");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Helper function to extract numbers from Neo4j integers
const extractNumber = (value) => {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value.low !== undefined) return value.low || 0;
  return 0;
};

// 🔗 Connect to Neo4j
const driver = neo4j.driver(
  "bolt://localhost:7687",
  neo4j.auth.basic("neo4j", "asdf@123")
);

// 🟢 API 1: Risk Summary
app.get("/api/risk-summary", async (req, res) => {
  const session = driver.session();

  try {
    const result = await session.run(`
      MATCH (v:Vendor)
      RETURN 
      COUNT(CASE WHEN v.risk_level = "HIGH" THEN 1 END) AS highRisk,
      COUNT(CASE WHEN v.risk_level = "MEDIUM" THEN 1 END) AS mediumRisk,
      COUNT(CASE WHEN v.risk_level = "LOW" THEN 1 END) AS lowRisk
    `);

    const record = result.records[0];

    res.json({
      highRisk: extractNumber(record.get("highRisk")),
      mediumRisk: extractNumber(record.get("mediumRisk")),
      lowRisk: extractNumber(record.get("lowRisk"))
    });

  } catch (error) {
    console.error("Risk Summary Error:", error);
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

// 🟢 API 2: ITC Leakage
app.get("/api/itc-leakage", async (req, res) => {
  const session = driver.session();

  try {
    const result = await session.run(`
      MATCH (v:Vendor)<-[:ISSUED]-(i:Invoice)
      WHERE NOT (i)-[:REPORTED_IN]->(:GSTR3B)
      RETURN SUM(i.gst_amount) AS leakage
    `);

    const record = result.records[0];
    const leakageValue = extractNumber(record.get("leakage"));
    
    res.json({
      leakage: leakageValue
    });

  } catch (error) {
    console.error("ITC Leakage Error:", error);
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

// 🟢 API 3: Top Risky Vendors (All vendors)
app.get("/api/top-vendors", async (req, res) => {
  const session = driver.session();

  try {
    const result = await session.run(`
      MATCH (v:Vendor)
      OPTIONAL MATCH (v)<-[:RECEIVED]-(:Taxpayer)
      WITH v, COUNT(*) as invoiceCount
      RETURN v.name AS name, v.risk_level AS riskLevel, invoiceCount
      ORDER BY 
        CASE v.risk_level WHEN "HIGH" THEN 1 WHEN "MEDIUM" THEN 2 WHEN "LOW" THEN 3 ELSE 4 END,
        invoiceCount DESC
    `);

    const vendors = result.records.map(record => {
      return {
        name: record.get("name"),
        riskLevel: record.get("riskLevel") || "LOW",
        score: extractNumber(record.get("invoiceCount")) || 0,
        invoices: extractNumber(record.get("invoiceCount")) || 0
      };
    });

    res.json(vendors);

  } catch (error) {
    console.error("Top Vendors Error:", error);
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

app.get("/api/fraud-graph", async (req, res) => {
  const session = driver.session();

  try {
    const result = await session.run(`
      MATCH (v1:Vendor)-[r]->(v2:Vendor)
      RETURN v1.name AS sourceName,
             v1.risk_level AS sourceRisk,
             v2.name AS targetName,
             v2.risk_level AS targetRisk,
             type(r) AS relation
    `);

    const nodeMap = new Map();
    const links = [];

    result.records.forEach(record => {
      const sourceName = record.get("sourceName");
      const sourceRisk = record.get("sourceRisk");
      const targetName = record.get("targetName");
      const targetRisk = record.get("targetRisk");
      const relation = record.get("relation");

      // Add source node
      if (sourceName && !nodeMap.has(sourceName)) {
        nodeMap.set(sourceName, {
          id: sourceName,
          name: sourceName,
          riskLevel: sourceRisk || "LOW",
          type: "Vendor"
        });
      }

      // Add target node
      if (targetName && !nodeMap.has(targetName)) {
        nodeMap.set(targetName, {
          id: targetName,
          name: targetName,
          riskLevel: targetRisk || "LOW",
          type: "Vendor"
        });
      }

      // Add link
      if (sourceName && targetName) {
        links.push({
          source: sourceName,
          target: targetName,
          label: relation
        });
      }
    });

    // If no vendor relationships, show vendor->taxpayer network
    const vendorTaxpayerResult = await session.run(`
      MATCH (v:Vendor)<-[:RECEIVED]-(t:Taxpayer)
      RETURN v.name AS vendorName, v.risk_level AS vendorRisk, t.name AS taxpayerName
    `);

    vendorTaxpayerResult.records.forEach(record => {
      const vendorName = record.get("vendorName");
      const vendorRisk = record.get("vendorRisk");
      const taxpayerName = record.get("taxpayerName");

      if (vendorName && !nodeMap.has(vendorName)) {
        nodeMap.set(vendorName, {
          id: vendorName,
          name: vendorName,
          riskLevel: vendorRisk || "LOW",
          type: "Vendor"
        });
      }

      if (taxpayerName && !nodeMap.has(taxpayerName)) {
        nodeMap.set(taxpayerName, {
          id: taxpayerName,
          name: taxpayerName,
          riskLevel: "LOW",
          type: "Taxpayer"
        });
      }

      links.push({
        source: taxpayerName,
        target: vendorName,
        label: "RECEIVED"
      });
    });

    const nodes = Array.from(nodeMap.values());

    res.json({
      nodes,
      links
    });

  } catch (error) {
    console.error("Fraud Graph Error:", error);
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

// 🟢 API 5: Vendor Details with Multi-hop Traversal & Risk Analysis
app.get("/api/vendor-details/:name", async (req, res) => {
  const { name } = req.params;
  const session = driver.session();

  try {
    // 1️⃣ Get vendor basic info & risk score
    const vendorResult = await session.run(`
      MATCH (v:Vendor {name: $name})
      RETURN v.name AS name, 
             v.risk_level AS riskLevel
      LIMIT 1
    `, { name });

    if (vendorResult.records.length === 0) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    const vendorRecord = vendorResult.records[0];
    const vendorName = vendorRecord.get("name");
    const riskLevel = vendorRecord.get("riskLevel");

    // 2️⃣ Count unreported invoices for this vendor
    const unreportedResult = await session.run(`
      MATCH (v:Vendor {name: $name})<-[:ISSUED]-(i:Invoice)
      WHERE NOT (i)-[:REPORTED_IN]->(:GSTR3B)
      RETURN COUNT(i) AS unreportedCount, SUM(i.gst_amount) AS unreportedGST
    `, { name });

    const unreportedRecord = unreportedResult.records[0];
    const unreportedCount = extractNumber(unreportedRecord.get("unreportedCount"));
    const unreportedGST = extractNumber(unreportedRecord.get("unreportedGST"));

    // 3️⃣ Count vendor relationships (fraud networks)
    const networkResult = await session.run(`
      MATCH (v:Vendor {name: $name})-[r]->()
      RETURN COUNT(r) AS networkLinks
    `, { name });

    const networkRecord = networkResult.records[0];
    const networkLinks = extractNumber(networkRecord.get("networkLinks"));

    // 4️⃣ Calculate leakage amount (unreported GST invoices)
    const leakageResult = await session.run(`
      MATCH (v:Vendor {name: $name})<-[:ISSUED]-(i:Invoice)
      WHERE NOT (i)-[:REPORTED_IN]->(:GSTR3B)
      RETURN SUM(i.gst_amount) AS leakageAmount
    `, { name });

    const leakageRecord = leakageResult.records[0];
    const leakageAmount = extractNumber(leakageRecord.get("leakageAmount"));
    
    // 5️⃣ Get total invoices from this vendor
    const totalResult = await session.run(`
      MATCH (v:Vendor {name: $name})<-[:ISSUED]-(i:Invoice)
      RETURN COUNT(i) AS totalCount, SUM(i.gst_amount) AS totalGST
    `, { name });

    const totalRecord = totalResult.records[0];
    const totalGST = extractNumber(totalRecord.get("totalGST"));

    // 6️⃣ Sample invoice paths (reported)
    const pathResult = await session.run(`
      MATCH (v:Vendor {name: $name})<-[:ISSUED]-(i:Invoice)-[:REPORTED_IN]->(g:GSTR3B)
      RETURN i.id AS invoiceNum, 
             i.gst_amount AS gstAmount,
             g.period AS period
      LIMIT 10
    `, { name });

    const reportedPaths = pathResult.records.map(record => ({
      vendor: name,
      invoice: record.get("invoiceNum"),
      gstAmount: extractNumber(record.get("gstAmount")),
      period: record.get("period"),
      status: "Reported"
    }));

    // 7️⃣ Unreported paths (missing GSTR3B)
    const unreportedPathResult = await session.run(`
      MATCH (v:Vendor {name: $name})<-[:ISSUED]-(i:Invoice)
      WHERE NOT (i)-[:REPORTED_IN]->(:GSTR3B)
      RETURN i.id AS invoiceNum, 
             i.gst_amount AS gstAmount
      LIMIT 10
    `, { name });

    const unreportedPaths = unreportedPathResult.records.map(record => ({
      vendor: name,
      invoice: record.get("invoiceNum"),
      gstAmount: extractNumber(record.get("gstAmount")),
      status: "Unreported ⚠️"
    }));

    const allPaths = [...reportedPaths, ...unreportedPaths];

    // 8️⃣ Classify mismatch reasons
    const reasons = [];
    if (unreportedCount > 0) {
      reasons.push(`${unreportedCount} invoices received but not reported in GSTR3B`);
    }
    if (networkLinks > 0) {
      reasons.push(`Participates in circular trading with ${circularLinks} other vendor(s)`);
    }
    if (leakageAmount > 5000) {
      reasons.push(`₹${leakageAmount.toLocaleString('en-IN')} in unreported ITC claims`);
    }
    if (circularLinks === 0 && unreportedCount === 0 && leakageAmount === 0) {
      reasons.push(`No detected irregularities in transactions`);
    }

    const auditExplanation = `Vendor ${vendorName} is ${riskLevel} risk because:\n${reasons.map(r => `• ${r}`).join('\n')}`;

    res.json({
      name: vendorName,
      riskLevel: riskLevel,
      unreportedInvoices: unreportedCount,
      networkLinks: networkLinks,
      leakageAmount: leakageAmount,
      totalGSTAmount: totalGST,
      traversalPaths: allPaths,
      mismatchReasons: reasons,
      auditExplanation: auditExplanation
    });

  } catch (error) {
    console.error("Error fetching vendor details:", error);
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

// 🟢 API 6: Multi-Hop Mismatch - Invoice to Tax Payment Chain Validation
app.get("/api/multi-hop-mismatch/:name", async (req, res) => {
  const { name } = req.params;
  const session = driver.session();

  try {
    const result = await session.run(`
      MATCH (v:Vendor {name: $name})<-[:ISSUED]-(i:Invoice)
      WHERE NOT (i)-[:REPORTED_IN]->(:GSTR3B)
      RETURN
        v.name AS vendor,
        i.id AS invoiceId,
        i.gst_amount AS gstAmount
      ORDER BY i.gst_amount DESC
      LIMIT 20
    `, { name });

    const mismatches = result.records.map(record => ({
      vendor: record.get("vendor"),
      invoiceId: record.get("invoiceId"),
      gstAmount: extractNumber(record.get("gstAmount")),
      status: "Unreported"
    }));

    res.json({
      vendor: name,
      count: mismatches.length,
      mismatches: mismatches
    });

  } catch (error) {
    console.error("Multi-hop Mismatch Error:", error);
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

// 🟢 API 7: Fraud Ring Detection - Circular Trading Patterns
app.get("/api/fraud-rings", async (req, res) => {
  const session = driver.session();

  try {
    const result = await session.run(`
      MATCH (v1:Vendor)-[:SUPPLIES_TO]->(v2:Vendor)-[:SUPPLIES_TO]->(v1)
      WHERE v1.name < v2.name
      RETURN DISTINCT 
        v1.name AS vendorA,
        v1.risk_level AS riskA,
        v2.name AS vendorB,
        v2.risk_level AS riskB
      ORDER BY v1.name
    `);

    const rings = result.records.map(record => ({
      vendorA: record.get("vendorA"),
      riskA: record.get("riskA"),
      vendorB: record.get("vendorB"),
      riskB: record.get("riskB"),
      transactionCount: 1,
      fraudPattern: "Circular_Trading"
    }));

    res.json({
      totalRings: rings.length,
      rings: rings
    });

  } catch (error) {
    console.error("Fraud Rings Error:", error);
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

// 🟢 API 8: Get Fraud Ring Participants for a Vendor
app.get("/api/fraud-rings/:name", async (req, res) => {
  const { name } = req.params;
  const session = driver.session();

  try {
    const result = await session.run(`
      MATCH (a:Taxpayer {name: $name})-[:ISSUED]->(i1:Invoice)
            <-[:RECEIVED]-(b:Taxpayer)
            -[:ISSUED]->(i2:Invoice)
            <-[:RECEIVED]-(a)
      RETURN DISTINCT 
        b.name AS partner,
        b.riskLevel AS partnerRisk,
        COUNT('transaction') AS transactionCount
      ORDER BY transactionCount DESC
    `, { name });

    const ringPartners = result.records.map(record => ({
      partner: record.get("partner"),
      partnerRisk: record.get("partnerRisk"),
      transactionCount: record.get("transactionCount").low || 0
    }));

    res.json({
      vendor: name,
      isInRing: ringPartners.length > 0,
      ringPartners: ringPartners
    });

  } catch (error) {
    console.error("Get Fraud Rings Error:", error);
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

app.listen(5000, () => {
  console.log("🚀 Server running on http://localhost:5000");
});

// ⚡ WebSocket Connection Handler
io.on("connection", (socket) => {
  console.log(`✅ Client connected: ${socket.id}`);

  socket.on("disconnect", () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// 🔄 Emit live dashboard updates every 5 seconds
setInterval(async () => {
  const session = driver.session();
  try {
    // Fetch all dashboard data
    const riskResult = await session.run(`
      MATCH (t:Taxpayer)
      RETURN 
      COUNT(CASE WHEN t.riskLevel = "HIGH" THEN 1 END) AS highRisk,
      COUNT(CASE WHEN t.riskLevel = "MEDIUM" THEN 1 END) AS mediumRisk,
      COUNT(CASE WHEN t.riskLevel = "LOW" THEN 1 END) AS lowRisk
    `);

    const leakageResult = await session.run(`
      MATCH (b:Taxpayer)-[:RECEIVED]->(i:Invoice)
      WHERE NOT (i)-[:REPORTED_IN]->(:GSTR3B)
      RETURN SUM(i.gst_amount) AS leakage
    `);

    const vendorResult = await session.run(`
      MATCH (t:Taxpayer)
      RETURN t.name AS name, t.riskScore AS score, t.riskLevel AS riskLevel
      ORDER BY score DESC
    `);

    const graphResult = await session.run(`
      MATCH (t:Taxpayer)-[r]->(n)
      RETURN t.name AS sourceName,
             t.riskLevel AS sourceRisk,
             type(r) AS relation, 
             n.name AS targetName,
             n.riskLevel AS targetRisk
    `);

    const riskRecord = riskResult.records[0];
    const leakageRecord = leakageResult.records[0];

    const dashboardData = {
      riskSummary: {
        highRisk: extractNumber(riskRecord.get("highRisk")),
        mediumRisk: extractNumber(riskRecord.get("mediumRisk")),
        lowRisk: extractNumber(riskRecord.get("lowRisk"))
      },
      leakage: extractNumber(leakageRecord.get("leakage")),
      vendors: vendorResult.records.map(r => ({
        name: r.get("name"),
        score: extractNumber(r.get("score")),
        riskLevel: r.get("riskLevel")
      })),
      graphMetrics: {
        nodes: new Set(
          graphResult.records.flatMap(r => [r.get("sourceName"), r.get("targetName")])
        ).size,
        links: graphResult.records.length
      },
      timestamp: new Date().toISOString()
    };

    // Emit to all connected clients
    io.emit("dashboardUpdate", dashboardData);
    console.log(`📡 Dashboard update emitted at ${dashboardData.timestamp}`);

  } catch (error) {
    console.error("Error emitting dashboard update:", error);
  } finally {
    await session.close();
  }
}, 5000);

// ⚡ Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down gracefully...");
  await driver.close();
  process.exit(0);
});