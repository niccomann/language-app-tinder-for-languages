#!/bin/bash

# Install google-generativeai with retry logic for VPN issues

source .venv/bin/activate

while true; do
    echo "Attempting to install google-generativeai..."
    pip install google-generativeai
    if [ $? -eq 0 ]; then
        echo "✅ Installation succeeded!"
        break
    else
        echo "❌ Installation failed. Retrying in 1 second..."
        sleep 1
    fi
done
