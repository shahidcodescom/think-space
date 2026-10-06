#!/bin/sh
set -eu

DATA_DIR="${DATA_DIR:-/app/data}"
SEED_DIR="${SEED_DIR:-/app/data-seed}"

mkdir -p "$DATA_DIR/uploads/resumes" "$DATA_DIR/uploads/library"

# Named/bind volumes start empty — copy baked seed JSON when missing
if [ -d "$SEED_DIR" ]; then
  for f in "$SEED_DIR"/*; do
    [ -e "$f" ] || continue
    base=$(basename "$f")
    # Never overwrite an existing vault key or live data files
    if [ ! -e "$DATA_DIR/$base" ]; then
      if [ -d "$f" ]; then
        cp -a "$f" "$DATA_DIR/$base"
      else
        cp -a "$f" "$DATA_DIR/$base"
      fi
    fi
  done
fi

exec node server.js
