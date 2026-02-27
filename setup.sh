#!/bin/bash

# 🚀 GST Reconciliation System - Quick Start Guide
# This script helps you set up and run the entire system

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  GST Fraud Detection - Explainable Audit System Setup      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Check if Node.js is installed
print_status "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js v18+ first."
    exit 1
fi
print_success "Node.js $(node -v) found"

# Check if npm is installed
print_status "Checking npm installation..."
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi
print_success "npm $(npm -v) found"

# Check if Neo4j is accessible
print_status "Checking Neo4j connection..."
if ! curl -s -I http://localhost:7687 > /dev/null 2>&1; then
    print_warning "Neo4j might not be running on localhost:7687"
    echo "Please ensure Neo4j is running with:"
    echo "  - URL: bolt://localhost:7687"
    echo "  - Username: neo4j"
    echo "  - Password: asdf@123"
fi
print_success "Neo4j check complete"

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Setting up BACKEND                                        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Setup backend
if [ ! -d "gst-backend/node_modules" ]; then
    print_status "Installing backend dependencies..."
    cd gst-backend
    npm install
    cd ..
    print_success "Backend dependencies installed"
else
    print_success "Backend dependencies already installed"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Setting up FRONTEND                                       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Setup frontend
if [ ! -d "gst-frontend/node_modules" ]; then
    print_status "Installing frontend dependencies..."
    cd gst-frontend
    npm install
    cd ..
    print_success "Frontend dependencies installed"
else
    print_success "Frontend dependencies already installed"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  SETUP COMPLETE ✓                                          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

echo -e "${BLUE}Next Steps:${NC}"
echo ""
echo "1. Start Neo4j Database:"
echo "   • Ensure Neo4j is running on bolt://localhost:7687"
echo ""
echo "2. Terminal 1 - Start Backend Server:"
echo "   cd gst-backend"
echo "   node server.js"
echo "   → Runs on http://localhost:5000"
echo ""
echo "3. Terminal 2 - Start Frontend Dev Server:"
echo "   cd gst-frontend"
echo "   npm run dev"
echo "   → Runs on http://localhost:5173"
echo ""
echo "4. Open in Browser:"
echo "   http://localhost:5173"
echo ""
echo -e "${GREEN}System Ready! 🚀${NC}"
echo ""
