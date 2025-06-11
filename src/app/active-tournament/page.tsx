
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Activity, Users, Swords, UserX, Info, Calendar as CalendarIconLucide, Clock, MapPinIcon, Home, ListChecks, Settings, ShieldQuestion, Trophy as TrophyIcon, Edit3, Trash2 } from 'lucide-react';
import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { PlayerFormValues, CategoryFormValues } from '../random-tournament/page';
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Dupla {
  id: string;
  jugadores: [PlayerFormValues, PlayerFormValues];
  nombre: string; 
}

interface CategoriaConDuplas extends CategoryFormValues {
  duplas: Dupla[];
  jugadoresSobrantes: PlayerFormValues[];
  numTotalJugadores: number;
}

interface TorneoActivoData {
  tournamentName: string;
  date: string; 
  time: string;
  place: string;
  categoriesWithDuplas: CategoriaConDuplas[];
  numCourts?: number;
  matchDuration?: number; 
}

interface Standing {
  duplaId: string;
  duplaName: string;
  pj: number; 
  pg: number; 
  pp: number; 
  pf: number; 
  pc: number; 
  pts: number; 
}

interface Match {
  id: string;
  round?: number;
  dupla1: Dupla;
  dupla2: Dupla;
  score1?: number;
  score2?: number;
  court?: number | string;
  time?: string;
  status: 'pending' | 'completed' | 'live';
  winnerId?: string;
  groupOriginId?: string; 
}

interface Group {
  id: string;
  name: string; 
  duplas: Dupla[];
  standings: Standing[];
  matches: Match[];
}

interface PlayoffMatch extends Match {
  stage: 'semifinal' | 'final' | 'tercer_puesto';
  description: string; 
}

interface CategoryFixture {
  categoryId: string;
  categoryName: string;
  groups: Group[];
  playoffMatches?: PlayoffMatch[];
}

interface FixtureData {
  [categoryId: string]: CategoryFixture;
}


const generateDuplaId = (d: [PlayerFormValues, PlayerFormValues]): string => {
  const p1 = d?.[0];
  const p2 = d?.[1];

  if (!p1 || !p2) {
    console.error("Invalid dupla structure passed to generateDuplaId:", d);
    return `error-dupla-id-${Math.random().toString(36).substring(2, 9)}`;
  }
  const p1Identifier = p1.rut || p1.name;
  const p2Identifier = p2.rut || p2.name;

  if (!p1Identifier || !p2Identifier) {
    console.error("Player in dupla missing identifier (rut or name):", d);
    return `error-player-id-${Math.random().toString(36).substring(2, 9)}`;
  }
  return [p1Identifier, p2Identifier].sort().join('-');
};


export default function ActiveTournamentPage() {
  const [torneo, setTorneo] = useState<TorneoActivoData | null>(null);
  const [fixture, setFixture] = useState<FixtureData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [numCourts, setNumCourts] = useState<number | undefined>(undefined);
  const [matchDuration, setMatchDuration] = useState<number | undefined>(undefined);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  const loadTournamentData = useCallback(() => {
    setIsLoading(true);
    try {
      const storedTorneo = sessionStorage.getItem('torneoActivo');
      if (storedTorneo) {
        const parsedTorneo = JSON.parse(storedTorneo); 
        
        if (parsedTorneo && parsedTorneo.tournamentName && parsedTorneo.categoriesWithDuplas) {
          const transformedCategories = parsedTorneo.categoriesWithDuplas.map((cat: any) => {
            const duplasTransformadas = (cat.duplas || []).map((duplaItem: unknown) => {
              if (
                !Array.isArray(duplaItem) ||
                duplaItem.length !== 2
              ) {
                console.warn('Skipping malformed duplaItem (not an array or not length 2):', duplaItem);
                return null;
              }

              const p1 = duplaItem[0] as PlayerFormValues | undefined;
              const p2 = duplaItem[1] as PlayerFormValues | undefined;

              if (
                !p1 || !p2 || 
                !(p1.rut || p1.name) || 
                !(p2.rut || p2.name) || 
                !p1.name ||             
                !p2.name                
              ) {
                console.warn('Skipping duplaItem with invalid player data (missing player, or missing rut/name for ID, or missing name for display):', duplaItem);
                return null;
              }
              
              const validDuplaPlayers = [p1, p2] as [PlayerFormValues, PlayerFormValues];

              return {
                id: generateDuplaId(validDuplaPlayers),
                jugadores: validDuplaPlayers,
                nombre: `${p1.name} / ${p2.name}`
              };
            }).filter(Boolean); 

            return {
              ...cat,
              duplas: duplasTransformadas as Dupla[],
            };
          });
          
          setTorneo({ ...parsedTorneo, categoriesWithDuplas: transformedCategories });
          setNumCourts(parsedTorneo.numCourts || 2);
          setMatchDuration(parsedTorneo.matchDuration || 60);

          const storedFixture = sessionStorage.getItem(`fixture_${parsedTorneo.tournamentName}`);
          if (storedFixture) {
            setFixture(JSON.parse(storedFixture));
          } else {
            setFixture(null);
          }

        } else {
          setTorneo(null);
          setFixture(null);
        }
      } else {
        setTorneo(null);
        setFixture(null);
      }
    } catch (error) {
      console.error("Error reading or parsing sessionStorage:", error);
      toast({ title: "Error de Carga", description: "No se pudieron cargar los datos del torneo. Intenta generar uno nuevo.", variant: "destructive" });
      setTorneo(null);
      setFixture(null);
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    loadTournamentData();
  }, [loadTournamentData]);

  const handleTournamentSettingChange = (type: 'courts' | 'duration', value: string) => {
    if (!torneo) return;
    const numericValue = parseInt(value, 10);
    let updatedTorneo = { ...torneo };

    if (type === 'courts') {
      setNumCourts(numericValue);
      updatedTorneo.numCourts = numericValue;
    } else if (type === 'duration') {
      setMatchDuration(numericValue);
      updatedTorneo.matchDuration = numericValue;
    }
    
    setTorneo(updatedTorneo);
    sessionStorage.setItem('torneoActivo', JSON.stringify(updatedTorneo));
    toast({ title: "Ajuste Guardado", description: `Se actualizó ${type === 'courts' ? 'el número de canchas' : 'la duración de partidos'}.` });
    setFixture(null);
    if (torneo) {
        sessionStorage.removeItem(`fixture_${torneo.tournamentName}`);
    }
  };

  const generateFixture = () => {
    if (!torneo || !torneo.categoriesWithDuplas || !numCourts || !matchDuration) {
      toast({ title: "Error", description: "Faltan datos del torneo, canchas o duración de partidos para generar el fixture.", variant: "destructive" });
      return;
    }

    const newFixture: FixtureData = {};
    let globalMatchCounter = 0; 
    const tournamentStartTime = torneo.time ? new Date(`1970-01-01T${torneo.time}`) : new Date(1970,0,1,9,0,0); 

    torneo.categoriesWithDuplas.forEach(category => {
      if (category.duplas.length < 2) { 
        newFixture[category.id] = {
          categoryId: category.id,
          categoryName: `${category.type} - ${category.level}`,
          groups: [],
          playoffMatches: []
        };
        return;
      }

      const categoryDuplas = [...category.duplas]; 
      const groups: Group[] = [];
      const numCategoryDuplas = categoryDuplas.length;
      let groupLetter = 'A';

      if (numCategoryDuplas < 3) { 
         groups.push({
            id: `${category.id}-G${groupLetter}`,
            name: `Grupo ${groupLetter}`,
            duplas: [...categoryDuplas],
            standings: categoryDuplas.map(d => ({ duplaId: d.id, duplaName: d.nombre, pj: 0, pg: 0, pp: 0, pf: 0, pc: 0, pts: 0 })),
            matches: []
         });
      } else {
        let duplasToAssign = numCategoryDuplas;
        const idealGroupSize = Math.min(5, Math.max(3, Math.ceil(numCategoryDuplas / Math.ceil(numCategoryDuplas/5))));
        
        while(duplasToAssign > 0) {
            let currentGroupSize = Math.min(duplasToAssign, idealGroupSize);
            if (duplasToAssign - currentGroupSize > 0 && duplasToAssign - currentGroupSize < 3) {
                 if (groups.length > 0 && duplasToAssign < idealGroupSize && duplasToAssign < 3) {
                    const groupDuplas = categoryDuplas.splice(0, duplasToAssign);
                     groups.push({
                        id: `${category.id}-G${groupLetter}`,
                        name: `Grupo ${groupLetter}`,
                        duplas: groupDuplas,
                        standings: groupDuplas.map(d => ({ duplaId: d.id, duplaName: d.nombre, pj: 0, pg: 0, pp: 0, pf: 0, pc: 0, pts: 0 })),
                        matches: []
                     });
                     duplasToAssign = 0; 
                 } else {
                    currentGroupSize = Math.max(3, currentGroupSize); 
                    const groupDuplas = categoryDuplas.splice(0, Math.min(duplasToAssign, currentGroupSize));
                    groups.push({
                        id: `${category.id}-G${groupLetter}`,
                        name: `Grupo ${groupLetter}`,
                        duplas: groupDuplas,
                        standings: groupDuplas.map(d => ({ duplaId: d.id, duplaName: d.nombre, pj: 0, pg: 0, pp: 0, pf: 0, pc: 0, pts: 0 })),
                        matches: []
                    });
                    duplasToAssign -= groupDuplas.length;
                 }

            } else {
                 const groupDuplas = categoryDuplas.splice(0, currentGroupSize);
                 groups.push({
                    id: `${category.id}-G${groupLetter}`,
                    name: `Grupo ${groupLetter}`,
                    duplas: groupDuplas,
                    standings: groupDuplas.map(d => ({ duplaId: d.id, duplaName: d.nombre, pj: 0, pg: 0, pp: 0, pf: 0, pc: 0, pts: 0 })),
                    matches: []
                 });
                 duplasToAssign -= groupDuplas.length;
            }
            groupLetter = String.fromCharCode(groupLetter.charCodeAt(0) + 1);
            if (categoryDuplas.length === 0) duplasToAssign = 0; 
        }
      }

      groups.forEach(g => g.matches = []); 

      if (groups.length > 0 && groups.length === numCourts) {
        const matchesByGroup: { [groupId: string]: Match[] } = {};
        groups.forEach(g => matchesByGroup[g.id] = []);

        groups.forEach(group => {
            const groupDuplas = group.duplas;
            for (let i = 0; i < groupDuplas.length; i++) {
                for (let j = i + 1; j < groupDuplas.length; j++) {
                    matchesByGroup[group.id].push({
                        id: `${group.id}-M${matchesByGroup[group.id].length + 1}`,
                        dupla1: groupDuplas[i],
                        dupla2: groupDuplas[j],
                        status: 'pending',
                    });
                }
            }
        });

        let maxRoundsInGroup = 0;
        groups.forEach(g => {
            if (matchesByGroup[g.id].length > maxRoundsInGroup) {
                maxRoundsInGroup = matchesByGroup[g.id].length;
            }
        });

        for (let roundNum = 0; roundNum < maxRoundsInGroup; roundNum++) {
            const currentRoundStartTime = new Date(tournamentStartTime.getTime() + (globalMatchCounter * matchDuration * 60000));
            let roundHasActivity = false;
            groups.forEach((group, groupIndex) => {
                if (matchesByGroup[group.id][roundNum]) {
                    const matchToAssign = matchesByGroup[group.id][roundNum];
                    matchToAssign.court = `Cancha ${groupIndex + 1}`; 
                    matchToAssign.time = format(currentRoundStartTime, "HH:mm");
                    group.matches.push(matchToAssign);
                    roundHasActivity = true;
                }
            });
            if (roundHasActivity) {
                globalMatchCounter++; 
            }
        }
      } else if (groups.length > 0) {
        const allCategoryRawMatches: (Match & { groupOriginId: string })[] = [];
        let tempMatchIdCounter = 0;
        groups.forEach(group => {
            const groupDuplas = group.duplas;
            for (let i = 0; i < groupDuplas.length; i++) {
                for (let j = i + 1; j < groupDuplas.length; j++) {
                    allCategoryRawMatches.push({
                        id: `${category.id}-MATCH-${tempMatchIdCounter++}`,
                        groupOriginId: group.id,
                        dupla1: groupDuplas[i],
                        dupla2: groupDuplas[j],
                        status: 'pending',
                    });
                }
            }
        });
        
        let categoryMatchSlotCounter = 0; 
        allCategoryRawMatches.forEach(match => {
            const currentMatchTime = new Date(tournamentStartTime.getTime() + (globalMatchCounter * matchDuration * 60000));
            const assignedCourtNumber = (categoryMatchSlotCounter % numCourts) + 1;
            
            match.court = `Cancha ${assignedCourtNumber}`;
            match.time = format(currentMatchTime, "HH:mm");
            
            const targetGroup = groups.find(g => g.id === match.groupOriginId);
            if (targetGroup) {
                targetGroup.matches.push(match);
            }

            categoryMatchSlotCounter++;
            if (categoryMatchSlotCounter % numCourts === 0) {
                globalMatchCounter++; 
            }
        });

        if (allCategoryRawMatches.length > 0 && (categoryMatchSlotCounter % numCourts !== 0)) {
            globalMatchCounter++; 
        }
      }

      let playoffMatches: PlayoffMatch[] | undefined = undefined;
      if (groups.length === 2) {
        const playoffStartTimeOffset = globalMatchCounter; 
        playoffMatches = [
          { id: `${category.id}-SF1`, dupla1: {id: 'placeholder-G1W', nombre: 'Ganador Grupo A', jugadores:[] as any}, dupla2: {id:'placeholder-G2RU', nombre:'Segundo Grupo B', jugadores:[] as any}, status: 'pending', stage: 'semifinal', description: 'Ganador Grupo A vs Segundo Grupo B', court: `Cancha 1`, time: format(new Date(tournamentStartTime.getTime() + (playoffStartTimeOffset * matchDuration * 60000)), "HH:mm")},
          { id: `${category.id}-SF2`, dupla1: {id:'placeholder-G2W', nombre:'Ganador Grupo B', jugadores:[] as any}, dupla2: {id:'placeholder-G1RU', nombre:'Segundo Grupo A', jugadores:[] as any}, status: 'pending', stage: 'semifinal', description: 'Ganador Grupo B vs Segundo Grupo A', court: `Cancha 2`, time: format(new Date(tournamentStartTime.getTime() + (playoffStartTimeOffset * matchDuration * 60000)), "HH:mm") },
          { id: `${category.id}-F`, dupla1: {id:'placeholder-SF1W', nombre:'Ganador SF1', jugadores:[] as any}, dupla2: {id:'placeholder-SF2W', nombre:'Ganador SF2', jugadores:[] as any}, status: 'pending', stage: 'final', description: 'Final', court: `Cancha 1`, time: format(new Date(tournamentStartTime.getTime() + ((playoffStartTimeOffset + 1) * matchDuration * 60000)), "HH:mm") },
        ];
      }

      newFixture[category.id] = {
        categoryId: category.id,
        categoryName: `${category.type} - ${category.level}`,
        groups,
        playoffMatches
      };
    });

    setFixture(newFixture);
    sessionStorage.setItem(`fixture_${torneo.tournamentName}`, JSON.stringify(newFixture));
    toast({ title: "Fixture Generado", description: "Se ha creado la planilla de grupos y partidos." });
  };

  const handleDeleteTournamentConfirm = () => {
    if (torneo) {
      sessionStorage.removeItem(`fixture_${torneo.tournamentName}`);
      sessionStorage.removeItem('torneoActivo');
      loadTournamentData(); // This will set torneo and fixture to null
      toast({ title: "Torneo Borrado", description: "El torneo activo ha sido eliminado." });
    }
    setIsDeleteDialogOpen(false);
  };


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
              <Button variant="outline" size="lg"><Home className="mr-2 h-5 w-5" />Volver al Inicio</Button>
            </Link>
        </div>
      </div>
    );
  }
  
  const formattedDate = torneo.date ? format(new Date(torneo.date), "PPP", { locale: es }) : "Fecha no disponible";

  return (
    <div className="container mx-auto flex flex-col items-center flex-1 py-12 px-4 md:px-6">
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro de borrar el torneo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminarán todos los datos del torneo activo, incluyendo
              las duplas y el fixture generado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTournamentConfirm} className="bg-destructive hover:bg-destructive/90">
              Confirmar Borrado
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-center mb-8 text-center">
        <Activity className="h-10 w-10 md:h-12 md:w-12 text-primary mr-2 md:mr-3" />
        <h1 className="text-3xl md:text-5xl font-bold font-headline text-primary break-words">
          {torneo.tournamentName}
        </h1>
      </div>
      <Card className="w-full max-w-4xl mb-8 shadow-lg">
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
          <div className="flex items-center">
            <Users className="mr-2 h-5 w-5 text-primary" />
            <p><strong>Categorías:</strong> {torneo.categoriesWithDuplas.length}</p>
          </div>
          
          <div className="space-y-1">
            <Label htmlFor="numCourts" className="flex items-center"><Settings className="mr-2 h-4 w-4 text-muted-foreground" />Nº de Canchas</Label>
            <Select 
                value={numCourts?.toString()} 
                onValueChange={(value) => handleTournamentSettingChange('courts', value)}
                disabled={!!fixture}
            >
              <SelectTrigger id="numCourts">
                <SelectValue placeholder="Selecciona canchas" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 9 }, (_, i) => i + 2).map(n => (
                  <SelectItem key={n} value={n.toString()}>{n} canchas</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="matchDuration" className="flex items-center"><Clock className="mr-2 h-4 w-4 text-muted-foreground" />Duración Partidos</Label>
            <Select
                value={matchDuration?.toString()}
                onValueChange={(value) => handleTournamentSettingChange('duration', value)}
                disabled={!!fixture}
            >
              <SelectTrigger id="matchDuration">
                <SelectValue placeholder="Selecciona duración" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutos</SelectItem>
                <SelectItem value="45">45 minutos</SelectItem>
                <SelectItem value="60">60 minutos</SelectItem>
                <SelectItem value="90">90 minutos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between items-center pt-4">
            <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)} >
                <Trash2 className="mr-2 h-5 w-5" />
                Borrar Torneo
            </Button>
            <Button onClick={generateFixture} disabled={!numCourts || !matchDuration || !!fixture}>
                <ListChecks className="mr-2 h-5 w-5" />
                {fixture ? "Partidos Ya Generados" : "Generar Partidos"}
            </Button>
        </CardFooter>
      </Card>

      <h2 className="text-2xl md:text-3xl font-bold text-primary mb-6 self-start w-full max-w-4xl mx-auto">Categorías y Duplas Originales</h2>
      {torneo.categoriesWithDuplas.length > 0 ? (
        <Accordion type="single" collapsible className="w-full max-w-4xl mb-8" defaultValue={torneo.categoriesWithDuplas.find(c => c.numTotalJugadores > 0)?.id}>
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
                      <li key={dupla.id || index} className="p-3 md:p-4 border rounded-lg shadow-sm bg-background">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-primary flex items-center text-md md:text-lg">
                                <Swords className="mr-2 h-5 w-5" /> Dupla {index + 1}: {dupla.nombre}
                            </h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                          <div>
                            <span className="font-medium">Jugador 1:</span> {dupla.jugadores[0].name} 
                            <span className="text-muted-foreground text-xs capitalize"> ({dupla.jugadores[0].position})</span>
                          </div>
                          <div>
                            <span className="font-medium">Jugador 2:</span> {dupla.jugadores[1].name}
                            <span className="text-muted-foreground text-xs capitalize"> ({dupla.jugadores[1].position})</span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-center py-3">No se pudieron formar duplas para esta categoría.</p>
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
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <p className="text-muted-foreground text-center py-6 text-lg">No hay categorías definidas para este torneo.</p>
      )}

      {fixture && Object.keys(fixture).length > 0 && (
        <Card className="w-full max-w-4xl mb-8 shadow-lg">
            <CardHeader>
                <CardTitle className="text-2xl flex items-center"><TrophyIcon className="mr-2 h-6 w-6 text-primary" /> Planilla del Torneo</CardTitle>
                <CardDescription>Grupos, partidos y playoffs generados.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Tabs defaultValue={Object.keys(fixture).find(key => fixture[key].groups.length > 0 || (fixture[key].playoffMatches && fixture[key].playoffMatches!.length > 0)) || Object.keys(fixture)[0]} className="w-full">
                    <TabsList className="grid w-full grid-cols-min-1fr md:grid-cols-none md:flex md:flex-wrap justify-start mb-4">
                        {Object.values(fixture).map((catFixture) => (
                           (catFixture.groups.length > 0 || (catFixture.playoffMatches && catFixture.playoffMatches.length > 0)) &&
                            <TabsTrigger key={catFixture.categoryId} value={catFixture.categoryId} className="capitalize truncate text-xs sm:text-sm px-2 sm:px-3">
                                {catFixture.categoryName}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    {Object.values(fixture).map((catFixture) => (
                       (catFixture.groups.length > 0 || (catFixture.playoffMatches && catFixture.playoffMatches.length > 0)) &&
                        <TabsContent key={catFixture.categoryId} value={catFixture.categoryId}>
                            <Tabs defaultValue="grupos" className="w-full">
                                <TabsList className="grid w-full grid-cols-3 mb-2">
                                    <TabsTrigger value="grupos" disabled={catFixture.groups.length === 0}>Grupos</TabsTrigger>
                                    <TabsTrigger value="partidos" disabled={!catFixture.groups.some(g => g.matches.length > 0)}>Partidos</TabsTrigger>
                                    <TabsTrigger value="playoffs" disabled={!catFixture.playoffMatches || catFixture.playoffMatches.length === 0}>Playoffs</TabsTrigger>
                                </TabsList>
                                <TabsContent value="grupos">
                                    {catFixture.groups.length > 0 ? catFixture.groups.map(group => (
                                        <div key={group.id} className="mb-6">
                                            <h4 className="text-lg font-semibold text-primary mb-2">{group.name}</h4>
                                            <div className="overflow-x-auto">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead className="w-[30px] px-2 text-center">#</TableHead>
                                                            <TableHead className="min-w-[150px] px-2">Dupla</TableHead>
                                                            <TableHead className="w-[40px] px-1 text-center">PJ</TableHead>
                                                            <TableHead className="w-[40px] px-1 text-center">PG</TableHead>
                                                            <TableHead className="w-[40px] px-1 text-center">PP</TableHead>
                                                            <TableHead className="w-[40px] px-1 text-center">PF</TableHead>
                                                            <TableHead className="w-[40px] px-1 text-center">PC</TableHead>
                                                            <TableHead className="w-[40px] px-1 text-center">Pts</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {group.standings.sort((a,b) => b.pts - a.pts || (b.pf - b.pc) - (a.pf - a.pc) || b.pf - a.pf ).map((s, idx) => (
                                                            <TableRow key={s.duplaId}>
                                                                <TableCell className="px-2 text-center">{idx + 1}</TableCell>
                                                                <TableCell className="px-2 text-xs sm:text-sm">{s.duplaName}</TableCell>
                                                                <TableCell className="px-1 text-center">{s.pj}</TableCell>
                                                                <TableCell className="px-1 text-center">{s.pg}</TableCell>
                                                                <TableCell className="px-1 text-center">{s.pp}</TableCell>
                                                                <TableCell className="px-1 text-center">{s.pf}</TableCell>
                                                                <TableCell className="px-1 text-center">{s.pc}</TableCell>
                                                                <TableCell className="px-1 text-center font-bold">{s.pts}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </div>
                                    )) : <p className="text-muted-foreground text-center py-3">No hay grupos generados para esta categoría.</p>}
                                </TabsContent>
                                <TabsContent value="partidos">
                                    {catFixture.groups.some(g => g.matches.length > 0) ? catFixture.groups.map(group => group.matches.length > 0 && (
                                        <div key={`${group.id}-matches`} className="mb-6">
                                            <h4 className="text-lg font-semibold text-primary mb-2">Partidos {group.name}</h4>
                                            <ul className="space-y-2">
                                                {group.matches.sort((a,b) => (a.time || "99:99").localeCompare(b.time || "99:99") || (a.court || "Z99").toString().localeCompare((b.court || "Z99").toString()) ).map(match => (
                                                    <li key={match.id} className="p-3 border rounded-md bg-secondary/20 text-sm">
                                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                                            <div>
                                                                <span>{match.dupla1.nombre}</span> <span className="font-bold mx-1">vs</span> <span>{match.dupla2.nombre}</span>
                                                            </div>
                                                            <div className="text-xs text-muted-foreground mt-1 sm:mt-0 sm:ml-2">
                                                                ({match.court || 'Cancha TBD'}, {match.time || 'Hora TBD'})
                                                            </div>
                                                        </div>
                                                         <Button variant="outline" size="sm" className="mt-2 sm:mt-0 sm:ml-3 text-xs h-6 float-right" onClick={() => toast({title:"Próximamente", description:"Registrar resultado del partido."})}><Edit3 className="mr-1 h-3 w-3"/>Resultado</Button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )) : <p className="text-muted-foreground text-center py-3">No hay partidos generados para esta categoría.</p>}
                                </TabsContent>
                                <TabsContent value="playoffs">
                                    {catFixture.playoffMatches && catFixture.playoffMatches.length > 0 ? (
                                        <div className="mb-6">
                                            <h4 className="text-lg font-semibold text-primary mb-2">Fase de Playoffs</h4>
                                            <ul className="space-y-2">
                                                {catFixture.playoffMatches.map(match => (
                                                    <li key={match.id} className="p-3 border rounded-md bg-secondary/20 text-sm">
                                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                                            <div>
                                                                <strong>{match.stage === 'semifinal' ? 'Semifinal' : match.stage === 'final' ? 'Final' : 'Tercer Puesto'}:</strong> {match.description}
                                                            </div>
                                                             <div className="text-xs text-muted-foreground mt-1 sm:mt-0 sm:ml-2">
                                                                ({match.court || 'Cancha TBD'}, {match.time || 'Hora TBD'})
                                                            </div>
                                                        </div>
                                                         <Button variant="outline" size="sm" className="mt-2 sm:mt-0 sm:ml-3 text-xs h-6 float-right" onClick={() => toast({title:"Próximamente", description:"Registrar resultado del partido."})}><Edit3 className="mr-1 h-3 w-3"/>Resultado</Button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ) : (
                                        <p className="text-muted-foreground text-center py-3">La fase de playoffs no aplica o no ha sido generada para esta categoría (requiere 2 grupos para la estructura actual).</p>
                                    )}
                                </TabsContent>
                            </Tabs>
                        </TabsContent>
                    ))}
                 </Tabs>
            </CardContent>
        </Card>
      )}
      
      <div className="flex flex-col sm:flex-row gap-4 mt-10 w-full max-w-4xl justify-center">
        <Link href="/random-tournament" passHref>
          <Button variant="outline" size="lg" className="text-base w-full sm:w-auto">Crear Nuevo Torneo Random</Button>
        </Link>
        <Link href="/" passHref>
          <Button variant="default" size="lg" className="text-base w-full sm:w-auto"><Home className="mr-2 h-5 w-5" />Volver al Inicio</Button>
        </Link>
      </div>
    </div>
  );
}
    

