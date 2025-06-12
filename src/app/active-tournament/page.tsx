
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Activity, Users, Swords, UserX, Info, Calendar as CalendarIconLucide, Clock, MapPinIcon, Home, ListChecks, Settings, ShieldQuestion, Trophy as TrophyIcon, Edit3, Trash2, Power, Save } from 'lucide-react';
import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { PlayerFormValues, CategoryFormValues } from '../random-tournament/page';
import { format, addMinutes } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useForm, type UseFormReturn, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";


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
  isAmPmModeActive?: boolean; 
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
  rawMatches?: Match[]; 
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

interface OccupiedSlotInfo {
  matchId: string;
  categoryId: string;
  duplaIds: string[]; 
}

const resultFormSchema = z.object({
  score1: z.string().min(1, "Puntaje requerido").regex(/^\d+$/, "Debe ser un número"),
  score2: z.string().min(1, "Puntaje requerido").regex(/^\d+$/, "Debe ser un número"),
}).refine(data => parseInt(data.score1, 10) !== parseInt(data.score2, 10), {
  message: "Los puntajes no pueden ser iguales",
  path: ["score1"], 
});

type ResultFormValues = z.infer<typeof resultFormSchema>;


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

interface ResultDialogProps {
  isOpen: boolean;
  onClose: () => void;
  match: (Match | PlayoffMatch | null) & { categoryId?: string; groupOriginId?: string }; 
  onSubmit: (data: ResultFormValues) => void;
  form: UseFormReturn<ResultFormValues>;
}

function ResultDialog({ isOpen, onClose, match, onSubmit, form }: ResultDialogProps) {
  useEffect(() => {
    if (isOpen && match) {
      if (match.score1 !== undefined && match.score2 !== undefined) {
        form.reset({
          score1: match.score1.toString(),
          score2: match.score2.toString(),
        });
      } else {
        form.reset({ score1: "", score2: "" });
      }
    } else if (!isOpen) {
        form.reset({ score1: "", score2: "" }); 
    }
  }, [isOpen, match, form]);

  if (!isOpen) {
    return null;
  }
  
  if (!match || !match.dupla1 || !match.dupla2 ) {
     return (
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
            <DialogDescription>Datos del partido no disponibles o incompletos para mostrar el diálogo de resultado.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={onClose} variant="outline">Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const { dupla1, dupla2 } = match;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[425px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Registrar Resultado: {dupla1.nombre} vs {dupla2.nombre}</DialogTitle>
              <DialogDescription>
                Ingresa los games ganados por cada dupla. El resultado no puede ser empate.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="score1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="score1">{dupla1.nombre}</FormLabel>
                    <FormControl>
                      <Input id="score1" type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="score2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="score2">{dupla2.nombre}</FormLabel>
                    <FormControl>
                      <Input id="score2" type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit"><Save className="mr-2 h-4 w-4" />Guardar Resultado</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


export default function ActiveTournamentPage() {
  const [torneo, setTorneo] = useState<TorneoActivoData | null>(null);
  const [fixture, setFixture] = useState<FixtureData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [numCourts, setNumCourts] = useState<number | undefined>(2);
  const [matchDuration, setMatchDuration] = useState<number | undefined>(60);
  const [isAmPmModeActive, setIsAmPmModeActive] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();
  
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [currentEditingMatch, setCurrentEditingMatch] = useState<(Match | PlayoffMatch | null) & { categoryId?: string; groupOriginId?: string }>(null);

  const resultForm = useForm<ResultFormValues>({
    resolver: zodResolver(resultFormSchema),
    defaultValues: {
      score1: "",
      score2: "",
    },
  });


  const loadTournamentData = useCallback(() => {
    setIsLoading(true);
    try {
      const storedTorneo = sessionStorage.getItem('torneoActivo');
      if (storedTorneo) {
        const parsedTorneo = JSON.parse(storedTorneo) as TorneoActivoData; 
        
        if (parsedTorneo && parsedTorneo.tournamentName && parsedTorneo.categoriesWithDuplas) {
          const transformedCategories = parsedTorneo.categoriesWithDuplas.map((cat: any) => {
            const duplasTransformadas = (cat.duplas || []).map((duplaItem: unknown) => {
              if (
                !Array.isArray(duplaItem) ||
                duplaItem.length !== 2 ||
                !duplaItem[0] || 
                !duplaItem[1] ||
                typeof duplaItem[0] !== 'object' || 
                typeof duplaItem[1] !== 'object'
              ) {
                console.warn('Skipping malformed duplaItem (not an array, not length 2, or missing player objects):', duplaItem);
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
          setIsAmPmModeActive(parsedTorneo.isAmPmModeActive || false);

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

  const handleTournamentSettingChange = (type: 'courts' | 'duration' | 'amPmMode', value: string | boolean) => {
    if (!torneo) return;
    
    let updatedTorneoData = { ...torneo };
    let settingChanged = false;

    if (type === 'courts' && typeof value === 'string') {
      const numericValue = parseInt(value, 10);
      if (numCourts !== numericValue) {
        setNumCourts(numericValue);
        updatedTorneoData.numCourts = numericValue;
        settingChanged = true;
      }
    } else if (type === 'duration' && typeof value === 'string') {
      const numericValue = parseInt(value, 10);
       if (matchDuration !== numericValue) {
        setMatchDuration(numericValue);
        updatedTorneoData.matchDuration = numericValue;
        settingChanged = true;
      }
    } else if (type === 'amPmMode' && typeof value === 'boolean') {
       if (isAmPmModeActive !== value) {
        setIsAmPmModeActive(value);
        updatedTorneoData.isAmPmModeActive = value;
        settingChanged = true;
      }
    }
    
    if (settingChanged) {
        setTorneo(updatedTorneoData);
        sessionStorage.setItem('torneoActivo', JSON.stringify(updatedTorneoData));
        const settingName = type === 'courts' ? 'el número de canchas' : type === 'duration' ? 'la duración de partidos' : 'el modo de programación AM/PM';
        toast({ title: "Ajuste Guardado", description: `Se actualizó ${settingName}.` });
        
        if (fixture) { 
            setFixture(null);
            sessionStorage.removeItem(`fixture_${torneo.tournamentName}`);
            toast({ title: "Fixture Invalidado", description: "Los ajustes del torneo cambiaron. Debes generar los partidos nuevamente.", variant: "default"});
        }
    }
  };

  const generateFixture = () => {
    if (!torneo || !torneo.categoriesWithDuplas || !numCourts || !matchDuration) {
      toast({ title: "Error", description: "Faltan datos del torneo, canchas o duración de partidos para generar el fixture.", variant: "destructive" });
      return;
    }

    const newFixture: FixtureData = {};
    const tournamentStartDate = torneo.date ? new Date(torneo.date) : new Date();
    const [hours, minutes] = torneo.time ? torneo.time.split(':').map(Number) : [9, 0];
    tournamentStartDate.setHours(hours, minutes, 0, 0);

    const occupiedSlots: Array<Array<OccupiedSlotInfo | null>> = []; 
    const lastPlayedTimeSlotByDupla: Map<string, number> = new Map(); 
    let currentOverallLatestTimeSlot = -1; 

    torneo.categoriesWithDuplas.forEach((category, categoryIndex) => {
      if (!category || category.duplas.length < 2) { 
        newFixture[category.id] = {
          categoryId: category.id,
          categoryName: category ? `${category.type} - ${category.level}` : "Categoría Desconocida",
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
            matches: [],
         });
      } else {
        let duplasToAssign = numCategoryDuplas;
        const idealGroupSize = Math.min(5, Math.max(3, Math.ceil(numCategoryDuplas / Math.ceil(numCategoryDuplas/5))));
        
        while(duplasToAssign > 0) {
            let currentGroupSize = Math.min(duplasToAssign, idealGroupSize);
            if (duplasToAssign - currentGroupSize > 0 && duplasToAssign - currentGroupSize < 3) {
                 if (groups.length > 0 && duplasToAssign < idealGroupSize && duplasToAssign < 3 && groups[groups.length-1].duplas.length + duplasToAssign <=5 ) { 
                     groups[groups.length-1].duplas.push(...categoryDuplas.splice(0, duplasToAssign));
                     groups[groups.length-1].standings.push(...categoryDuplas.map(d => ({ duplaId: d.id, duplaName: d.nombre, pj: 0, pg: 0, pp: 0, pf: 0, pc: 0, pts: 0 })));
                     duplasToAssign = 0;
                 } else { 
                    currentGroupSize = Math.max(3, Math.min(duplasToAssign, currentGroupSize)); 
                    const groupDuplas = categoryDuplas.splice(0, currentGroupSize);
                    groups.push({ id: `${category.id}-G${groupLetter}`, name: `Grupo ${groupLetter}`, duplas: groupDuplas, standings: groupDuplas.map(d => ({ duplaId: d.id, duplaName: d.nombre, pj: 0, pg: 0, pp: 0, pf: 0, pc: 0, pts: 0 })), matches: [] });
                    duplasToAssign -= groupDuplas.length;
                 }
            } else {
                 const groupDuplas = categoryDuplas.splice(0, currentGroupSize);
                 groups.push({ id: `${category.id}-G${groupLetter}`, name: `Grupo ${groupLetter}`, duplas: groupDuplas, standings: groupDuplas.map(d => ({ duplaId: d.id, duplaName: d.nombre, pj: 0, pg: 0, pp: 0, pf: 0, pc: 0, pts: 0 })), matches: [] });
                 duplasToAssign -= groupDuplas.length;
            }
            groupLetter = String.fromCharCode(groupLetter.charCodeAt(0) + 1);
            if (categoryDuplas.length === 0) duplasToAssign = 0; 
        }
      }
      
      groups.forEach(group => {
        group.rawMatches = []; 
        let matchCounterInGroup = 0;
        for (let i = 0; i < group.duplas.length; i++) {
          for (let j = i + 1; j < group.duplas.length; j++) {
            const matchId = `${group.id}-M${matchCounterInGroup + 1}`;
            group.rawMatches.push({ 
              id: matchId, 
              dupla1: group.duplas[i], 
              dupla2: group.duplas[j], 
              status: 'pending', 
              groupOriginId: group.id 
            });
            matchCounterInGroup++;
          }
        }
      });
      
      let categorySpecificStartTimeSlot = 0;
      if (torneo.isAmPmModeActive && categoryIndex > 0 && currentOverallLatestTimeSlot > -1) {
          categorySpecificStartTimeSlot = currentOverallLatestTimeSlot + 1;
      }

      if (groups.length > 0 && numCourts > 0 && groups.length === numCourts) {
          toast({ title: "Modo Cancha Dedicada", description: `Categoría ${category.type} - ${category.level} usando cancha dedicada por grupo.`});
          groups.forEach((group, groupIndex) => {
              const dedicatedCourtIdx = groupIndex;
              let currentGroupTimeSlot = categorySpecificStartTimeSlot;

              (group.rawMatches || []).forEach(matchToSchedule => {
                  let scheduled = false;
                  let attempts = 0;
                  const MAX_ATTEMPTS_DEDICATED = 800; 

                  while(!scheduled && attempts < MAX_ATTEMPTS_DEDICATED) {
                      if (!occupiedSlots[currentGroupTimeSlot]) {
                          occupiedSlots[currentGroupTimeSlot] = Array(numCourts).fill(null);
                      }
                      if (occupiedSlots[currentGroupTimeSlot][dedicatedCourtIdx]) {
                          currentGroupTimeSlot++;
                          attempts++;
                          continue;
                      }

                      let duplasBusyElsewhere = false;
                      for (let cScan = 0; cScan < numCourts; cScan++) {
                          if (cScan === dedicatedCourtIdx) continue;
                          const slotInfo = occupiedSlots[currentGroupTimeSlot]?.[cScan];
                          if (slotInfo && (slotInfo.duplaIds.includes(matchToSchedule.dupla1.id) || slotInfo.duplaIds.includes(matchToSchedule.dupla2.id))) {
                              duplasBusyElsewhere = true;
                              break;
                          }
                      }
                      if (duplasBusyElsewhere) {
                          currentGroupTimeSlot++;
                          attempts++;
                          continue;
                      }
                      
                      const d1LastPlay = lastPlayedTimeSlotByDupla.get(matchToSchedule.dupla1.id);
                      const d2LastPlay = lastPlayedTimeSlotByDupla.get(matchToSchedule.dupla2.id);
                      const d1NeedsRestStrict = (d1LastPlay !== undefined && currentGroupTimeSlot <= d1LastPlay + 1);
                      const d2NeedsRestStrict = (d2LastPlay !== undefined && currentGroupTimeSlot <= d2LastPlay + 1);
                      
                      let canOverrideRest = attempts > MAX_ATTEMPTS_DEDICATED * 0.95;


                      if ((d1NeedsRestStrict || d2NeedsRestStrict) && !canOverrideRest) {
                          currentGroupTimeSlot++;
                          attempts++;
                          continue;
                      }

                      occupiedSlots[currentGroupTimeSlot][dedicatedCourtIdx] = {
                          matchId: matchToSchedule.id,
                          categoryId: category.id,
                          duplaIds: [matchToSchedule.dupla1.id, matchToSchedule.dupla2.id]
                      };
                      const scheduledMatchData = {
                          ...matchToSchedule,
                          court: `Cancha ${dedicatedCourtIdx + 1}`,
                          time: format(addMinutes(tournamentStartDate, currentGroupTimeSlot * matchDuration), "HH:mm"),
                      };
                      group.matches.push(scheduledMatchData);
                      lastPlayedTimeSlotByDupla.set(matchToSchedule.dupla1.id, currentGroupTimeSlot);
                      lastPlayedTimeSlotByDupla.set(matchToSchedule.dupla2.id, currentGroupTimeSlot);
                      currentOverallLatestTimeSlot = Math.max(currentOverallLatestTimeSlot, currentGroupTimeSlot);
                      
                      scheduled = true;
                      // No incrementar currentGroupTimeSlot aquí para el siguiente partido del MISMO grupo,
                      // se incrementará al inicio del siguiente while loop si es necesario.
                      // Pero sí se debe avanzar el slot para el *próximo partido de este grupo*.
                  }
                  if (!scheduled) {
                      console.warn(`DEDICATED MODE: Could not schedule match ${matchToSchedule.id} for group ${group.name}. Added as TBD.`);
                       group.matches.push({
                          ...matchToSchedule,
                          court: `Cancha ${dedicatedCourtIdx + 1} (Err.)`,
                          time: "TBD (Err.)"
                      });
                  }
                  currentGroupTimeSlot++; // Avanza para el siguiente partido de ESTE grupo en ESTA cancha dedicada.
              });
          });
      } else { 
          let unscheduledMatchesCurrentCategory: Match[] = [];
          groups.forEach(group => {
              if (group.rawMatches) {
                unscheduledMatchesCurrentCategory.push(...group.rawMatches);
              }
          });
          
          unscheduledMatchesCurrentCategory.sort((a, b) => {
            const aRound = parseInt(a.id.substring(a.id.lastIndexOf('-M') + 2));
            const bRound = parseInt(b.id.substring(b.id.lastIndexOf('-M') + 2));
            if (aRound !== bRound) {
              return aRound - bRound;
            }
            return (a.groupOriginId || "").localeCompare(b.groupOriginId || "");
          });
          
          let categoryTimeSlotCursor = categorySpecificStartTimeSlot;
          const MAX_ITERATIONS_PER_CATEGORY = unscheduledMatchesCurrentCategory.length * numCourts * 20; 
          let iterations = 0;

          while (unscheduledMatchesCurrentCategory.length > 0 && iterations < MAX_ITERATIONS_PER_CATEGORY) {
            let matchesScheduledInThisTimeSlotLoop = 0;
            for (let courtIdx = 0; courtIdx < numCourts; courtIdx++) {
              if (!occupiedSlots[categoryTimeSlotCursor]) {
                occupiedSlots[categoryTimeSlotCursor] = Array(numCourts).fill(null);
              }
              if (occupiedSlots[categoryTimeSlotCursor][courtIdx]) {
                continue; 
              }

              let bestMatchToScheduleIdx = -1;
              for (let k = 0; k < unscheduledMatchesCurrentCategory.length; k++) {
                const candidateMatch = unscheduledMatchesCurrentCategory[k];
                const d1 = candidateMatch.dupla1;
                const d2 = candidateMatch.dupla2;

                let duplasBusyThisSlotGlobally = false;
                if (occupiedSlots[categoryTimeSlotCursor]) {
                  for (let cScan = 0; cScan < numCourts; cScan++) {
                    if (cScan === courtIdx) continue; 
                    const slotInfo = occupiedSlots[categoryTimeSlotCursor][cScan];
                    if (slotInfo && (slotInfo.duplaIds.includes(d1.id) || slotInfo.duplaIds.includes(d2.id))) {
                      duplasBusyThisSlotGlobally = true;
                      break;
                    }
                  }
                }
                if (duplasBusyThisSlotGlobally) continue;

                const d1LastPlay = lastPlayedTimeSlotByDupla.get(d1.id);
                const d2LastPlay = lastPlayedTimeSlotByDupla.get(d2.id);
                
                const d1NeedsRestStrict = (d1LastPlay !== undefined && categoryTimeSlotCursor <= d1LastPlay + 1);
                const d2NeedsRestStrict = (d2LastPlay !== undefined && categoryTimeSlotCursor <= d2LastPlay + 1);
                
                let canOverrideRest = iterations > MAX_ITERATIONS_PER_CATEGORY * 0.98;


                if ((d1NeedsRestStrict || d2NeedsRestStrict) && !canOverrideRest) {
                  continue; 
                }
                
                bestMatchToScheduleIdx = k;
                break; 
              }

              if (bestMatchToScheduleIdx !== -1) {
                const matchToSchedule = unscheduledMatchesCurrentCategory.splice(bestMatchToScheduleIdx, 1)[0];
                
                occupiedSlots[categoryTimeSlotCursor][courtIdx] = { 
                  matchId: matchToSchedule.id, 
                  categoryId: category.id, 
                  duplaIds: [matchToSchedule.dupla1.id, matchToSchedule.dupla2.id]
                };
                
                const scheduledMatchData = {
                    ...matchToSchedule,
                    court: `Cancha ${courtIdx + 1}`,
                    time: format(addMinutes(tournamentStartDate, categoryTimeSlotCursor * matchDuration), "HH:mm"),
                };
                
                const targetGroup = groups.find(g => g.id === scheduledMatchData.groupOriginId);
                if (targetGroup) {
                    targetGroup.matches.push(scheduledMatchData);
                }
                
                lastPlayedTimeSlotByDupla.set(matchToSchedule.dupla1.id, categoryTimeSlotCursor);
                lastPlayedTimeSlotByDupla.set(matchToSchedule.dupla2.id, categoryTimeSlotCursor);
                currentOverallLatestTimeSlot = Math.max(currentOverallLatestTimeSlot, categoryTimeSlotCursor);
                matchesScheduledInThisTimeSlotLoop++;
              }
            }
            if (matchesScheduledInThisTimeSlotLoop === 0 && unscheduledMatchesCurrentCategory.length > 0) {
            }
            categoryTimeSlotCursor++; 
            iterations++;
          }
          if(iterations >= MAX_ITERATIONS_PER_CATEGORY && unscheduledMatchesCurrentCategory.length > 0){
              console.error(`MAX_ITERATIONS_PER_CATEGORY reached for category ${category.id}. ${unscheduledMatchesCurrentCategory.length} matches remain unscheduled.`);
              toast({title: "Error de Programación", description: `No se pudieron programar todos los partidos de grupo para ${category.type} - ${category.level}. Revisa la configuración o el número de duplas.`, variant:"destructive"})
               unscheduledMatchesCurrentCategory.forEach(unscheduledMatch => {
                    const targetGroup = groups.find(g => g.id === unscheduledMatch.groupOriginId);
                    if (targetGroup) {
                        targetGroup.matches.push({
                            ...unscheduledMatch,
                            court: "TBD (Err.)",
                            time: "TBD (Err.)"
                        });
                    }
               });
          }
      } 


      let playoffMatchesForCategory: PlayoffMatch[] | undefined = undefined;
      if (groups.length === 2 && groups[0].duplas.length >= 2 && groups[1].duplas.length >=2 ) { 
        const placeholderDuplaW_G1 = {id: 'placeholder-G1W', nombre: 'Ganador Grupo A', jugadores:[] as any};
        const placeholderDuplaRU_G1 = {id: 'placeholder-G1RU', nombre: 'Segundo Grupo A', jugadores:[] as any};
        const placeholderDuplaW_G2 = {id: 'placeholder-G2W', nombre: 'Ganador Grupo B', jugadores:[] as any};
        const placeholderDuplaRU_G2 = {id: 'placeholder-G2RU', nombre: 'Segundo Grupo B', jugadores:[] as any};
        const placeholderDuplaW_SF1 = {id: 'placeholder-SF1W', nombre: 'Ganador SF1', jugadores:[] as any};
        const placeholderDuplaL_SF1 = {id: 'placeholder-SF1L', nombre: 'Perdedor SF1', jugadores:[] as any};
        const placeholderDuplaW_SF2 = {id: 'placeholder-SF2W', nombre: 'Ganador SF2', jugadores:[] as any};
        const placeholderDuplaL_SF2 = {id: 'placeholder-SF2L', nombre: 'Perdedor SF2', jugadores:[] as any};

        const semiFinalMatches: PlayoffMatch[] = [
          { id: `${category.id}-SF1`, dupla1: placeholderDuplaW_G1, dupla2: placeholderDuplaRU_G2, status: 'pending', stage: 'semifinal', description: 'Ganador Grupo A vs Segundo Grupo B' },
          { id: `${category.id}-SF2`, dupla1: placeholderDuplaW_G2, dupla2: placeholderDuplaRU_G1, status: 'pending', stage: 'semifinal', description: 'Ganador Grupo B vs Segundo Grupo A' },
        ];
        const finalMatch: PlayoffMatch = { id: `${category.id}-F`, dupla1: placeholderDuplaW_SF1, dupla2: placeholderDuplaW_SF2, status: 'pending', stage: 'final', description: 'Final' };
        const thirdPlaceMatch: PlayoffMatch = { id: `${category.id}-TP`, dupla1: placeholderDuplaL_SF1, dupla2: placeholderDuplaL_SF2, status: 'pending', stage: 'tercer_puesto', description: 'Tercer Puesto'};
        
        const allPlayoffMatchesRaw = [...semiFinalMatches, finalMatch, thirdPlaceMatch];
        playoffMatchesForCategory = [];
        
        let playoffStartTimeSlot = currentOverallLatestTimeSlot > -1 ? currentOverallLatestTimeSlot + 1 : 0;
         if (torneo.isAmPmModeActive && categoryIndex > 0 && currentOverallLatestTimeSlot > -1) { 
            playoffStartTimeSlot = currentOverallLatestTimeSlot + 1;
        }
        if (categorySpecificStartTimeSlot > playoffStartTimeSlot && groups.length > 0) { 
            playoffStartTimeSlot = Math.max(playoffStartTimeSlot, categoryTimeSlotCursor); 
        }


        allPlayoffMatchesRaw.forEach(playoffMatch => {
            let scheduled = false;
            let attempts = 0;
            let timeSlotToTryForThisMatch = playoffStartTimeSlot; 

            while(!scheduled && attempts < 1000) {
                if (!occupiedSlots[timeSlotToTryForThisMatch]) {
                    occupiedSlots[timeSlotToTryForThisMatch] = Array(numCourts).fill(null);
                }
                
                let duplasConceptuallyBusy = false; 
                if (occupiedSlots[timeSlotToTryForThisMatch]) {
                    for(let courtScanIdx = 0; courtScanIdx < numCourts; courtScanIdx++){
                        const slotContent = occupiedSlots[timeSlotToTryForThisMatch][courtScanIdx];
                        if (slotContent && (slotContent.duplaIds.includes(playoffMatch.dupla1.id) || slotContent.duplaIds.includes(playoffMatch.dupla2.id))) {
                        }
                    }
                }
                
                for (let courtIdx = 0; courtIdx < numCourts; courtIdx++) {
                    if (!occupiedSlots[timeSlotToTryForThisMatch] || !occupiedSlots[timeSlotToTryForThisMatch][courtIdx]) {
                        occupiedSlots[timeSlotToTryForThisMatch][courtIdx] = { 
                            matchId: playoffMatch.id, 
                            categoryId: category.id, 
                            duplaIds: [playoffMatch.dupla1.id, playoffMatch.dupla2.id] 
                        };
                        playoffMatch.court = `Cancha ${courtIdx + 1}`;
                        playoffMatch.time = format(addMinutes(tournamentStartDate, timeSlotToTryForThisMatch * matchDuration), "HH:mm");
                        
                        playoffMatchesForCategory!.push(playoffMatch); 

                        currentOverallLatestTimeSlot = Math.max(currentOverallLatestTimeSlot, timeSlotToTryForThisMatch);
                        scheduled = true;
                        playoffStartTimeSlot = timeSlotToTryForThisMatch + 1; 
                        break;
                    }
                }
                if (!scheduled) timeSlotToTryForThisMatch++;
                attempts++;
            }
            if (!scheduled) { 
                console.warn(`Could not schedule playoff match ${playoffMatch.id}. Using fallback.`);
                let fallbackSlot = Math.max(currentOverallLatestTimeSlot + 1, playoffStartTimeSlot);
                let fallbackScheduled = false;
                let fbAttempts = 0;
                while(!fallbackScheduled && fbAttempts < 500) {
                    if (!occupiedSlots[fallbackSlot]) occupiedSlots[fallbackSlot] = Array(numCourts).fill(null);
                    let courtFound = false;
                    for (let courtIdx = 0; courtIdx < numCourts; courtIdx++) {
                        if(!occupiedSlots[fallbackSlot] || !occupiedSlots[fallbackSlot][courtIdx]) { 
                            occupiedSlots[fallbackSlot][courtIdx] = { matchId: playoffMatch.id, categoryId: category.id, duplaIds: [playoffMatch.dupla1.id, playoffMatch.dupla2.id]};
                            playoffMatch.court = `Cancha ${courtIdx + 1} (FB)`;
                            playoffMatch.time = format(addMinutes(tournamentStartDate, fallbackSlot * matchDuration), "HH:mm");
                            playoffMatchesForCategory!.push(playoffMatch);
                            currentOverallLatestTimeSlot = Math.max(currentOverallLatestTimeSlot, fallbackSlot);
                            courtFound = true;
                            fallbackScheduled = true;
                            playoffStartTimeSlot = fallbackSlot + 1;
                            break;
                        }
                    }
                    if(courtFound) break;
                    fallbackSlot++;
                    fbAttempts++;
                     if(fbAttempts > 490) { 
                        console.error(`CRITICAL: Fallback failed for playoff match ${playoffMatch.id}`);
                        playoffMatchesForCategory!.push({...playoffMatch, court: "TBD (Error)", time: "TBD (Error)" });
                        break;
                    }
                }
            }
        });
      }


      groups.forEach(group => {
        const uniqueMatchesInGroup: Match[] = [];
        const seenMatchIdsInGroup = new Set<string>();
        
        group.matches.sort((a,b) => (a.time || "99:99").localeCompare(b.time || "99:99") || (a.court || "Z99").toString().localeCompare((b.court || "Z99").toString()) );

        for (const m of group.matches) {
          if (m && m.id && !seenMatchIdsInGroup.has(m.id)) {
            uniqueMatchesInGroup.push(m);
            seenMatchIdsInGroup.add(m.id);
          } else if (m && m.id && seenMatchIdsInGroup.has(m.id)) {
            console.warn(`Duplicate match ID found and removed during fixture generation: ${m.id} in group ${group.id}`);
          } else if (!m || !m.id) {
            console.warn(`Match object or match.id is undefined in group ${group.id}, removing.`);
          }
        }
        group.matches = uniqueMatchesInGroup;
        delete group.rawMatches; 
      });

      newFixture[category.id] = {
        categoryId: category.id,
        categoryName: `${category.type} - ${category.level}`,
        groups,
        playoffMatches: playoffMatchesForCategory
      };
    }); 

    setFixture(newFixture);
    if (torneo) {
      sessionStorage.setItem(`fixture_${torneo.tournamentName}`, JSON.stringify(newFixture));
    }
    toast({ title: "Fixture Generado", description: "Se ha creado la planilla de grupos y partidos." });
  };

  const handleDeleteTournamentConfirm = () => {
    if (torneo) {
      sessionStorage.removeItem(`fixture_${torneo.tournamentName}`);
      sessionStorage.removeItem('torneoActivo');
      setFixture(null); 
      setTorneo(null);   
      toast({ title: "Torneo Borrado", description: "El torneo activo ha sido eliminado." });
    }
    setIsDeleteDialogOpen(false);
  };
  
  const handleSaveResult = (data: ResultFormValues) => {
    if (!currentEditingMatch || !fixture || !torneo) return;

    const score1 = parseInt(data.score1, 10);
    const score2 = parseInt(data.score2, 10);

    const newFixture = JSON.parse(JSON.stringify(fixture)) as FixtureData; 
    let matchFound = false;

    const categoryFixture = newFixture[currentEditingMatch.categoryId!];
    if (!categoryFixture) return;

    if (currentEditingMatch.groupOriginId) {
        const group = categoryFixture.groups.find(g => g.id === currentEditingMatch.groupOriginId);
        if (group) {
            const matchIndex = group.matches.findIndex(m => m.id === currentEditingMatch.id);
            if (matchIndex !== -1) {
                const matchToUpdate = group.matches[matchIndex];
                
                const oldScore1 = matchToUpdate.score1;
                const oldScore2 = matchToUpdate.score2;
                const wasPending = matchToUpdate.status === 'pending';

                matchToUpdate.score1 = score1;
                matchToUpdate.score2 = score2;
                matchToUpdate.status = 'completed';
                matchToUpdate.winnerId = score1 > score2 ? matchToUpdate.dupla1.id : matchToUpdate.dupla2.id;
                matchFound = true;

                const standing1 = group.standings.find(s => s.duplaId === matchToUpdate.dupla1.id);
                const standing2 = group.standings.find(s => s.duplaId === matchToUpdate.dupla2.id);

                if (standing1 && standing2) {
                    if (!wasPending && oldScore1 !== undefined && oldScore2 !== undefined) {
                        standing1.pf -= oldScore1;
                        standing1.pc -= oldScore2;
                        standing2.pf -= oldScore2;
                        standing2.pc -= oldScore1;

                        if (oldScore1 > oldScore2) { 
                            standing1.pg -= 1;
                            standing1.pts -= 2;
                            standing2.pp -= 1;
                        } else if (oldScore2 > oldScore1) { 
                            standing2.pg -= 1;
                            standing2.pts -= 2;
                            standing1.pp -= 1;
                        }
                    } else if (wasPending) { 
                         standing1.pj += 1;
                         standing2.pj += 1;
                    }


                    standing1.pf += score1;
                    standing1.pc += score2;
                    standing2.pf += score2;
                    standing2.pc += score1;

                    if (score1 > score2) { 
                        standing1.pg += 1;
                        standing1.pts += 2;
                        standing2.pp += 1;
                    } else { 
                        standing2.pg += 1;
                        standing2.pts += 2;
                        standing1.pp += 1;
                    }
                }
            }
        }
    } 
    else if (categoryFixture.playoffMatches) {
        const matchIndex = categoryFixture.playoffMatches.findIndex(m => m.id === currentEditingMatch.id);
        if (matchIndex !== -1) {
            const matchToUpdate = categoryFixture.playoffMatches[matchIndex];
            matchToUpdate.score1 = score1;
            matchToUpdate.score2 = score2;
            matchToUpdate.status = 'completed';
            matchToUpdate.winnerId = score1 > score2 ? matchToUpdate.dupla1.id : matchToUpdate.dupla2.id;
            matchFound = true;
        }
    }


    if (matchFound) {
        setFixture(newFixture);
        sessionStorage.setItem(`fixture_${torneo.tournamentName}`, JSON.stringify(newFixture));
        toast({ title: "Resultado Guardado", description: `El resultado para ${currentEditingMatch.dupla1.nombre} vs ${currentEditingMatch.dupla2.nombre} ha sido actualizado.` });
    } else {
        toast({ title: "Error", description: "No se pudo encontrar el partido para actualizar.", variant: "destructive" });
    }

    setIsResultModalOpen(false);
    setCurrentEditingMatch(null);
    resultForm.reset();
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
          <div className="flex items-center space-x-2 col-span-1 sm:col-span-2 pt-2">
            <Switch
              id="am-pm-mode"
              checked={isAmPmModeActive}
              onCheckedChange={(checked) => handleTournamentSettingChange('amPmMode', checked)}
              disabled={!!fixture}
            />
            <Label htmlFor="am-pm-mode" className="flex items-center">
              <Power className="mr-2 h-4 w-4 text-muted-foreground" />
              Programación por Bloques (AM/PM)
            </Label>
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
                                                {group.matches.map(match => (
                                                    <li key={match.id} className="p-3 border rounded-md bg-secondary/20 text-sm">
                                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                                            <div>
                                                                <span>{match.dupla1.nombre}</span> <span className="font-bold mx-1">vs</span> <span>{match.dupla2.nombre}</span>
                                                            </div>
                                                            <div className="text-xs text-muted-foreground mt-1 sm:mt-0 sm:ml-2">
                                                                ({match.court || 'Cancha TBD'}, {match.time || 'Hora TBD'})
                                                                {match.status === 'completed' && ` - ${match.score1} : ${match.score2}`}
                                                            </div>
                                                        </div>
                                                         <Button variant="outline" size="sm" className="mt-2 sm:mt-0 sm:ml-3 text-xs h-6 float-right" 
                                                            onClick={() => {
                                                                setCurrentEditingMatch({ ...match, categoryId: catFixture.categoryId, groupOriginId: match.groupOriginId || group.id });
                                                                setIsResultModalOpen(true);
                                                            }}
                                                          >
                                                            <Edit3 className="mr-1 h-3 w-3"/>{match.status === 'completed' ? 'Editar' : 'Resultado'}
                                                          </Button>
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
                                                {catFixture.playoffMatches.sort((a,b) => {
                                                    const stageOrder = (stage: PlayoffMatch['stage']) => {
                                                        if (stage === 'final') return 0;
                                                        if (stage === 'tercer_puesto') return 1;
                                                        if (stage === 'semifinal') return 2;
                                                        return 3;
                                                    };
                                                    if (stageOrder(a.stage) !== stageOrder(b.stage)) {
                                                        return stageOrder(a.stage) - stageOrder(b.stage);
                                                    }
                                                    return (a.time || "99:99").localeCompare(b.time || "99:99") || (a.court || "Z99").toString().localeCompare((b.court || "Z99").toString());
                                                }).map(match => (
                                                    <li key={match.id} className="p-3 border rounded-md bg-secondary/20 text-sm">
                                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                                            <div>
                                                                <strong>{match.stage === 'semifinal' ? 'Semifinal' : match.stage === 'final' ? 'Final' : 'Tercer Puesto'}:</strong> {match.description}
                                                                <br/>
                                                                <span>{match.dupla1.nombre}</span> <span className="font-bold mx-1">vs</span> <span>{match.dupla2.nombre}</span>
                                                            </div>
                                                             <div className="text-xs text-muted-foreground mt-1 sm:mt-0 sm:ml-2">
                                                                ({match.court || 'Cancha TBD'}, {match.time || 'Hora TBD'})
                                                                {match.status === 'completed' && ` - ${match.score1} : ${match.score2}`}
                                                            </div>
                                                        </div>
                                                         <Button variant="outline" size="sm" className="mt-2 sm:mt-0 sm:ml-3 text-xs h-6 float-right" 
                                                            onClick={() => {
                                                                setCurrentEditingMatch({ ...match, categoryId: catFixture.categoryId });
                                                                setIsResultModalOpen(true);
                                                            }}
                                                          >
                                                            <Edit3 className="mr-1 h-3 w-3"/>{match.status === 'completed' ? 'Editar' : 'Resultado'}
                                                          </Button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ) : (
                                        <p className="text-muted-foreground text-center py-3">La fase de playoffs no aplica o no ha sido generada para esta categoría (requiere 2 grupos con al menos 2 duplas c/u para la estructura actual).</p>
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

      <ResultDialog
        isOpen={isResultModalOpen}
        onClose={() => {
          setIsResultModalOpen(false);
          setCurrentEditingMatch(null);
          resultForm.reset(); 
        }}
        match={currentEditingMatch}
        onSubmit={handleSaveResult}
        form={resultForm}
      />
    </div>
  );
}
    

      



