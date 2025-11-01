"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  if (loading || user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <div className="flex flex-col items-center gap-6">
        <div className="rounded-full bg-primary p-4 text-primary-foreground shadow-lg">
          <Zap className="h-12 w-12 text-accent" />
        </div>
        <h1 className="font-headline text-5xl font-bold tracking-tight text-primary md:text-6xl">
          CircuitView
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground md:text-xl">
          Analyze and visualize your electrical data with beautiful charts and
          insights.
        </p>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row">
          <Button asChild size="lg" className="font-semibold">
            <Link href="/signup">Get Started</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="font-semibold">
            <Link href="/login">Login</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
