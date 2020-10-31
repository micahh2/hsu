echo "Syncing $1 to $2"
rsync -r --exclude='.git' \
      --exclude='.gitignore' \
      --exclude='.*' \
      --exclude='node_modules' \
      --exclude='package*.json' \
      --exclude='*.lock' \
      --exclude='*.spec.*' \
      --exclude='*.sh' \
      $1 $2
