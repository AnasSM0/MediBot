/**
 * Security Utilities
 * 
 * Production-ready security utilities for frontend applications.
 * Features:
 * - Input sanitization
 * - XSS prevention
 * - HTML escaping
 * - URL validation
 * - Safe string handling
 */

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  
  return text.replace(/[&<>"'/]/g, (char) => map[char] || char);
}

/**
 * Sanitize user input by removing potentially dangerous characters
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Remove null bytes
  let sanitized = input.replace(/\0/g, '');
  
  // Remove control characters except newlines and tabs
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
}

/**
 * Sanitize text for display (removes HTML tags)
 */
export function sanitizeText(text: string): string {
  if (typeof text !== 'string') {
    return '';
  }
  
  // Remove HTML tags
  let sanitized = text.replace(/<[^>]*>/g, '');
  
  // Decode HTML entities
  sanitized = decodeHtmlEntities(sanitized);
  
  // Remove null bytes and control characters
  sanitized = sanitizeInput(sanitized);
  
  return sanitized;
}

/**
 * Decode HTML entities
 */
function decodeHtmlEntities(text: string): string {
  if (typeof window === 'undefined') {
    return text;
  }
  
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

/**
 * Validate and sanitize URL
 */
export function sanitizeUrl(url: string): string | null {
  if (typeof url !== 'string') {
    return null;
  }
  
  // Remove whitespace
  const trimmed = url.trim();
  
  // Check for javascript: protocol (XSS vector)
  if (/^javascript:/i.test(trimmed)) {
    return null;
  }
  
  // Check for data: protocol (potential XSS)
  if (/^data:/i.test(trimmed)) {
    return null;
  }
  
  // Check for vbscript: protocol
  if (/^vbscript:/i.test(trimmed)) {
    return null;
  }
  
  // Allow only http, https, mailto, tel
  if (!/^(https?|mailto|tel):/i.test(trimmed) && !/^\//.test(trimmed)) {
    return null;
  }
  
  try {
    // Validate URL structure
    if (trimmed.startsWith('http')) {
      new URL(trimmed);
    }
    return trimmed;
  } catch {
    return null;
  }
}

/**
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
  if (typeof email !== 'string') {
    return false;
  }
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitize filename for safe file operations
 */
export function sanitizeFilename(filename: string): string {
  if (typeof filename !== 'string') {
    return 'file';
  }
  
  // Remove path traversal attempts
  let sanitized = filename.replace(/\.\./g, '');
  
  // Remove directory separators
  sanitized = sanitized.replace(/[/\\]/g, '');
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');
  
  // Remove control characters
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Limit length
  sanitized = sanitized.substring(0, 255);
  
  // Ensure not empty
  return sanitized || 'file';
}

/**
 * Validate and sanitize JSON input
 */
export function sanitizeJson<T = unknown>(input: string): T | null {
  if (typeof input !== 'string') {
    return null;
  }
  
  try {
    // Parse JSON safely
    const parsed = JSON.parse(input);
    
    // Ensure it's an object or array
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }
    
    return parsed as T;
  } catch {
    return null;
  }
}

/**
 * Create safe text node (prevents XSS)
 */
export function createSafeTextNode(text: string): Text {
  if (typeof window === 'undefined') {
    throw new Error('createSafeTextNode can only be used in browser');
  }
  
  return document.createTextNode(sanitizeText(text));
}

/**
 * Safely set text content (prevents XSS)
 */
export function setSafeTextContent(element: HTMLElement, text: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  // Use textContent instead of innerHTML
  element.textContent = sanitizeText(text);
}

/**
 * Validate content length
 */
export function validateLength(
  input: string,
  min: number = 0,
  max: number = 10000
): boolean {
  if (typeof input !== 'string') {
    return false;
  }
  
  const length = input.length;
  return length >= min && length <= max;
}

/**
 * Rate limiting helper
 */
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  private maxAttempts: number;
  private windowMs: number;

  constructor(maxAttempts: number = 5, windowMs: number = 60000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  /**
   * Check if action is allowed
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Remove old attempts outside the window
    const recentAttempts = attempts.filter((time) => now - time < this.windowMs);
    
    if (recentAttempts.length >= this.maxAttempts) {
      return false;
    }
    
    // Add current attempt
    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);
    
    return true;
  }

  /**
   * Reset attempts for a key
   */
  reset(key: string): void {
    this.attempts.delete(key);
  }

  /**
   * Clear all attempts
   */
  clear(): void {
    this.attempts.clear();
  }
}

/**
 * Prevent clickjacking by checking if in iframe
 */
export function preventClickjacking(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }
  
  try {
    return window.self === window.top;
  } catch {
    // If we can't access window.top, we're likely in an iframe
    return false;
  }
}

/**
 * Generate secure random string
 */
export function generateSecureId(length: number = 16): string {
  if (typeof window === 'undefined' || !window.crypto) {
    // Fallback for non-browser environments
    return Math.random().toString(36).substring(2, length + 2);
  }
  
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate file type
 */
export function isValidFileType(file: File, allowedTypes: string[]): boolean {
  if (!file || !file.type) {
    return false;
  }
  
  return allowedTypes.some((type) => {
    if (type.endsWith('/*')) {
      // Wildcard match (e.g., "image/*")
      const prefix = type.slice(0, -2);
      return file.type.startsWith(prefix);
    }
    return file.type === type;
  });
}

/**
 * Validate file size
 */
export function isValidFileSize(file: File, maxSizeBytes: number): boolean {
  if (!file) {
    return false;
  }
  
  return file.size <= maxSizeBytes;
}

/**
 * Sanitize object by removing dangerous properties
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized = { ...obj };
  
  // Remove __proto__, constructor, prototype
  delete (sanitized as Record<string, unknown>)['__proto__'];
  delete (sanitized as Record<string, unknown>)['constructor'];
  delete (sanitized as Record<string, unknown>)['prototype'];
  
  return sanitized;
}

/**
 * Check if string contains only safe characters
 */
export function isSafeString(input: string): boolean {
  if (typeof input !== 'string') {
    return false;
  }
  
  // Check for null bytes
  if (input.includes('\0')) {
    return false;
  }
  
  // Check for script tags
  if (/<script/i.test(input)) {
    return false;
  }
  
  // Check for event handlers
  if (/on\w+\s*=/i.test(input)) {
    return false;
  }
  
  // Check for javascript: protocol
  if (/javascript:/i.test(input)) {
    return false;
  }
  
  return true;
}
