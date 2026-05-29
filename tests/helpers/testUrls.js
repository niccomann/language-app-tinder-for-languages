const DEFAULT_BACKEND_URL = process.env.TEST_BACKEND_URL
  ?? process.env.PLAYWRIGHT_API_URL
  ?? 'http://localhost:8501';

const DEFAULT_FRONTEND_URL = process.env.TEST_FRONTEND_URL
  ?? process.env.PLAYWRIGHT_APP_URL
  ?? 'http://localhost:5173';

module.exports = {
  DEFAULT_BACKEND_URL,
  DEFAULT_FRONTEND_URL,
};
