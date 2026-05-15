#!/bin/bash
# Generate a single login code for Vara Tasks

set -e

# Defaults
USERNAME="admin"
TTL="5m"
DATA_DIR="./server/data"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -u|--username)
      USERNAME="$2"
      shift 2
      ;;
    --ttl)
      TTL="$2"
      shift 2
      ;;
    --data-dir)
      DATA_DIR="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: ./generate-codes.sh [options]"
      echo ""
      echo "Options:"
      echo "  -u, --username NAME    Username for code (default: admin)"
      echo "  --ttl DURATION         Code expiration time (default: 5m)"
      echo "  --data-dir PATH        Server data directory (default: ./server/data)"
      echo "  -h, --help            Show this help message"
      echo ""
      echo "Examples:"
      echo "  ./generate-codes.sh"
      echo "  ./generate-codes.sh -u alice"
      echo "  ./generate-codes.sh -u bob --ttl 10m"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use -h or --help for usage information"
      exit 1
      ;;
  esac
done

# Build the gen-codes binary
echo "Building gen-codes tool..."
cd server
go build -o gen-codes-bin ./cmd/gen-codes
cd ..

# Run the generator
echo "Generating login code for user '$USERNAME'..."
echo ""
./server/gen-codes-bin \
  -count=1 \
  -username="$USERNAME" \
  -ttl="$TTL" \
  -data-dir="$DATA_DIR"

# Clean up
rm ./server/gen-codes-bin
