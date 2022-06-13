#!/bin/bash

NETWORK="local"

graph="./node_modules/.bin/graph"
mustache="./node_modules/.bin/mustache"

WORKING=generated

mkdir "$WORKING"

yarn

$mustache networks/"$NETWORK".json subgraph.template.yaml >"$WORKING"/subgraph.yaml

$graph codegen --output-dir "$WORKING" "$WORKING"/subgraph.yaml

$graph build "$WORKING"/subgraph.yaml --output-dir "$WORKING"/build
