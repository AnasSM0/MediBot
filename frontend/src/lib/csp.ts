/**
 * Content Security Policy Configuration
 * 
 * CSP headers to prevent XSS, clickjacking, and other attacks.
 * 
 * Usage in Next.js:
 * Add to next.config.js or middleware
 */

/**
 * Generate CSP header value
 */
export function generateCSP(): string {
  const cspDirectives = {
    // Default source
    'default-src': ["'self'"],
    
    // Script sources
    'script-src': [
      "'self'",
      "'unsafe-inline'", // Required for Next.js and inline scripts (theme)
      "'unsafe-eval'", // Required for Next.js dev mode
      'https://vercel.live', // Vercel analytics (if used)
    ],
    
    // Style sources
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for styled-components and CSS-in-JS
      'https://fonts.googleapis.com',
    ],
    
    // Font sources
    'font-src': [
      "'self'",
      'https://fonts.gstatic.com',
      'data:', // For base64 encoded fonts
    ],
    
    // Image sources
    'img-src': [
      "'self'",
      'data:', // For base64 images
      'blob:', // For uploaded images
      'https:', // Allow HTTPS images
    ],
    
    // Media sources
    'media-src': ["'self'", 'blob:'],
    
    // Connect sources (API calls)
    'connect-src': [
      "'self'",
      'https://api.openrouter.ai', // OpenRouter API
      'https://generativelanguage.googleapis.com', // Gemini API
      'wss:', // WebSocket connections
    ],
    
    // Frame sources
    'frame-src': ["'none'"], // Prevent embedding in iframes
    
    // Frame ancestors (prevent clickjacking)
    'frame-ancestors': ["'none'"],
    
    // Object sources
    'object-src': ["'none'"],
    
    // Base URI
    'base-uri': ["'self'"],
    
    // Form action
    'form-action': ["'self'"],
    
    // Upgrade insecure requests
    'upgrade-insecure-requests': [],
    
    // Block mixed content
    'block-all-mixed-content': [],
  };

  // Convert to CSP string
  return Object.entries(cspDirectives)
    .map(([directive, sources]) => {
      if (sources.length === 0) {
        return directive;
      }
      return `${directive} ${sources.join(' ')}`;
    })
    .join('; ');
}

/**
 * CSP for production (stricter)
 */
export function generateProductionCSP(): string {
  const cspDirectives = {
    'default-src': ["'self'"],
    
    'script-src': [
      "'self'",
      "'unsafe-inline'", // Still needed for theme script
      // Remove 'unsafe-eval' in production
    ],
    
    'style-src': [
      "'self'",
      "'unsafe-inline'",
      'https://fonts.googleapis.com',
    ],
    
    'font-src': [
      "'self'",
      'https://fonts.gstatic.com',
      'data:',
    ],
    
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      'https:',
    ],
    
    'media-src': ["'self'", 'blob:'],
    
    'connect-src': [
      "'self'",
      'https://api.openrouter.ai',
      'https://generativelanguage.googleapis.com',
    ],
    
    'frame-src': ["'none'"],
    'frame-ancestors': ["'none'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'upgrade-insecure-requests': [],
    'block-all-mixed-content': [],
  };

  return Object.entries(cspDirectives)
    .map(([directive, sources]) => {
      if (sources.length === 0) {
        return directive;
      }
      return `${directive} ${sources.join(' ')}`;
    })
    .join('; ');
}

/**
 * Security headers configuration
 */
export const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: generateCSP(),
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY', // Prevent clickjacking
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff', // Prevent MIME sniffing
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin', // Control referrer information
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(self), geolocation=(), interest-cohort=()', // Control browser features
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block', // Legacy XSS protection
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains', // Force HTTPS
  },
];

/**
 * Apply security headers in Next.js config
 * 
 * Add to next.config.js:
 * 
 * ```js
 * const { securityHeaders } = require('./src/lib/csp');
 * 
 * module.exports = {
 *   async headers() {
 *     return [
 *       {
 *         source: '/:path*',
 *         headers: securityHeaders,
 *       },
 *     ];
 *   },
 * };
 * ```
 */
