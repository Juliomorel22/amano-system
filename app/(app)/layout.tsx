import { AppHeader } from "@/components/amano/app-header";
import { BottomNav } from "@/components/amano/bottom-nav";
import { Suspense } from "react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center">
      <div className="w-full max-w-7xl mx-auto flex flex-col min-h-screen relative shadow-2xl lg:shadow-none bg-surface">
        <AppHeader />
        <main className="flex-1 pb-24 lg:pb-8">{children}</main>
        <Suspense fallback={
          <nav className="fixed bottom-0 left-0 right-0 h-16 glass-header border-t border-outline-variant/10 shadow-ambient z-[100]" />
        }>
          <BottomNav />
        </Suspense>
      </div>
    </div>
  );
}
