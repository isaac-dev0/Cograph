export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Authentication Error</h1>
        <p className="mt-2 text-muted-foreground">
          There was a problem signing you in.
        </p>
        <a 
          href="/auth/login" 
          className="mt-4 inline-block text-primary hover:underline"
        >
          Try again
        </a>
      </div>
    </div>
  );
}