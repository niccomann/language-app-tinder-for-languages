/**
 * Test Configuration
 * 
 * Supports running E2E tests against:
 * - LOCAL: localhost development environment
 * - EU: Production EU region (Frankfurt)
 * - SA: Production South America region (São Paulo)
 * 
 * Usage:
 *   TEST_ENV=local node tests/e2e/web/test-complete-flow.js
 *   TEST_ENV=eu node tests/e2e/web/test-complete-flow.js
 *   TEST_ENV=sa node tests/e2e/web/test-complete-flow.js
 */

const ENVIRONMENTS = {
  local: {
    name: 'Local Development',
    frontendUrl: 'http://localhost:5173',
    backendUrl: 'http://localhost:8500',
    apiUrl: 'http://localhost:8500/api',
  },
  eu: {
    name: 'EU Production (Frankfurt)',
    frontendUrl: 'http://tinder-frontend-nlb-60cb3490ce637976.elb.eu-central-1.amazonaws.com',
    backendUrl: 'http://tinder-frontend-nlb-60cb3490ce637976.elb.eu-central-1.amazonaws.com',
    apiUrl: 'http://tinder-frontend-nlb-60cb3490ce637976.elb.eu-central-1.amazonaws.com/api',
  },
  sa: {
    name: 'South America Production (São Paulo)',
    frontendUrl: '', // Will be set after SA deployment
    backendUrl: '',
    apiUrl: '',
  },
};

function getTestEnvironment() {
  const envName = process.env.TEST_ENV || 'local';
  const env = ENVIRONMENTS[envName];
  
  if (!env) {
    console.error(`Unknown environment: ${envName}`);
    console.error(`Available environments: ${Object.keys(ENVIRONMENTS).join(', ')}`);
    process.exit(1);
  }
  
  return env;
}

function getConfig() {
  const env = getTestEnvironment();
  
  return {
    env,
    baseUrl: env.frontendUrl,
    apiUrl: env.apiUrl,
    isLocal: process.env.TEST_ENV === 'local' || !process.env.TEST_ENV,
    isProduction: process.env.TEST_ENV === 'eu' || process.env.TEST_ENV === 'sa',
    
    browser: {
      headless: process.env.HEADLESS === 'true',
      slowMo: parseInt(process.env.SLOW_MO || '0', 10),
      viewport: {
        width: parseInt(process.env.VIEWPORT_WIDTH || '1400', 10),
        height: parseInt(process.env.VIEWPORT_HEIGHT || '900', 10),
      },
    },
    
    timeouts: {
      navigation: 30000,
      action: 10000,
      assertion: 5000,
    },
  };
}

module.exports = {
  ENVIRONMENTS,
  getTestEnvironment,
  getConfig,
};
