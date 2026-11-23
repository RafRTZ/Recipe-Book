#!/bin/sh
# Promote: copy the tested app from next/ to the repo root, where GitHub Pages serves the live app.
# Run only when the owner says "promote". This script does not commit and does not push.
# It never touches data/, docs/, tests/, scripts/, or next/ itself.
set -eu
cd "$(dirname "$0")/.."

echo "1/3 Running tests"
node --test

echo "2/3 Copying next/ app files to the root"
for dir in app assets; do
  mkdir -p "$dir"
  rsync -a --delete "next/$dir/" "$dir/"
done
cp next/index.html index.html
cp next/manifest.webmanifest manifest.webmanifest
cp next/sw.js sw.js

echo "3/3 What changed (staged only; nothing is committed or pushed)"
git add -A index.html manifest.webmanifest sw.js app assets
git diff --cached --stat
