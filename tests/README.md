# Tests

## 🚀 Quick Start

```bash
# Prerequisites: backend on :8500, frontend on :5173

# Quick check
node tests/e2e/web/test-quick-check.js

# All web tests
node tests/e2e/web/test-flashcard-flow.js    # 8 tests
node tests/e2e/web/test-grammar-lab.js       # 7 tests
node tests/e2e/web/test-words-library.js     # 8 tests
node tests/e2e/web/test-new-features.js      # 8 tests

# Active suite runner
./tests/run-all-tests.sh
```

## 📊 Test Summary

| Test | Count | Description |
|------|-------|-------------|
| quick-check | 1 | App loads, categories work |
| flashcard-flow | 8 | Swipe gestures, progress |
| grammar-lab | 7 | Graph, nodes, interactions |
| words-library | 8 | Search, filters, navigation |
| new-features | 8 | Audio, TTS, Statistics |

**Total: 39 tests**

## 📁 Structure

```
tests/
├── e2e/web/           # Playwright browser tests
├── e2e/android/       # Android emulator tests
├── e2e/ios/           # iOS simulator tests
└── screenshots/       # Test screenshots
```

## 🐛 Troubleshooting

- **Connection error**: Start backend and frontend first
- **Timeout**: Increase `waitForTimeout` in test file
