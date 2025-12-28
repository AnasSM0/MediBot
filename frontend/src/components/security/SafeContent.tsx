/**
 * Safe Content Component
 * 
 * Secure component for rendering user-generated content.
 * Prevents XSS by sanitizing and escaping content.
 */

"use client";

import { useMemo } from "react";
import { sanitizeText, escapeHtml, isSafeString } from "@/lib/security";

export type SafeContentProps = {
  content: string;
  className?: string;
  as?: 'div' | 'span' | 'p' | 'pre';
  maxLength?: number;
  allowNewlines?: boolean;
};

/**
 * Safe Content Component
 * 
 * Renders user content safely by sanitizing and escaping.
 * Never uses dangerouslySetInnerHTML.
 * 
 * @example
 * ```tsx
 * <SafeContent content={userInput} />
 * <SafeContent content={message} as="p" />
 * <SafeContent content={code} as="pre" allowNewlines />
 * ```
 */
export function SafeContent({
  content,
  className,
  as: Component = 'div',
  maxLength = 10000,
  allowNewlines = true,
}: SafeContentProps) {
  const safeContent = useMemo(() => {
    if (typeof content !== 'string') {
      return '';
    }

    // Sanitize the content
    let sanitized = sanitizeText(content);

    // Truncate if too long
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength) + '...';
    }

    // Handle newlines
    if (!allowNewlines) {
      sanitized = sanitized.replace(/\n/g, ' ');
    }

    return sanitized;
  }, [content, maxLength, allowNewlines]);

  // Use textContent (safe) instead of innerHTML
  return <Component className={className}>{safeContent}</Component>;
}

/**
 * Safe Link Component
 * 
 * Renders links safely with URL validation.
 */
export type SafeLinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
  target?: '_blank' | '_self';
};

export function SafeLink({ href, children, className, target = '_self' }: SafeLinkProps) {
  const safeHref = useMemo(() => {
    if (typeof href !== 'string') {
      return '#';
    }

    // Check for dangerous protocols
    if (/^(javascript|data|vbscript):/i.test(href)) {
      return '#';
    }

    // Only allow http, https, mailto, tel
    if (!/^(https?|mailto|tel):/i.test(href) && !/^\//.test(href)) {
      return '#';
    }

    return href;
  }, [href]);

  const linkProps = target === '_blank' 
    ? { target: '_blank', rel: 'noopener noreferrer' } // Prevent tabnabbing
    : {};

  return (
    <a href={safeHref} className={className} {...linkProps}>
      {children}
    </a>
  );
}

/**
 * Safe Image Component
 * 
 * Renders images safely with URL validation.
 */
export type SafeImageProps = {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
};

export function SafeImage({ src, alt, className, width, height }: SafeImageProps) {
  const safeSrc = useMemo(() => {
    if (typeof src !== 'string') {
      return '';
    }

    // Check for dangerous protocols
    if (/^(javascript|vbscript):/i.test(src)) {
      return '';
    }

    // Allow data: for base64 images, blob: for uploaded images, and https:
    if (!/^(data:|blob:|https?:)/i.test(src) && !/^\//.test(src)) {
      return '';
    }

    return src;
  }, [src]);

  const safeAlt = useMemo(() => {
    return sanitizeText(alt || 'Image');
  }, [alt]);

  if (!safeSrc) {
    return null;
  }

  return (
    <img
      src={safeSrc}
      alt={safeAlt}
      className={className}
      width={width}
      height={height}
      loading="lazy"
    />
  );
}

/**
 * Safe Code Block Component
 * 
 * Renders code safely with syntax highlighting prevention.
 */
export type SafeCodeProps = {
  code: string;
  className?: string;
  language?: string;
};

export function SafeCode({ code, className, language }: SafeCodeProps) {
  const safeCode = useMemo(() => {
    return sanitizeText(code);
  }, [code]);

  return (
    <pre className={className} data-language={language}>
      <code>{safeCode}</code>
    </pre>
  );
}

/**
 * Safe Form Input Component
 * 
 * Input with built-in sanitization.
 */
export type SafeInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  maxLength?: number;
  type?: 'text' | 'email' | 'url';
  disabled?: boolean;
};

export function SafeInput({
  value,
  onChange,
  placeholder,
  className,
  maxLength = 1000,
  type = 'text',
  disabled,
}: SafeInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;

    // Sanitize input
    newValue = sanitizeText(newValue);

    // Enforce max length
    if (newValue.length > maxLength) {
      newValue = newValue.substring(0, maxLength);
    }

    // Additional validation based on type
    if (type === 'email') {
      // Remove spaces from email
      newValue = newValue.replace(/\s/g, '');
    } else if (type === 'url') {
      // Remove spaces from URL
      newValue = newValue.replace(/\s/g, '');
    }

    onChange(newValue);
  };

  return (
    <input
      type={type}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
      maxLength={maxLength}
      disabled={disabled}
    />
  );
}

/**
 * Safe Textarea Component
 * 
 * Textarea with built-in sanitization.
 */
export type SafeTextareaProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  maxLength?: number;
  rows?: number;
  disabled?: boolean;
};

export function SafeTextarea({
  value,
  onChange,
  placeholder,
  className,
  maxLength = 10000,
  rows = 4,
  disabled,
}: SafeTextareaProps) {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let newValue = e.target.value;

    // Sanitize input (but allow newlines)
    newValue = sanitizeText(newValue);

    // Enforce max length
    if (newValue.length > maxLength) {
      newValue = newValue.substring(0, maxLength);
    }

    onChange(newValue);
  };

  return (
    <textarea
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
      maxLength={maxLength}
      rows={rows}
      disabled={disabled}
    />
  );
}
