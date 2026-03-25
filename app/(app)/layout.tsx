import { AppHeader } from "@/components/amano/app-header";
import { BottomNav } from "@/components/amano/bottom-nav";
import { Suspense } from "react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface max-w-md md:max-w-3xl lg:max-w-5xl mx-auto relative shadow-2xl">
      <AppHeader />
      <main className="pb-24">{children}</main>
      <Suspense fallback={
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md md:max-w-3xl lg:max-w-5xl h-16 glass-header border-t border-outline-variant/10 shadow-ambient z-[100]" />
      }>
        <BottomNav />
      </Suspense>
    </div>
  );
}
