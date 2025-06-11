
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Activity } from 'lucide-react';

export default function ActiveTournamentPage() {
  return (
    <div className="container mx-auto flex flex-col items-center justify-center flex-1 py-12 px-4 md:px-6 text-center">
      <Activity className="h-16 w-16 text-primary mb-6" />
      <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary mb-6">
        Torneo Activo
      </h1>
      <p className="text-lg text-muted-foreground mb-8 max-w-xl">
        Aquí podrás ver y gestionar los torneos que están actualmente en curso. ¡Próximamente!
      </p>
      <Link href="/" passHref>
        <Button variant="outline" size="lg" className="text-base">
          Volver al Inicio
        </Button>
      </Link>
    </div>
  );
}
