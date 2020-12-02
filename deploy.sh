#!/bin/bash

fromSrc="$1/src/"
fromDocs="$1/docs"
toCoverage="$2/docs/"
fromCoverage="$1/coverage"

echo "Syncing $fromSrc to $2"

rsync -r --exclude='.git' \
      --exclude='.gitignore' \
      --exclude='.*' \
      --exclude='node_modules' \
      --exclude='package*.json' \
      --exclude='*.lock' \
      --exclude='*.spec.*' \
      --exclude='*.sh' \
      $fromSrc $2

echo "Copying $fromDocs to $2"

cp -r $fromDocs $2

echo "Copying $fromCoverage to $toCoverage"

cp -r $fromCoverage $toCoverage
