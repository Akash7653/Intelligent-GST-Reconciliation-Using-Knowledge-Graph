# GST Platform - Leakage & Circular Links Fixes

## Issues Fixed

### 1. **Leakage Amount (Was showing 0, now calculates properly)**
- **Backend Fix (server.js)**: 
  - Added dedicated `leakageResult` query to sum GST amounts from unreported invoices
  - Fixed calculation: `WHERE NOT (i)-[:REPORTED_IN]->(:GSTR3B)`
  - Returns `leakageAmount` field in `/api/vendor-details` response
  - Also includes in `/api/fraud-graph` for tooltip display

### 2. **Circular Links (Was counting wrong suppliers, now detects actual cycles)**
- **Backend Fix (server.js)**:
  - Changed from counting unique suppliers to detecting actual A-B-A circular patterns
  - New Query: Matches bidirectional trading (A sells invoice to B, B sells invoice to A)
  - Properly counts participation in fraud rings

### 3. **Missing Vendor Table Values**
- **Frontend Fix (VendorModal.tsx)**:
  - Enhanced data normalization to handle all field formats
  - Added leakageAmount field support
  - Fixed multi-hop mismatch data extraction with proper field mapping
  - Added extractNumber helper for Neo4j integer conversion
  - Proper normalization of invoiceNumber and gstAmount

- **Frontend Fix (FraudGraph.tsx)**:
  - Enhanced to fetch `/api/fraud-rings` endpoint
  - Marks fraud ring participants with special visual indicators
  - Returns leakageAmount in all node data for tooltip display
  - Added fraud ring count to legend

## Implementation Details

### Backend Changes (server.js)

#### 1. Fixed Leakage Calculation
```javascript
const leakageResult = await session.run(`
  MATCH (t:Taxpayer {name: $name})-[:RECEIVED]->(i:Invoice)
  WHERE NOT (i)-[:REPORTED_IN]->(:GSTR3B)
  RETURN SUM(i.gst_amount) AS leakageAmount
`, { name });
```

#### 2. Fixed Circular Links Detection
```javascript
const circularResult = await session.run(`
  MATCH (a:Taxpayer {name: $name})-[:ISSUED]->(i1:Invoice)
        <-[:RECEIVED]-(b:Taxpayer)
        -[:ISSUED]->(i2:Invoice)
        <-[:RECEIVED]-(a)
  RETURN COUNT(DISTINCT b.name) AS circularLinks
`, { name });
```

#### 3. Enhanced Fraud Graph with Leakage
- Added leakage fetch for all taxpayers in fraud graph
- Nodes now include `leakageAmount` property for tooltips

### Frontend Changes

#### VendorModal.tsx Updates
- **Added leakageAmount field** to VendorDetails interface
- **Enhanced normalizeDetails()** to map leakageAmount from API responses
- **Fixed multi-hop extraction** with proper field mapping
- **Proper number extraction** from Neo4j integer format

#### FraudGraph.tsx Updates
- **Fetches fraud rings** on component mount
- **Highlights ring participants** with:
  - Red glow effect (2.5x radius)
  - Pulsing outer ring (1.8x radius)
  - Thicker red border (2.5px)
  - Larger node size (14px vs 12px)
- **Enhanced tooltips** showing:
  - "Fraud Ring Participant" badge (red)
  - Leakage amount in orange (₹ formatted)
- **Updated legend** with fraud ring count
- **Stats footer** now shows 4 metrics including fraud ring count

## Data Flow

### Vendor Details API Response
```json
{
  "name": "VendorName",
  "riskScore": 75,
  "riskLevel": "HIGH",
  "unreportedInvoices": 5,
  "circularLinks": 2,
  "suspiciousAmount": 50000,
  "leakageAmount": 50000,
  "totalGSTAmount": 150000,
  "traversalPaths": [...],
  "mismatchReasons": [...],
  "auditExplanation": "..."
}
```

### Fraud Graph Node Data
```json
{
  "id": "VendorName",
  "name": "VendorName",
  "riskLevel": "HIGH",
  "type": "Taxpayer",
  "leakageAmount": 50000
}
```

## Testing Checklist

- ✅ Backend builds without errors
- ✅ Frontend builds without errors  
- ✅ /api/vendor-details endpoint returns leakageAmount
- ✅ /api/vendor-details endpoint calculates circularLinks correctly
- ✅ /api/fraud-graph includes leakageAmount in nodes
- ✅ /api/fraud-rings detects circular trading patterns
- ✅ FraudGraph highlights fraud ring participants
- ✅ VendorModal displays all metrics correctly
- ✅ Tooltips show leakage amount
- ✅ VendorTable shows all vendor data

## Known Dependencies

- Neo4j must have proper invoice-to-GSTR3B relationships for leakage calculation
- Taxpayers must have bidirectional trading relationships for circular link detection
- All nodes must have riskLevel and type properties for proper visualization
