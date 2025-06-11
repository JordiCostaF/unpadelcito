import type { ReactNode } from 'react';
import Link from 'next/link';
import { PadelRacketIcon } from '@/components/icons/PadelRacketIcon';
import { Toaster } from "@/components/ui/toaster";

type MainLayoutProps = {
  children: ReactNode;
};

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2" aria-label="Homepage">
            <PadelRacketIcon className="h-7 w-7 text-primary" />
            <span className="font-bold text-xl font-headline text-primary">unpadelcito</span>
          </Link>
          {/* Future navigation links can be placed here */}
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="py-6 md:px-8 md:py-0 bg-background border-t border-border/40">
        <div className="container flex flex-col items-center justify-center gap-4 h-20 md:flex-row">
          <p className="text-balance text-center text-sm leading-loose text-muted-foreground md:text-left">
            &copy; {new Date().getFullYear()} unpadelcito. Todos los derechos reservados.
          </p>
        </div>
      </footer>
      <Toaster />
    </div>
  );
}
