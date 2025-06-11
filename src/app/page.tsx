import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Shuffle, Swords, History as HistoryIcon } from 'lucide-react';

export default function Home() {
  return (
    <div className="container mx-auto flex flex-col items-center justify-center flex-1 py-12 px-4 md:px-6">
      <div className="text-center mb-12 md:mb-16">
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold font-headline text-primary">
          unpadelcito?
        </h1>
        <p className="text-muted-foreground mt-4 text-lg md:text-xl max-w-2xl mx-auto">
          Organiza y participa en torneos de pádel de forma fácil y divertida.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 w-full max-w-5xl">
        <Link href="/random-tournament" passHref>
          <Button 
            variant="default" 
            className="w-full h-36 md:h-40 text-lg sm:text-xl rounded-xl shadow-lg hover:shadow-primary/40 focus:shadow-primary/40 transform hover:scale-105 transition-all duration-300 ease-out flex flex-col items-center justify-center p-4"
            aria-label="Ir a Torneo Random"
          >
            <Shuffle className="mb-2 h-10 w-10 md:h-12 md:w-12" />
            Torneo Random
          </Button>
        </Link>
        <Link href="/tournament" passHref>
          <Button 
            variant="default" 
            className="w-full h-36 md:h-40 text-lg sm:text-xl rounded-xl shadow-lg hover:shadow-primary/40 focus:shadow-primary/40 transform hover:scale-105 transition-all duration-300 ease-out flex flex-col items-center justify-center p-4"
            aria-label="Ir a Torneo"
          >
            <Swords className="mb-2 h-10 w-10 md:h-12 md:w-12" />
            Torneo
          </Button>
        </Link>
        <Link href="/history" passHref>
          <Button 
            variant="default" 
            className="w-full h-36 md:h-40 text-lg sm:text-xl rounded-xl shadow-lg hover:shadow-primary/40 focus:shadow-primary/40 transform hover:scale-105 transition-all duration-300 ease-out flex flex-col items-center justify-center p-4"
            aria-label="Ir a Histórico"
          >
            <HistoryIcon className="mb-2 h-10 w-10 md:h-12 md:w-12" />
            Histórico
          </Button>
        </Link>
      </div>
    </div>
  );
}
