#!/bin/bash

NETWORK="$1"

API_KEY="$2"

graph="./node_modules/.bin/graph"
mustache="./node_modules/.bin/mustache"

WORKING=.tmp.deploy."$NETWORK"

rm -rf "$WORKING"

mkdir "$WORKING"

$mustache networks/"$NETWORK".json subgraph.template.yaml >"$WORKING"/subgraph.yaml

$graph codegen --output-dir "$WORKING" "$WORKING"/subgraph.yaml

$graph build "$WORKING"/subgraph.yaml --output-dir "$WORKING"/build

$graph auth --studio "$API_KEY"

$graph deploy --debug --node https://api.thegraph.com/deploy/ --ipfs https://api.thegraph.com/ipfs/ nuggxyz/nuggftv1-"$NETWORK" "$WORKING"/subgraph.yaml

rm -rf "$WORKING"
