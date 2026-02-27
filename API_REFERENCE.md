# API Reference: Explainable Audit & Multi-Hop Traversal

## Base URL
```
http://localhost:5000
```

---

## 1. Risk Summary API
### `GET /api/risk-summary`

Returns the distribution of taxpayers by risk level.

**Request**:
```bash
curl http://localhost:5000/api/risk-summary
```

**Response** (200 OK):
```json
{
  "highRisk": 4,
  "mediumRisk": 1,
  "lowRisk": 1
}
```

**Error Response** (500):
```json
{
  "error": "Database connection error message"
}
```

---

## 2. ITC Leakage API
### `GET /api/itc-leakage`

Calculates total ITC leakage from unreported invoices.

**Request**:
```bash
curl http://localhost:5000/api/itc-leakage
```

**Response** (200 OK):
```json
{
  "leakage": 36000
}
```

**Calculation Logic**:
- Finds all invoices RECEIVED by taxpayers
- Filters invoices NOT in any GSTR3B
- Sums GST amounts

---

## 3. Top Vendors API
### `GET /api/top-vendors`

Returns top 3 risky vendors sorted by risk score.

**Request**:
```bash
curl http://localhost:5000/api/top-vendors
```

**Response** (200 OK):
```json
[
  {
    "name": "Alpha Corp",
    "score": 150
  },
  {
    "name": "XYZ Enterprises",
    "score": 140
  },
  {
    "name": "Beta Pvt Ltd",
    "score": 120
  }
]
```

---

## 4. Fraud Graph API
### `GET /api/fraud-graph`

Returns nodes and edges for network visualization.

**Request**:
```bash
curl http://localhost:5000/api/fraud-graph
```

**Response** (200 OK):
```json
{
  "nodes": [
    { "id": "Alpha Corp" },
    { "id": "INV-001" },
    { "id": "GSTR3B-Q1-2024" }
  ],
  "links": [
    {
      "source": "Alpha Corp",
      "target": "INV-001",
      "label": "RECEIVED"
    },
    {
      "source": "INV-001",
      "target": "GSTR3B-Q1-2024",
      "label": "REPORTED_IN"
    }
  ]
}
```

---

## 5. Vendor Details API ⭐ NEW
### `GET /api/vendor-details/:name`

**The main endpoint for Explainable Audit & Multi-Hop Traversal**

Returns comprehensive vendor risk analysis with traversal paths and audit explanations.

### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Vendor name (URL encoded) |

### Request Examples

**Example 1: Basic Request**
```bash
curl "http://localhost:5000/api/vendor-details/Alpha%20Corp"
```

**Example 2: With Spaces (JavaScript)**
```javascript
const vendorName = "Alpha Corp";
const encodedName = encodeURIComponent(vendorName);
fetch(`http://localhost:5000/api/vendor-details/${encodedName}`)
  .then(res => res.json())
  .then(data => console.log(data));
```

**Example 3: Using Axios**
```javascript
import axios from 'axios';

axios.get(`http://localhost:5000/api/vendor-details/${encodeURIComponent('Alpha Corp')}`)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

### Response Format (200 OK)

```json
{
  "name": "Alpha Corp",
  "riskScore": 85,
  "riskLevel": "HIGH",
  "unreportedInvoices": 2,
  "circularLinks": 1,
  "suspiciousAmount": 18000,
  "totalGSTAmount": 45000,
  "traversalPaths": [
    {
      "vendor": "Alpha Corp",
      "invoice": "INV-001",
      "gstAmount": 9000,
      "period": "Q1-2024",
      "status": "Reported"
    },
    {
      "vendor": "Alpha Corp",
      "invoice": "INV-002",
      "gstAmount": 9000,
      "supplier": "Beta Corp",
      "status": "Unreported ⚠️"
    }
  ],
  "mismatchReasons": [
    "2 invoices received but not reported in GSTR3B",
    "Participates in circular trading with 1 chain(s)",
    "₹18,000 in unreported ITC claims"
  ],
  "auditExplanation": "Vendor Alpha Corp is HIGH risk because:\n• 2 invoices received but not reported in GSTR3B\n• Participates in circular trading with 1 chain(s)\n• ₹18,000 in unreported ITC claims"
}
```

### Response Field Definitions

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Vendor name |
| `riskScore` | number | Calculated risk score (0-100) |
| `riskLevel` | string | Risk classification: HIGH, MEDIUM, LOW |
| `unreportedInvoices` | number | Count of invoices not in GSTR3B |
| `circularLinks` | number | Count of circular trading participants |
| `suspiciousAmount` | number | Total GST from unreported invoices |
| `totalGSTAmount` | number | Total GST across all invoices |
| `traversalPaths` | array | Multi-hop relationship paths |
| `mismatchReasons` | array | Reasons for flagged mismatches |
| `auditExplanation` | string | Human-readable audit summary |

### Error Responses

**404 - Vendor Not Found**
```json
{
  "error": "Vendor not found"
}
```

**500 - Server Error**
```json
{
  "error": "Database connection failed"
}
```

### Cypher Queries Executed

This endpoint runs multiple Neo4j Cypher queries in parallel:

#### Query 1: Vendor Profile
```cypher
MATCH (t:Taxpayer {name: $name})
RETURN t.name, t.riskScore, t.riskLevel
LIMIT 1
```

#### Query 2: Unreported Invoices
```cypher
MATCH (t:Taxpayer {name: $name})-[:RECEIVED]->(i:Invoice)
WHERE NOT (i)<-[:REPORTED_IN]-(:GSTR3B)
RETURN COUNT(i) AS unreportedCount, SUM(i.gst_amount) AS unreportedGST
```

#### Query 3: Circular Trading
```cypher
MATCH (t:Taxpayer {name: $name})-[r:RECEIVED]->(i:Invoice)-[e:ISSUED]->(s:Taxpayer)
WHERE s.name <> $name
RETURN COUNT(DISTINCT s.name) AS circularLinks
```

#### Query 4: Reported Invoice Paths
```cypher
MATCH path = (t:Taxpayer {name: $name})-[rel1:RECEIVED]->(i:Invoice)-[rel2:REPORTED_IN]-(g:GSTR3B)
RETURN t.name, i.invoice_number, i.gst_amount, g.period
LIMIT 10
```

#### Query 5: Unreported Invoice Paths
```cypher
MATCH (t:Taxpayer {name: $name})-[:RECEIVED]->(i:Invoice)
WHERE NOT (i)<-[:REPORTED_IN]-(:GSTR3B)
RETURN i.invoice_number, i.gst_amount, i.supplier
LIMIT 10
```

---

## Data Relationships in Neo4j

### Nodes
```
:Taxpayer {name, riskScore, riskLevel}
:Invoice {invoice_number, gst_amount, supplier}
:GSTR3B {period, filed_date}
```

### Relationships
```
Taxpayer -[:RECEIVED]-> Invoice
Invoice -[:REPORTED_IN]-> GSTR3B
Invoice -[:ISSUED]-> Taxpayer
```

### Multi-Hop Path Examples
```
Single Hop:
  Taxpayer -[:RECEIVED]-> Invoice

Two Hops (Reported):
  Taxpayer -[:RECEIVED]-> Invoice -[:REPORTED_IN]-> GSTR3B

Two Hops (Circular):
  Taxpayer -[:RECEIVED]-> Invoice -[:ISSUED]-> Taxpayer (different)

Three Hops:
  Taxpayer -[:RECEIVED]-> Invoice -[:ISSUED]-> Taxpayer2 -[:RECEIVED]-> Invoice2
```

---

## Risk Scoring Algorithm

### High Risk Conditions
```
IF unreportedInvoices > 0 AND suspiciousAmount > 10000:
  riskScore = 80-100

IF circularLinks > 0:
  riskScore = 60-80

IF unreportedInvoices > 0 AND circularLinks > 0:
  riskScore = 90-100
```

### Medium Risk Conditions
```
IF unreportedInvoices > 0:
  riskScore = 50-80

IF suspiciousAmount > 5000:
  riskScore = 50-70
```

### Low Risk
```
IF unreportedInvoices == 0 AND circularLinks == 0:
  riskScore = 0-30
```

---

## Usage Examples

### JavaScript/React
```javascript
// Fetch vendor details
async function getVendorAudit(vendorName) {
  try {
    const response = await fetch(
      `http://localhost:5000/api/vendor-details/${encodeURIComponent(vendorName)}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(data.auditExplanation);
    return data;
  } catch (error) {
    console.error('Error:', error);
  }
}

// Usage
getVendorAudit("Alpha Corp").then(vendor => {
  console.log(`Risk Level: ${vendor.riskLevel}`);
  console.log(`Score: ${vendor.riskScore}`);
  console.log(`Unreported: ${vendor.unreportedInvoices}`);
});
```

### Python
```python
import requests
import json

def get_vendor_audit(vendor_name):
    url = f"http://localhost:5000/api/vendor-details/{vendor_name}"
    response = requests.get(url)
    
    if response.status_code == 200:
        data = response.json()
        return data
    else:
        print(f"Error: {response.status_code}")
        return None

# Usage
vendor_data = get_vendor_audit("Alpha%20Corp")
if vendor_data:
    print(vendor_data['auditExplanation'])
```

### cURL
```bash
# Basic request
curl "http://localhost:5000/api/vendor-details/Alpha%20Corp"

# With pretty print
curl "http://localhost:5000/api/vendor-details/Alpha%20Corp" | jq '.'

# Save to file
curl "http://localhost:5000/api/vendor-details/Alpha%20Corp" > vendor_audit.json

# With headers
curl -H "Accept: application/json" \
     "http://localhost:5000/api/vendor-details/Alpha%20Corp"
```

---

## Performance Benchmarks

| Query | Expected Time | Max Results |
|-------|---------------|------------|
| Risk Summary | < 100ms | N/A |
| ITC Leakage | < 200ms | Single |
| Top Vendors | < 150ms | 3 |
| Fraud Graph | < 500ms | All relationships |
| **Vendor Details** | **< 800ms** | **10 paths each** |

### Performance Tuning

For large databases (10,000+ vendors):

1. Add index on Taxpayer.name:
```cypher
CREATE INDEX taxpayer_name ON :Taxpayer(name)
```

2. Add index on Invoice relationships:
```cypher
CREATE INDEX invoice_reported ON :Invoice(reported)
```

3. Implement query timeout:
```javascript
const session = driver.session({ timeout: 30000 }); // 30 second timeout
```

---

## Common Issues & Troubleshooting

### Issue 1: 404 - Vendor Not Found
**Cause**: Vendor name doesn't exist or is misspelled
**Solution**: Check exact vendor name in Neo4j database

### Issue 2: Empty traversalPaths
**Cause**: Vendor has no invoices or no path to GSTR3B
**Solution**: Verify data exists in Neo4j

### Issue 3: Slow Response (> 2 seconds)
**Cause**: Large dataset or missing indexes
**Solution**: Create indexes, optimize queries, or implement pagination

### Issue 4: Connection Error
**Cause**: Neo4j not running or credentials wrong
**Solution**: Verify Neo4j connection at bolt://localhost:7687

---

## Integration Checklist

- [ ] Verify Neo4j is running and accessible
- [ ] Test all 5 API endpoints with cURL
- [ ] Verify vendor names match exactly
- [ ] Test with 10 different vendors
- [ ] Check response times (< 1 second)
- [ ] Verify risk scores are calculated
- [ ] Check auditExplanation formatting
- [ ] Test error handling (use non-existent vendor)
- [ ] Verify CORS headers are present
- [ ] Load test with 100 concurrent requests

---

## Future API Enhancements

### Planned for v2.0
- [ ] Pagination support for traversalPaths
- [ ] Date range filtering
- [ ] Custom risk score weights
- [ ] Export to PDF/CSV
- [ ] Real-time WebSocket updates
- [ ] Batch vendor analysis
- [ ] Prediction API (ML-based)

---

**API Version**: 1.0  
**Last Updated**: February 27, 2026  
**Status**: Production Ready ✅
