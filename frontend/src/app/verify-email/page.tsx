export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-[calc(100vh-160px)] items-center justify-center px-4 py-10">
      <div className="max-w-md rounded-3xl border border-border/70 bg-[#1E1E1E]/90 p-10 text-center shadow-subtle">
        <h1 className="text-2xl font-semibold text-foreground">Check your inbox</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          We sent you a secure sign-in link. Open the email and click the button to continue using MediBot.
        </p>
      </div>
    </div>
  );
}

