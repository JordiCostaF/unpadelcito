
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Activity, Users, Swords, UserX, Info, Calendar as CalendarIconLucide, Clock, MapPinIcon } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { PlayerFormValues, CategoryFormValues } from './random-tournament/page';
import { format } from "date-fns";
import { es } from "date-fns/locale";


interface CategoriaConDuplas extends CategoryFormValues {
  duplas: PlayerFormValues[][];
  jugadoresSobrantes: PlayerFormValues[];
  numTotalJugadores: number;
}

interface TorneoActivoData {
  tournamentName: string;
  date: string; // ISO string
  time: string;
  place: string;
  categoriesWithDuplas: CategoriaConDuplas[];
}

export default function ActiveTournamentPage() {
  const [torneo, setTorneo] = useState<TorneoActivoData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    try {
      const storedTorneo = sessionStorage.getItem('torneoActivo');
      if (storedTorneo) {
        const parsedTorneo = JSON.parse(storedTorneo) as TorneoActivoData;
        if (parsedTorneo && parsedTorneo.tournamentName && parsedTorneo.categoriesWithDuplas) {
          setTorneo(parsedTorneo);
        } else {
          console.warn("Invalid tournament data found in sessionStorage or data is incomplete.");
          setTorneo(null);
        }
      } else {
        setTorneo(null); // No tournament data found
      }
    } catch (error) {
      console.error("Error reading or parsing sessionStorage:", error);
      setTorneo(null); 
    }
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto flex flex-col items-center justify-center flex-1 py-12 px-4 md:px-6 text-center">
        <Activity className="h-16 w-16 text-primary mb-6 animate-spin" />
        <p className="text-lg text-muted-foreground">Cargando torneo activo...</p>
      </div>
    );
  }

  if (!torneo) {
    return (
      <div className="container mx-auto flex flex-col items-center justify-center flex-1 py-12 px-4 md:px-6 text-center">
        <Info className="h-16 w-16 text-primary mb-6" />
        <h1 className="text-3xl md:text-4xl font-bold text-primary mb-4">No hay Torneo Activo</h1>
        <p className="text-md text-muted-foreground mb-6 max-w-md">
          No se ha generado un torneo recientemente o los datos no pudieron cargarse.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/random-tournament" passHref>
              <Button variant="default" size="lg">Crear un Torneo Random</Button>
            </Link>
            <Link href="/" passHref>
              <Button variant="outline" size="lg">Volver al Inicio</Button>
            </Link>
        </div>
      </div>
    );
  }
  
  const formattedDate = torneo.date ? format(new Date(torneo.date), "PPP", { locale: es }) : "Fecha no disponible";

  return (
    <div className="container mx-auto flex flex-col items-center flex-1 py-12 px-4 md:px-6">
      <div className="flex items-center mb-8 text-center">
        <Activity className="h-10 w-10 md:h-12 md:w-12 text-primary mr-2 md:mr-3" />
        <h1 className="text-3xl md:text-5xl font-bold font-headline text-primary break-words">
          {torneo.tournamentName}
        </h1>
      </div>
      <Card className="w-full max-w-3xl mb-8 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Detalles del Torneo</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
          <div className="flex items-center">
            <CalendarIconLucide className="mr-2 h-5 w-5 text-primary" />
            <p><strong>Fecha:</strong> {formattedDate}</p>
          </div>
          <div className="flex items-center">
            <Clock className="mr-2 h-5 w-5 text-primary" />
            <p><strong>Hora:</strong> {torneo.time || "No especificada"}</p>
          </div>
          <div className="flex items-center col-span-1 sm:col-span-2">
            <MapPinIcon className="mr-2 h-5 w-5 text-primary" />
            <p><strong>Lugar:</strong> {torneo.place || "No especificado"}</p>
          </div>
          <div className="flex items-center col-span-1 sm:col-span-2">
            <Users className="mr-2 h-5 w-5 text-primary" />
            <p><strong>Categorías en Torneo:</strong> {torneo.categoriesWithDuplas.length}</p>
          </div>
        </CardContent>
      </Card>

      <h2 className="text-2xl md:text-3xl font-bold text-primary mb-6 self-start w-full max-w-3xl mx-auto">Categorías y Duplas</h2>
      {torneo.categoriesWithDuplas.length > 0 ? (
        <Accordion type="single" collapsible className="w-full max-w-3xl" defaultValue={torneo.categoriesWithDuplas.find(c => c.numTotalJugadores > 0)?.id}>
          {torneo.categoriesWithDuplas.map((categoria) => (
            <AccordionItem value={categoria.id} key={categoria.id} className="border-b">
              <AccordionTrigger className="text-lg md:text-xl font-semibold hover:no-underline py-4">
                <div className="flex justify-between items-center w-full pr-2">
                    <span className="capitalize text-left">{categoria.type} - {categoria.level}</span>
                    <span className="text-xs md:text-sm font-normal text-muted-foreground ml-2 text-right whitespace-nowrap">
                        ({categoria.duplas.length} {categoria.duplas.length !== 1 ? 'duplas' : 'dupla'} / {categoria.numTotalJugadores} jug.)
                    </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 bg-card rounded-b-md">
                {categoria.numTotalJugadores === 0 ? (
                     <p className="text-muted-foreground text-center py-3">No hay jugadores inscritos en esta categoría.</p>
                ): categoria.duplas.length > 0 ? (
                  <ul className="space-y-4">
                    {categoria.duplas.map((dupla, index) => (
                      <li key={index} className="p-3 md:p-4 border rounded-lg shadow-sm bg-background">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-primary flex items-center text-md md:text-lg">
                                <Swords className="mr-2 h-5 w-5" /> Dupla {index + 1}
                            </h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                          <div>
                            <span className="font-medium">Jugador 1:</span> {dupla[0].name} 
                            <span className="text-muted-foreground text-xs capitalize"> ({dupla[0].position})</span>
                          </div>
                          <div>
                            <span className="font-medium">Jugador 2:</span> {dupla[1].name}
                            <span className="text-muted-foreground text-xs capitalize"> ({dupla[1].position})</span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-center py-3">No se pudieron formar duplas para esta categoría (jugadores insuficientes o combinaciones no válidas según las reglas).</p>
                )}
                {categoria.jugadoresSobrantes.length > 0 && (
                  <div className="mt-6 pt-4 border-t">
                    <h4 className="font-semibold text-destructive flex items-center mb-2 text-md md:text-lg">
                      <UserX className="mr-2 h-5 w-5" /> Jugadores Sin Dupla ({categoria.jugadoresSobrantes.length})
                    </h4>
                    <ul className="space-y-2 text-sm list-disc list-inside pl-5">
                      {categoria.jugadoresSobrantes.map(jugador => (
                        <li key={jugador.id}>{jugador.name} <span className="text-muted-foreground">({jugador.rut})</span> - <span className="capitalize">{jugador.position}</span></li>
                      ))}
                    </ul>
                  </div>
                )}
                {/* Mensaje específico si hay jugadores pero no se formaron duplas ni hay sobrantes (lógica extra) */}
                {categoria.numTotalJugadores > 0 && categoria.duplas.length === 0 && categoria.jugadoresSobrantes.length < categoria.numTotalJugadores && categoria.jugadoresSobrantes.length === 0 && (
                     <p className="text-muted-foreground text-center py-3 mt-2">Hay {categoria.numTotalJugadores} jugador(es) inscrito(s), pero no se pudieron formar duplas con las reglas actuales.</p>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <p className="text-muted-foreground text-center py-6 text-lg">No hay categorías definidas para este torneo.</p>
      )}
      
      <Link href="/random-tournament" passHref className="mt-10">
        <Button variant="outline" size="lg" className="text-base">Crear Nuevo Torneo Random</Button>
      </Link>
    </div>
  );
}
