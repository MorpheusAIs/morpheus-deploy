#!/bin/bash

# Start Anvil fork of Base Sepolia
# Run this before running unit tests

set -e

# Use latest block for up-to-date contract state
# If you need deterministic tests, set a specific block number
FORK_BLOCK_NUMBER=""  # Empty = use latest block
BASE_SEPOLIA_RPC="https://sepolia.base.org"
PORT=8545

echo "🔧 Starting Anvil fork of Base Sepolia..."
if [ -n "$FORK_BLOCK_NUMBER" ]; then
    echo "   Block: $FORK_BLOCK_NUMBER"
else
    echo "   Block: latest"
fi
echo "   RPC: $BASE_SEPOLIA_RPC"
echo "   Port: $PORT"
echo ""

# Check if Foundry is installed
if ! command -v anvil &> /dev/null; then
    echo "❌ Error: Foundry/Anvil is not installed"
    echo "   Install from: https://book.getfoundry.sh/getting-started/installation"
    exit 1
fi

# Check if port is already in use
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Port $PORT is already in use"
    echo "   Kill existing process? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        lsof -ti:$PORT | xargs kill -9
        echo "   Killed existing process"
    else
        echo "   Exiting..."
        exit 1
    fi
fi

echo "🚀 Starting Anvil..."
echo ""

# Build anvil command with optional block number
ANVIL_CMD="anvil --fork-url $BASE_SEPOLIA_RPC --chain-id 84532 --port $PORT --accounts 10 --balance 10000 --gas-limit 30000000 --code-size-limit 50000 --host 0.0.0.0"

if [ -n "$FORK_BLOCK_NUMBER" ]; then
    ANVIL_CMD="$ANVIL_CMD --fork-block-number $FORK_BLOCK_NUMBER"
fi

eval $ANVIL_CMD
