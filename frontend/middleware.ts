import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// If ALLOW_ANON is enabled, bypass authentication entirely
const ALLOW_ANON = process.env.ALLOW_ANON === "true";

export function middleware(request: NextRequest) {
  if (ALLOW_ANON) {
    // Allow all requests when anonymous mode is enabled
    return NextResponse.next();
  }
  
  // Otherwise, use NextAuth middleware (commented out for now)
  // Uncomment the line below and remove the above code when OAuth is configured
  // return auth(request);
  return NextResponse.next();
}

export const config = {
  matcher: ["/chat"],
};

