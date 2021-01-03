#!/bin/bash

fromSrc="$1/build/"
fromDocs="$1/docs"

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
