#!/bin/bash

echo "🔧 Installing OpenAI package with VPN retry logic..."
echo ""

while true; do
    echo "📦 Attempting to install openai==1.54.0..."
    pip install openai==1.54.0
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Installation succeeded!"
        echo ""
        echo "Next steps:"
        echo "1. Add OPENAI_API_KEY to .env file"
        echo "2. Run: python3 -m app.main"
        echo "3. Test: curl http://localhost:8000/api/sora/health"
        break
    else
        echo ""
        echo "❌ Installation failed (VPN issue?). Retrying in 1 second..."
        sleep 1
    fi
done
