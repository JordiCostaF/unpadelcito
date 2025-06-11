import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Swords } from 'lucide-react';

export default function TournamentPage() {
  return (
    <div className="container mx-auto flex flex-col items-center justify-center flex-1 py-12 px-4 md:px-6 text-center">
      <Swords className="h-16 w-16 text-primary mb-6" />
      <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary mb-6">
        Torneo
      </h1>
      <p className="text-lg text-muted-foreground mb-8 max-w-xl">
        ¡Prepara tus palas! La sección de torneos está en construcción. Pronto podrás crear y unirte a competiciones.
      </p>
      <Link href="/" passHref>
        <Button variant="outline" size="lg" className="text-base">
          Volver al Inicio
        </Button>
      </Link>
    </div>
  );
}
