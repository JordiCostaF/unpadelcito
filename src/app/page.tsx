import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PadelRacketIcon } from '@/components/icons/PadelRacketIcon';
import { Shuffle, Users, Activity, History as HistoryIcon } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <div className="mb-8">
        <PadelRacketIcon className="h-24 w-24 text-primary" />
      </div>
      <h1 className="text-6xl md:text-7xl font-bold font-headline text-primary mb-4">
        unpadelcito
      </h1>
      <p className="text-lg text-muted-foreground mb-12 max-w-xl">
        Tu app para organizar torneos de pádel de forma sencilla y rápida. Arma duplas al azar o regístralas directamente.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl mb-6">
        <Link href="/random-tournament" passHref>
          <Button variant="default" size="lg" className="w-full h-32 text-lg flex-col gap-2">
            <Shuffle className="h-8 w-8 mb-2" />
            <span>Crear Torneo<br/>Random</span>
          </Button>
        </Link>
        <Link href="/tournament" passHref>
          <Button variant="default" size="lg" className="w-full h-32 text-lg flex-col gap-2">
            <Users className="h-8 w-8 mb-2" />
            <span>Crear Torneo<br/>por Duplas</span>
          </Button>
        </Link>
        <Link href="/active-tournament" passHref>
          <Button variant="secondary" size="lg" className="w-full h-32 text-lg flex-col gap-2">
            <Activity className="h-8 w-8 mb-2" />
            <span>Ver Torneo<br/>Activo</span>
          </Button>
        </Link>
      </div>
      
      <div className="w-full max-w-4xl mt-4 flex justify-center">
        <Link href="/history" passHref>
          <Button variant="outline" size="lg" className="w-full sm:w-auto">
            <HistoryIcon className="mr-2 h-5 w-5" />
            Historial de Torneos
          </Button>
        </Link>
      </div>
    </div>
  );
}
