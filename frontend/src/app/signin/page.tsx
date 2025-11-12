"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Mail, ShieldCheck, Stethoscope } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailSignIn = async () => {
    if (!email) return;
    setIsLoading(true);
    const result = await signIn("email", { email, redirect: false });
    setIsLoading(false);

    if (result?.error) {
      toast({
        title: "Could not send email",
        description: "Check the email address or try again later.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Verification sent",
        description: "Please check your inbox for the sign-in link.",
      });
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-160px)] items-center justify-center px-4 py-10">
      <Card className="w-full max-w-lg bg-[#1E1E1E]/90">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-primary">
            <Stethoscope className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl text-foreground">Sign in to MediBot</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Securely access your medical conversations with Google or email verification.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Button
            onClick={() => signIn("google", { callbackUrl: "/chat" })}
            className="w-full gap-2"
            size="lg"
            variant="outline"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M21.35 11.1h-9.17v2.96h5.32c-.23 1.25-.93 2.32-1.98 3.03v2.52h3.2c1.87-1.72 2.93-4.25 2.93-7.22 0-.7-.07-1.37-.3-2.09Z"
              />
              <path
                fill="currentColor"
                d="M12.18 22c2.7 0 4.98-.89 6.63-2.39l-3.2-2.52c-.93.62-2.11.99-3.43.99-2.63 0-4.87-1.77-5.67-4.16H3.23v2.62C4.9 19.76 8.33 22 12.18 22Z"
              />
              <path
                fill="currentColor"
                d="M6.52 13.92a5.7 5.7 0 0 1 0-3.84V7.46H3.23a9.76 9.76 0 0 0 0 9.08l3.29-2.62Z"
              />
              <path
                fill="currentColor"
                d="M12.18 5.62c1.47 0 2.8.51 3.85 1.52l2.88-2.88C17.15 2.63 14.88 1.75 12.18 1.75 8.33 1.75 4.9 4 3.23 7.46l3.29 2.62c.8-2.39 3.04-4.16 5.66-4.16Z"
              />
            </svg>
            Continue with Google
          </Button>

          <Separator className="border-border/60" />

          <div className="space-y-3">
            <label className="text-sm text-muted-foreground">Email address</label>
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <Button size="lg" className="w-full gap-2" onClick={handleEmailSignIn} disabled={isLoading || !email}>
              <Mail className="h-4 w-4" />
              {isLoading ? "Sending link…" : "Send magic link"}
            </Button>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              We only use your email to verify your sign-in.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

