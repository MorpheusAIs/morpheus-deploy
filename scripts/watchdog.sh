#!/bin/bash
# Morpheus Watchdog Script
# Monitors escrow balance and triggers auto top-up (Gas Station)

set -e

echo "=========================================="
echo "  Morpheus Escrow Watchdog"
echo "=========================================="

# Configuration
AKASH_NODE="${AKASH_NODE:-https://rpc.akashnet.net:443}"
OWNER="${MORPHEUS_OWNER:-}"
DSEQ="${MORPHEUS_DSEQ:-}"
THRESHOLD="${ESCROW_THRESHOLD:-0.10}"
CHECK_INTERVAL="${CHECK_INTERVAL:-300}"  # 5 minutes

if [ -z "$OWNER" ] || [ -z "$DSEQ" ]; then
    echo "ERROR: MORPHEUS_OWNER and MORPHEUS_DSEQ must be set"
    exit 1
fi

# Function to query escrow balance
get_escrow_balance() {
    local response
    response=$(curl -s "${AKASH_NODE}/akash/escrow/v1beta3/accounts/info?id.scope=deployment&id.xid=${OWNER}/${DSEQ}")

    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to query escrow"
        return 1
    fi

    # Extract balance (in uakt)
    local balance
    balance=$(echo "$response" | jq -r '.account.balance.amount // "0"')
    echo "$balance"
}

# Function to check if top-up is needed
check_threshold() {
    local current_balance="$1"
    local initial_deposit="${INITIAL_DEPOSIT:-5000000}"  # 5 AKT default

    # Calculate threshold in uakt
    local threshold_amount
    threshold_amount=$(echo "$initial_deposit * $THRESHOLD" | bc)

    if [ "$(echo "$current_balance < $threshold_amount" | bc)" -eq 1 ]; then
        return 0  # Needs top-up
    fi
    return 1  # OK
}

# Function to trigger top-up
trigger_topup() {
    echo "Triggering escrow top-up..."

    # Call the Morpheus CLI fund command via API or direct execution
    if command -v morpheus &> /dev/null; then
        morpheus fund -d "$DSEQ" --auto
    else
        # Send notification to relay
        curl -X POST "${MORPHEUS_RELAY_URL:-http://localhost:8080}/topup" \
            -H "Content-Type: application/json" \
            -d "{\"owner\": \"$OWNER\", \"dseq\": \"$DSEQ\"}"
    fi
}

# Main monitoring loop
echo "Starting escrow monitoring..."
echo "Owner: $OWNER"
echo "DSEQ: $DSEQ"
echo "Threshold: ${THRESHOLD}%"
echo "Check interval: ${CHECK_INTERVAL}s"
echo ""

while true; do
    balance=$(get_escrow_balance)

    if [ $? -eq 0 ]; then
        # Convert from uakt to AKT for display
        balance_akt=$(echo "scale=6; $balance / 1000000" | bc)
        echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Escrow balance: ${balance_akt} AKT"

        if check_threshold "$balance"; then
            echo "WARNING: Escrow below threshold!"
            trigger_topup
        fi
    else
        echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Failed to query escrow"
    fi

    sleep "$CHECK_INTERVAL"
done
