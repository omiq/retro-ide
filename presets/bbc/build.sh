#!/bin/bash

# BBC Micro build script using working cc65 installation
# Usage: ./build.sh [source_file.c]

CC65_PATH="/Users/chrisg/cc65"
SOURCE_FILE="${1:-hello.c}"
OUTPUT_FILE="${SOURCE_FILE%.c}-bbc.prg"

echo "Building BBC Micro program: $SOURCE_FILE -> $OUTPUT_FILE"

# Compile with cc65
$CC65_PATH/bin/cl65 \
    -t bbc \
    -C $CC65_PATH/cfg/bbc.cfg \
    -I $CC65_PATH/include \
    -L $CC65_PATH/lib \
    -o "$OUTPUT_FILE" \
    "$SOURCE_FILE"

if [ $? -eq 0 ]; then
    echo "Build successful! Output: $OUTPUT_FILE"
    ls -la "$OUTPUT_FILE"
else
    echo "Build failed!"
    exit 1
fi
