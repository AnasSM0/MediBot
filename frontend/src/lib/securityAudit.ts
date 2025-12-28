/**
 * Security Audit Utility
 * 
 * Checks for common security vulnerabilities in the application.
 */

import { preventClickjacking } from './security';

export type SecurityIssue = {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'xss' | 'injection' | 'clickjacking' | 'configuration' | 'best-practice';
  message: string;
  recommendation: string;
};

export type SecurityAuditResult = {
  passed: boolean;
  issues: SecurityIssue[];
  score: number; // 0-100
};

/**
 * Run security audit
 */
export function runSecurityAudit(): SecurityAuditResult {
  const issues: SecurityIssue[] = [];

  // Check for clickjacking protection
  if (!preventClickjacking()) {
    issues.push({
      severity: 'high',
      category: 'clickjacking',
      message: 'Application is running in an iframe',
      recommendation: 'Ensure X-Frame-Options or CSP frame-ancestors is set',
    });
  }

  // Check for HTTPS
  if (typeof window !== 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
    issues.push({
      severity: 'critical',
      category: 'configuration',
      message: 'Application is not served over HTTPS',
      recommendation: 'Always use HTTPS in production',
    });
  }

  // Check for localStorage availability
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('__security_test__', 'test');
      localStorage.removeItem('__security_test__');
    } catch {
      issues.push({
        severity: 'low',
        category: 'configuration',
        message: 'localStorage is not available',
        recommendation: 'Ensure localStorage is enabled for persistence features',
      });
    }
  }

  // Check for crypto API
  if (typeof window !== 'undefined' && !window.crypto) {
    issues.push({
      severity: 'medium',
      category: 'configuration',
      message: 'Web Crypto API is not available',
      recommendation: 'Ensure the application is served over HTTPS',
    });
  }

  // Check for CSP
  if (typeof document !== 'undefined') {
    const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (!cspMeta) {
      issues.push({
        severity: 'high',
        category: 'configuration',
        message: 'No Content Security Policy detected',
        recommendation: 'Implement CSP headers to prevent XSS attacks',
      });
    }
  }

  // Check for eval usage (static analysis would be better, this is runtime)
  if (typeof window !== 'undefined') {
    const originalEval = window.eval;
    let evalUsed = false;
    
    window.eval = function(...args) {
      evalUsed = true;
      return originalEval.apply(this, args);
    };

    // Restore after check
    setTimeout(() => {
      window.eval = originalEval;
      if (evalUsed) {
        issues.push({
          severity: 'critical',
          category: 'injection',
          message: 'eval() is being used in the application',
          recommendation: 'Remove all eval() usage to prevent code injection',
        });
      }
    }, 0);
  }

  // Calculate score
  const criticalCount = issues.filter((i) => i.severity === 'critical').length;
  const highCount = issues.filter((i) => i.severity === 'high').length;
  const mediumCount = issues.filter((i) => i.severity === 'medium').length;
  const lowCount = issues.filter((i) => i.severity === 'low').length;

  const score = Math.max(
    0,
    100 - (criticalCount * 30 + highCount * 15 + mediumCount * 7 + lowCount * 3)
  );

  return {
    passed: criticalCount === 0 && highCount === 0,
    issues,
    score,
  };
}

/**
 * Check for dangerous patterns in code
 */
export function checkDangerousPatterns(code: string): SecurityIssue[] {
  const issues: SecurityIssue[] = [];

  // Check for eval
  if (/\beval\s*\(/i.test(code)) {
    issues.push({
      severity: 'critical',
      category: 'injection',
      message: 'eval() usage detected',
      recommendation: 'Remove eval() and use safer alternatives',
    });
  }

  // Check for Function constructor
  if (/new\s+Function\s*\(/i.test(code)) {
    issues.push({
      severity: 'critical',
      category: 'injection',
      message: 'Function constructor usage detected',
      recommendation: 'Remove Function constructor usage',
    });
  }

  // Check for dangerouslySetInnerHTML
  if (/dangerouslySetInnerHTML/i.test(code)) {
    issues.push({
      severity: 'high',
      category: 'xss',
      message: 'dangerouslySetInnerHTML usage detected',
      recommendation: 'Use textContent or safe rendering components instead',
    });
  }

  // Check for innerHTML
  if (/\.innerHTML\s*=/i.test(code)) {
    issues.push({
      severity: 'high',
      category: 'xss',
      message: 'innerHTML assignment detected',
      recommendation: 'Use textContent or safe DOM manipulation instead',
    });
  }

  // Check for document.write
  if (/document\.write\s*\(/i.test(code)) {
    issues.push({
      severity: 'medium',
      category: 'best-practice',
      message: 'document.write() usage detected',
      recommendation: 'Use modern DOM manipulation methods instead',
    });
  }

  // Check for javascript: protocol
  if (/javascript:/i.test(code)) {
    issues.push({
      severity: 'high',
      category: 'xss',
      message: 'javascript: protocol detected',
      recommendation: 'Remove javascript: URLs',
    });
  }

  return issues;
}

/**
 * Generate security report
 */
export function generateSecurityReport(): string {
  const result = runSecurityAudit();
  
  let report = '# Security Audit Report\n\n';
  report += `**Score:** ${result.score}/100\n`;
  report += `**Status:** ${result.passed ? '✅ PASSED' : '❌ FAILED'}\n\n`;

  if (result.issues.length === 0) {
    report += '✅ No security issues detected!\n';
    return report;
  }

  report += `## Issues Found (${result.issues.length})\n\n`;

  const groupedIssues = result.issues.reduce((acc, issue) => {
    if (!acc[issue.severity]) {
      acc[issue.severity] = [];
    }
    acc[issue.severity].push(issue);
    return acc;
  }, {} as Record<string, SecurityIssue[]>);

  const severityOrder: Array<SecurityIssue['severity']> = ['critical', 'high', 'medium', 'low'];

  severityOrder.forEach((severity) => {
    const issues = groupedIssues[severity];
    if (!issues || issues.length === 0) return;

    report += `### ${severity.toUpperCase()} (${issues.length})\n\n`;

    issues.forEach((issue, index) => {
      report += `${index + 1}. **${issue.message}**\n`;
      report += `   - Category: ${issue.category}\n`;
      report += `   - Recommendation: ${issue.recommendation}\n\n`;
    });
  });

  return report;
}

/**
 * Log security audit to console
 */
export function logSecurityAudit(): void {
  if (typeof console === 'undefined') return;

  const result = runSecurityAudit();
  
  console.group('🔒 Security Audit');
  console.log(`Score: ${result.score}/100`);
  console.log(`Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (result.issues.length > 0) {
    console.group(`Issues (${result.issues.length})`);
    result.issues.forEach((issue) => {
      const emoji = {
        critical: '🔴',
        high: '🟠',
        medium: '🟡',
        low: '🔵',
      }[issue.severity];
      
      console.group(`${emoji} ${issue.severity.toUpperCase()}: ${issue.message}`);
      console.log(`Category: ${issue.category}`);
      console.log(`Recommendation: ${issue.recommendation}`);
      console.groupEnd();
    });
    console.groupEnd();
  } else {
    console.log('✅ No issues detected');
  }
  
  console.groupEnd();
}
