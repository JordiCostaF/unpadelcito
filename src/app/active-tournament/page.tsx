
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Activity, Users, Swords, UserX, Info, Calendar as CalendarIconLucide, Clock, MapPinIcon, Home, ListChecks, Settings, ShieldQuestion, Trophy as TrophyIcon, Edit3, Trash2, Power, Save, PlayCircle, Edit, ChevronLeft, ChevronRight, AlertTriangle, Share2, Play, Pause, RotateCcw, ArrowUp, ArrowDown, PlusCircle } from "lucide-react";
import React, { useEffect, useState, useCallback, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { PlayerFormValues as PlayerFormValuesFromRandom, CategoryFormValues as CategoryFormValuesFromRandom } from "../random-tournament/page";
import { format, parse, addMinutes, setHours, setMinutes, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import html2canvas from "html2canvas";
import { ShareableFixture } from "@/components/ShareableFixture";


// Renaming imported types to avoid conflicts if this page also defines its own PlayerFormValues
export type PlayerFormValues = PlayerFormValuesFromRandom;
export type CategoryFormValues = CategoryFormValuesFromRandom;


export interface Dupla {
  id: string;
  jugadores: [PlayerFormValues, PlayerFormValues]; 
  nombre: string; 
}

export interface CategoriaConDuplas extends CategoryFormValues {
  duplas: Dupla[];
  jugadoresSobrantes: PlayerFormValues[];
  numTotalJugadores: number;
}

export interface TorneoActivoData {
  tournamentName: string;
  date: string; 
  time: string;
  place: string;
  categoriesWithDuplas: CategoriaConDuplas[];
  numCourts?: number;
  matchDuration?: number;
  playThirdPlace?: boolean;
}

export interface Standing {
  duplaId: string;
  duplaName: string;
  pj: number; 
  pg: number; 
  pp: number; 
  pf: number; 
  pc: number; 
  pts: number; 
}

export interface Match {
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

export interface Group {
  id: string;
  name: string; 
  duplas: Dupla[];
  standings: Standing[];
  matches: Match[];
  groupAssignedCourt?: string | number;
  groupStartTime?: string;
  groupMatchDuration?: number;
}

export interface PlayoffMatch extends Match {
  stage: 'semifinal' | 'final' | 'tercer_puesto';
  description: string; 
}

export interface CategoryFixture {
  categoryId: string;
  categoryName: string;
  groups: Group[];
  playoffMatches?: PlayoffMatch[];
}

export interface FixtureData {
  [categoryId: string]: CategoryFixture;
}

const resultFormSchema = z.object({
  score1: z.string().min(1, "Puntaje requerido").regex(/^\d+$/, "Debe ser un número"),
  score2: z.string().min(1, "Puntaje requerido").regex(/^\d+$/, "Debe ser un número"),
}).refine(data => parseInt(data.score1, 10) !== parseInt(data.score2, 10), {
  message: "Los puntajes no pueden ser iguales",
  path: ["score1"], 
});

type ResultFormValues = z.infer<typeof resultFormSchema>;

interface GroupScheduleState {
  [groupId: string]: {
    court: string;
    startTime: string;
    duration: string;
  };
}

interface GroupTimerState {
  isActive: boolean;
  timeRemaining: number; // in seconds
  initialDuration: number; // in seconds
}

interface ActiveTimerInfo {
  groupId: string;
  groupName: string;
  categoryId: string;
  categoryName: string;
  court: string | number;
  matches: Match[];
}

// Helper function to shuffle an array
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

function compareStandingsNumerically(sA: Standing, sB: Standing): number {
  // 1. Puntos (descendente)
  if (sA.pts !== sB.pts) return sB.pts - sA.pts;
  // 2. Partidos Ganados (descendente)
  if (sA.pg !== sB.pg) return sB.pg - sA.pg;
  // 3. Diferencia de Puntos (descendente)
  const diffA = sA.pf - sA.pc;
  const diffB = sB.pf - sB.pc;
  if (diffA !== diffB) return diffB - diffA;
  // 4. Puntos a Favor (descendente)
  if (sA.pf !== sB.pf) return sB.pf - sA.pf;
  // 5. Puntos en Contra (ascendente, menos es mejor)
  if (sA.pc !== sB.pc) return sA.pc - sB.pc;
  // Si todo es igual, se considera empate numérico
  return 0; 
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


function generateAndOrderGroupMatches(duplasInGroup: Dupla[], groupId: string): Match[] {
  // 1. Generar todos los posibles partidos (usando combinatoria)
  const allPossibleMatchTuples: [Dupla, Dupla][] = [];
  for (let i = 0; i < duplasInGroup.length; i++) {
    for (let j = i + 1; j < duplasInGroup.length; j++) {
      allPossibleMatchTuples.push([duplasInGroup[i], duplasInGroup[j]]);
    }
  }

  if (allPossibleMatchTuples.length === 0) {
    return [];
  }

  // 2. Organizar los partidos evitando repeticiones seguidas, como en el ejemplo de Python
  const scheduledOrderTuples: [Dupla, Dupla][] = [];
  let remainingMatchTuples = [...allPossibleMatchTuples];

  // Empezamos con el primer partido de la lista
  if (remainingMatchTuples.length > 0) {
    scheduledOrderTuples.push(remainingMatchTuples.shift()!);
  }

  while (remainingMatchTuples.length > 0) {
    const lastMatchTuple = scheduledOrderTuples[scheduledOrderTuples.length - 1];
    const [lastDupla1, lastDupla2] = lastMatchTuple;
    let foundNextMatch = false;

    // Buscar el siguiente partido donde ninguna dupla se repita
    let nextMatchIndex = -1;
    for (let i = 0; i < remainingMatchTuples.length; i++) {
      const currentCandidateTuple = remainingMatchTuples[i];
      const [candidateDupla1, candidateDupla2] = currentCandidateTuple;

      if (
        candidateDupla1.id !== lastDupla1.id &&
        candidateDupla1.id !== lastDupla2.id &&
        candidateDupla2.id !== lastDupla1.id &&
        candidateDupla2.id !== lastDupla2.id
      ) {
        // Se encontró un partido adecuado
        nextMatchIndex = i;
        break; // Salir del bucle for
      }
    }

    // Si el bucle for terminó y encontramos un partido
    if (nextMatchIndex !== -1) {
        scheduledOrderTuples.push(remainingMatchTuples.splice(nextMatchIndex, 1)[0]);
    } else if (remainingMatchTuples.length > 0) {
        // Si no se encontró un partido sin repetición, se agrega el primer partido que quede
        scheduledOrderTuples.push(remainingMatchTuples.shift()!);
    }
  }

  return scheduledOrderTuples.map((tuple, index) => ({
    id: `${groupId}-M${index + 1}`,
    dupla1: tuple[0],
    dupla2: tuple[1],
    status: 'pending',
    groupOriginId: groupId,
    court: undefined,
    time: undefined,
    score1: undefined,
    score2: undefined,
    winnerId: undefined,
    round: undefined,
  }));
}

const recalculateMatchTimesForGroup = (group: Group, tournamentDate: string, startTime: string, matchDuration: number): Group => {
  if (!group || !startTime || !matchDuration || !isValid(new Date(tournamentDate))) {
    return group;
  }
  
  const updatedGroup = JSON.parse(JSON.stringify(group));
  const assignedCourt = updatedGroup.groupAssignedCourt;

  const tournamentBaseDate = new Date(tournamentDate);
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  
  if (isNaN(startHours) || isNaN(startMinutes)) return group;

  let currentMatchDateTime = setMinutes(setHours(tournamentBaseDate, startHours), startMinutes);
  
  const lastPlayedByDuplaInGroup = new Map<string, Date>();

  for (let i = 0; i < updatedGroup.matches.length; i++) {
    const match = updatedGroup.matches[i];
    
    // Saltarse los partidos completados, su hora es fija.
    // Pero el siguiente partido debe considerar cuándo terminó éste.
    if (match.status === 'completed' && match.time) {
        const completedMatchTime = parse(match.time, "HH:mm", tournamentBaseDate);
        if (isValid(completedMatchTime)) {
            const completedMatchEndTime = addMinutes(completedMatchTime, matchDuration);
            // El siguiente partido no puede empezar antes de que este termine.
            if (completedMatchEndTime > currentMatchDateTime) {
                currentMatchDateTime = completedMatchEndTime;
            }
            // Actualizar la última vez que jugaron estas duplas para el cálculo del descanso
            lastPlayedByDuplaInGroup.set(match.dupla1.id, new Date(completedMatchTime.getTime()));
            lastPlayedByDuplaInGroup.set(match.dupla2.id, new Date(completedMatchTime.getTime()));
        }
        continue;
    }


    let duplasAreRested = false;
    let attemptTime = new Date(currentMatchDateTime.getTime()); 

    while(!duplasAreRested) {
        const d1LastPlayStartTime = lastPlayedByDuplaInGroup.get(match.dupla1.id);
        const d2LastPlayStartTime = lastPlayedByDuplaInGroup.get(match.dupla2.id);
        
        const d1CanPlay = !d1LastPlayStartTime || (attemptTime.getTime() >= addMinutes(d1LastPlayStartTime, matchDuration).getTime());
        const d2CanPlay = !d2LastPlayStartTime || (attemptTime.getTime() >= addMinutes(d2LastPlayStartTime, matchDuration).getTime());
        
        if (d1CanPlay && d2CanPlay) {
            duplasAreRested = true;
            currentMatchDateTime = new Date(attemptTime.getTime()); 
        } else {
            // Avanzar en bloques de la duración del partido si no están listos
            attemptTime = addMinutes(attemptTime, matchDuration); 
        }
    }
    
    match.time = format(currentMatchDateTime, "HH:mm");
    match.court = assignedCourt;

    lastPlayedByDuplaInGroup.set(match.dupla1.id, new Date(currentMatchDateTime.getTime()));
    lastPlayedByDuplaInGroup.set(match.dupla2.id, new Date(currentMatchDateTime.getTime()));
    
    currentMatchDateTime = addMinutes(currentMatchDateTime, matchDuration);
  }

  return updatedGroup;
};


// Custom hook to get the previous value of a state or prop
function usePrevious<T>(value: T) {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}


function ActiveTournamentPageComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tournamentNameToLoad = searchParams.get('tournamentName');

  const [torneo, setTorneo] = useState<TorneoActivoData | null>(null);
  const [listaTorneos, setListaTorneos] = useState<TorneoActivoData[]>([]);
  const [currentTournamentIndex, setCurrentTournamentIndex] = useState<number>(-1);

  const [fixture, setFixture] = useState<FixtureData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [numCourtsGlobal, setNumCourtsGlobal] = useState<number | undefined>(2);
  const [matchDurationGlobal, setMatchDurationGlobal] = useState<number | undefined>(60);
  const [playThirdPlace, setPlayThirdPlace] = useState<boolean>(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();
  
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [currentEditingMatch, setCurrentEditingMatch] = useState<(Match | PlayoffMatch | null) & { categoryId?: string; groupOriginId?: string }>(null);
  const [groupScheduleSettings, setGroupScheduleSettings] = useState<GroupScheduleState>({});
  
  // Timer related state
  const [groupTimers, setGroupTimers] = useState<Record<string, GroupTimerState>>({});
  const [activeTimers, setActiveTimers] = useState<ActiveTimerInfo[]>([]);
  const isAnyTimerActive = Object.values(groupTimers).some(t => t.isActive);
  const prevGroupTimers = usePrevious(groupTimers);
  const [toastWarnings, setToastWarnings] = useState<Map<string, React.ReactNode>>(new Map());
  const [timeAddedInfo, setTimeAddedInfo] = useState<{ groupName: string; minutes: number } | null>(null);


  const [isPlayoffSchedulerDialogOpen, setIsPlayoffSchedulerDialogOpen] = useState(false);
  const [categoryForPlayoffScheduling, setCategoryForPlayoffScheduling] = useState<CategoriaConDuplas | null>(null);
  const [playoffSchedulingSettings, setPlayoffSchedulingSettings] = useState<{
      breakDuration: string;
      defaultMatchDuration: string;
  }>({ breakDuration: "30", defaultMatchDuration: "60" });
  
  const shareableRef = useRef<HTMLDivElement>(null);
  const [categoryToShare, setCategoryToShare] = useState<CategoryFixture | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  // New state for the "Next Match" dialog
  const [isNextMatchDialogOpen, setIsNextMatchDialogOpen] = useState(false);
  const [nextMatchInfo, setNextMatchInfo] = useState<{ dupla1: Dupla; dupla2: Dupla; court: string | number; categoryName: string; } | null>(null);

  // --- TIMER LOGIC REFACTOR ---

  // 1. Effect for TICKING the timers down. This is stable and only depends on isAnyTimerActive.
  useEffect(() => {
    if (!isAnyTimerActive) {
      return; // No active timers, do nothing.
    }

    const interval = setInterval(() => {
        setGroupTimers(prevTimers => {
            const nextTimersState = { ...prevTimers };
            let hasChanged = false;

            for (const groupId in nextTimersState) {
                const timer = nextTimersState[groupId];
                if (timer.isActive && timer.timeRemaining > 0) {
                    nextTimersState[groupId] = {
                        ...timer,
                        timeRemaining: timer.timeRemaining - 1,
                    };
                    hasChanged = true;
                } else if (timer.isActive && timer.timeRemaining <= 0) {
                    nextTimersState[groupId] = {
                        ...timer,
                        timeRemaining: 0,
                        isActive: false,
                    };
                    hasChanged = true;
                }
            }
            return hasChanged ? nextTimersState : prevTimers;
        });
    }, 1000);

    return () => clearInterval(interval);
  }, [isAnyTimerActive]);

  // 2. Effect for NOTIFYING based on timer changes. This runs when timers state changes.
  useEffect(() => {
    if (!prevGroupTimers || !groupTimers) return;

    for (const groupId in groupTimers) {
      const currentTimer = groupTimers[groupId];
      const prevTimer = prevGroupTimers[groupId];

      if (!currentTimer || !prevTimer) continue;
      
      const timerInfo = activeTimers.find(t => t.groupId === groupId);
      if (!timerInfo) continue;

      // Check for 5-minute warning
      const fiveMinutesInSeconds = 5 * 60;
      if (prevTimer.timeRemaining > fiveMinutesInSeconds && currentTimer.timeRemaining <= fiveMinutesInSeconds) {
        const currentMatch = timerInfo.matches.find(m => m.status !== 'completed');
        const currentMatchIndex = timerInfo.matches.findIndex(m => m.id === currentMatch?.id);
        const nextMatch = currentMatchIndex > -1 ? timerInfo.matches[currentMatchIndex + 1] : undefined;
        
        if (nextMatch) {
            setToastWarnings(prev => {
                if (prev.has(nextMatch.id)) return prev; // Already warned
                const newWarning = (
                    <div className="text-sm">
                        <p className="font-bold text-primary">{`${timerInfo.categoryName}`}</p>
                        <p className="font-semibold">{`Cancha ${timerInfo.court}: ${nextMatch.dupla1.nombre} vs ${nextMatch.dupla2.nombre}`}</p>
                    </div>
                );
                const newMap = new Map(prev);
                newMap.set(nextMatch.id, newWarning);
                return newMap;
            });
        }
      }

      // Check for timer finished (transition from active to inactive at zero)
      if (prevTimer.isActive && !currentTimer.isActive && currentTimer.timeRemaining === 0) {
        toast({
          title: "¡Tiempo Terminado!",
          description: `El tiempo para ${timerInfo.groupName} (${timerInfo.categoryName}) ha finalizado.`,
        });
      }
    }
  }, [groupTimers, prevGroupTimers, activeTimers, toast]);

  // 3. Effect for showing/updating the cumulative warning toast.
  useEffect(() => {
    if (toastWarnings.size > 0) {
        const allWarnings = Array.from(toastWarnings.values());
        const description = (
            <div className="space-y-3">
                {allWarnings.map((warning, index) => (
                    <React.Fragment key={index}>
                        {warning}
                        {index < allWarnings.length - 1 && <Separator className="bg-primary/50 my-2" />}
                    </React.Fragment>
                ))}
            </div>
        );
        toast({
            title: "¡A Prepararse! Próximos Partidos:",
            description,
            duration: 300000, // 5 minutes
            onOpenChange: (open) => {
                if (!open) {
                    setToastWarnings(new Map());
                }
            },
        });
    }
  }, [toastWarnings, toast]);

  // Effect for showing "time added" toast
  useEffect(() => {
    if (timeAddedInfo) {
      toast({
          title: "Tiempo Añadido",
          description: `Se han añadido ${timeAddedInfo.minutes} ${timeAddedInfo.minutes === 1 ? 'minuto' : 'minutos'} para calentamiento en ${timeAddedInfo.groupName}.`,
      });
      setTimeAddedInfo(null); // Reset after showing to avoid re-triggering
    }
  }, [timeAddedInfo, toast]);


  const handleTimerControl = (groupId: string, action: 'start' | 'pause' | 'reset' | 'addTime', minutesToAdd?: number) => {
      setGroupTimers(prev => {
          const newTimers = { ...prev };
          const timer = newTimers[groupId];
          if (!timer) return prev;

          switch(action) {
              case 'start':
                  newTimers[groupId] = { ...timer, isActive: true };
                  break;
              case 'pause':
                  newTimers[groupId] = { ...timer, isActive: false };
                  break;
              case 'reset':
                  {
                    const timerInfo = activeTimers.find(t => t.groupId === groupId);
                    const catFixture = timerInfo && fixture ? fixture[timerInfo.categoryId] : null;
                    const group = catFixture ? catFixture.groups.find(g => g.id === groupId) : null;
                    const baseDuration = group?.groupMatchDuration || matchDurationGlobal || 60;
                    
                    newTimers[groupId] = { 
                        ...timer, 
                        isActive: false, 
                        timeRemaining: baseDuration * 60, 
                        initialDuration: baseDuration * 60 
                    };
                  }
                  break;
              case 'addTime':
                  if (minutesToAdd) {
                      const addedSeconds = minutesToAdd * 60;
                      newTimers[groupId] = { 
                          ...timer, 
                          timeRemaining: timer.timeRemaining + addedSeconds,
                          initialDuration: timer.initialDuration + addedSeconds,
                      };
                  }
                  break;
          }
          return newTimers;
      });

      if (action === 'addTime' && minutesToAdd) {
        const timerInfo = activeTimers.find(t => t.groupId === groupId);
        if (timerInfo) {
            setTimeAddedInfo({ groupName: timerInfo.groupName, minutes: minutesToAdd });
        }
      }
  };

  const formatTime = (totalSeconds: number): string => {
    if (isNaN(totalSeconds) || totalSeconds < 0) return "00:00";
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };



  useEffect(() => {
    if (categoryToShare && shareableRef.current && !isSharing) {
      setIsSharing(true);
      toast({
        title: "Generando imagen...",
        description: "Por favor espera un momento.",
      });

      setTimeout(() => {
        html2canvas(shareableRef.current!, { 
          scale: 2,
          useCORS: true,
           backgroundColor: '#0A0A0A'
        }).then((canvas) => {
          const image = canvas.toDataURL("image/png");
          const link = document.createElement("a");
          link.href = image;
          const fileName = `fixture-${torneo!.tournamentName}-${categoryToShare.categoryName}.png`.replace(/\s+/g, '_').toLowerCase();
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          toast({
            title: "¡Imagen generada!",
            description: "La descarga de la imagen ha comenzado.",
          });
        }).catch((err) => {
          console.error("Error al generar la imagen:", err);
           toast({
            title: "Error al generar imagen",
            description: "No se pudo crear la imagen del fixture. Inténtalo de nuevo.",
            variant: "destructive"
          });
        }).finally(() => {
          setCategoryToShare(null);
          setIsSharing(false);
        });
      }, 250);
    }
  }, [categoryToShare, torneo, toast, isSharing]);


  const resultForm = useForm<ResultFormValues>({
    resolver: zodResolver(resultFormSchema),
    defaultValues: {
      score1: "",
      score2: "",
    },
  });


  const loadTournamentData = useCallback((nameToLoad?: string | null) => {
    setIsLoading(true);
    try {
      const storedLista = sessionStorage.getItem('listaTorneosActivos');
      let loadedLista: TorneoActivoData[] = [];
      if (storedLista) {
        loadedLista = JSON.parse(storedLista);
        setListaTorneos(loadedLista);
      }

      let tournamentToDisplay: TorneoActivoData | null = null;
      let tournamentIndex = -1;

      if (nameToLoad && loadedLista.length > 0) {
        tournamentIndex = loadedLista.findIndex(t => t.tournamentName === nameToLoad);
        if (tournamentIndex > -1) {
          tournamentToDisplay = loadedLista[tournamentIndex];
        }
      } else if (loadedLista.length > 0) {
        tournamentIndex = 0; // Default to the first tournament if no name is specified
        tournamentToDisplay = loadedLista[0];
      }
      
      setCurrentTournamentIndex(tournamentIndex);

      if (tournamentToDisplay) {
        const parsedTorneo = tournamentToDisplay; // Already parsed from list
         // Data transformation for duplas (if needed, similar to previous logic)
        const transformedCategories = parsedTorneo.categoriesWithDuplas.map((cat: any) => {
            const duplasTransformadas = (cat.duplas || []).map((savedDuplaObject: any) => {
                if (
                    !savedDuplaObject || typeof savedDuplaObject !== 'object' ||
                    !Array.isArray(savedDuplaObject.jugadores) || savedDuplaObject.jugadores.length !== 2 ||
                    !savedDuplaObject.jugadores[0] || !savedDuplaObject.jugadores[1] ||
                    typeof savedDuplaObject.jugadores[0] !== 'object' || typeof savedDuplaObject.jugadores[1] !== 'object' ||
                    typeof savedDuplaObject.nombre !== 'string'
                ) {
                    console.warn('Skipping malformed savedDuplaObject:', savedDuplaObject);
                    return null;
                }

                const p1Input = savedDuplaObject.jugadores[0];
                const p2Input = savedDuplaObject.jugadores[1];

                if (!p1Input || !p2Input || !p1Input.name) {
                    console.warn('Skipping dupla with invalid player data:', savedDuplaObject);
                    return null;
                }
                
                const p1Active: PlayerFormValues = {
                    id: p1Input.id || crypto.randomUUID(),
                    name: p1Input.name,
                    rut: p1Input.rut || `TEMP-${p1Input.name.replace(/\s+/g, '').slice(0,10)}-${Math.random().toString(36).substring(2, 5)}`,
                    position: p1Input.position || "ambos",
                    categoryId: p1Input.categoryId || cat.id,
                };
                const p2Active: PlayerFormValues = {
                    id: p2Input.id || crypto.randomUUID(),
                    name: p2Input.name,
                    rut: p2Input.rut || `TEMP-${p2Input.name.replace(/\s+/g, '').slice(0,10)}-${Math.random().toString(36).substring(2, 5)}`,
                    position: p2Input.position || "ambos",
                    categoryId: p2Input.categoryId || cat.id,
                };
                
                const validDuplaPlayers: [PlayerFormValues, PlayerFormValues] = [p1Active, p2Active];

                return {
                    id: savedDuplaObject.id || generateDuplaId(validDuplaPlayers),
                    jugadores: validDuplaPlayers,
                    nombre: savedDuplaObject.nombre
                };
            }).filter(Boolean); 

            return { ...cat, duplas: duplasTransformadas as Dupla[] };
        });

        setTorneo({ ...parsedTorneo, categoriesWithDuplas: transformedCategories });
        setNumCourtsGlobal(parsedTorneo.numCourts || 2);
        setMatchDurationGlobal(parsedTorneo.matchDuration || 60);
        setPlayThirdPlace(parsedTorneo.playThirdPlace ?? true);
        
        const storedFixture = sessionStorage.getItem(`fixture_${parsedTorneo.tournamentName}`);
        if (storedFixture) {
          const parsedFixture = JSON.parse(storedFixture);
          setFixture(parsedFixture);
          
          const initialGroupSettings: GroupScheduleState = {};
          const initialTimers: Record<string, GroupTimerState> = {};
          const loadedActiveTimers: ActiveTimerInfo[] = [];

          if (parsedFixture) {
            Object.values(parsedFixture).forEach((catFix: any) => {
                const categoryData = parsedTorneo.categoriesWithDuplas.find(c => c.id === catFix.categoryId);
                const categoryName = categoryData ? `${categoryData.type} - ${categoryData.level}` : "Categoría Desconocida";
                
                (catFix.groups || []).forEach((group: Group) => {
                    const duration = group.groupMatchDuration || parsedTorneo.matchDuration || 60;
                    initialGroupSettings[group.id] = {
                        court: group.groupAssignedCourt?.toString() || '1',
                        startTime: group.groupStartTime || '09:00',
                        duration: duration.toString(),
                    };
                    initialTimers[group.id] = {
                        isActive: false,
                        timeRemaining: duration * 60,
                        initialDuration: duration * 60,
                    };
                    if (group.groupAssignedCourt && group.groupStartTime) {
                        loadedActiveTimers.push({
                            groupId: group.id,
                            groupName: group.name,
                            categoryId: catFix.categoryId,
                            categoryName: categoryName,
                            court: group.groupAssignedCourt,
                            matches: group.matches,
                        });
                    }
                });
            });
          }
          setGroupScheduleSettings(initialGroupSettings);
          setGroupTimers(initialTimers);
          setActiveTimers(loadedActiveTimers);

        } else {
          setFixture(null);
          setGroupScheduleSettings({});
          setGroupTimers({});
          setActiveTimers([]);
        }
      } else {
        setTorneo(null);
        setFixture(null);
        setGroupScheduleSettings({});
        setGroupTimers({});
        setActiveTimers([]);
        if (nameToLoad) {
            toast({ title: "Torneo no encontrado", description: `No se encontró el torneo "${nameToLoad}".`, variant: "destructive" });
        }
      }
    } catch (error) {
      console.error("Error reading or parsing sessionStorage:", error);
      toast({ title: "Error de Carga", description: "No se pudieron cargar los datos del torneo.", variant: "destructive" });
      setTorneo(null);
      setFixture(null);
      setGroupScheduleSettings({});
      setGroupTimers({});
      setActiveTimers([]);
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    loadTournamentData(tournamentNameToLoad);
  }, [loadTournamentData, tournamentNameToLoad]);

  const navigateTournament = (direction: 'next' | 'prev') => {
    if (listaTorneos.length === 0) return;
    let newIndex = currentTournamentIndex;
    if (direction === 'next') {
      newIndex = (currentTournamentIndex + 1) % listaTorneos.length;
    } else {
      newIndex = (currentTournamentIndex - 1 + listaTorneos.length) % listaTorneos.length;
    }
    const newTournamentName = listaTorneos[newIndex]?.tournamentName;
    if (newTournamentName) {
      router.push(`/active-tournament?tournamentName=${encodeURIComponent(newTournamentName)}`);
    }
  };


 const handleGlobalTournamentSettingChange = (type: 'courts' | 'thirdPlace', value: string | boolean) => {
    if (!torneo) return;
    
    let updatedTorneoData = { ...torneo };
    let settingChanged = false;
    let toastDescription = "";

    if (type === 'courts') {
      const numericValue = parseInt(value as string, 10);
      if (!isNaN(numericValue) && numCourtsGlobal !== numericValue) {
        setNumCourtsGlobal(numericValue);
        updatedTorneoData.numCourts = numericValue;
        settingChanged = true;
        toastDescription = "Se actualizó el número de canchas disponibles.";
      }
    } else if (type === 'thirdPlace') {
        const checked = value as boolean;
        if (playThirdPlace !== checked) {
            setPlayThirdPlace(checked);
            updatedTorneoData.playThirdPlace = checked;
            settingChanged = true;
            toastDescription = checked ? "Se jugará partido por el tercer puesto." : "No se jugará partido por el tercer puesto.";
        }
    }
    
    if (settingChanged) {
        setTorneo(updatedTorneoData);
        // Update in listaTorneosActivos as well
        const currentTournamentName = torneo.tournamentName;
        const updatedList = listaTorneos.map(t => 
            t.tournamentName === currentTournamentName ? updatedTorneoData : t
        );
        setListaTorneos(updatedList);
        sessionStorage.setItem('listaTorneosActivos', JSON.stringify(updatedList));
        toast({ title: "Ajuste Guardado", description: toastDescription });
    }
  };

  const handleGroupScheduleSettingChange = (groupId: string, field: 'court' | 'startTime' | 'duration', value: string) => {
    setGroupScheduleSettings(prev => ({
      ...prev,
      [groupId]: {
        ...(prev[groupId] || { court: '1', startTime: '09:00', duration: matchDurationGlobal?.toString() || '60' }),
        [field]: value,
      },
    }));
  };


  const generateFixture = () => {
    if (!torneo || !torneo.categoriesWithDuplas) {
      toast({ title: "Error", description: "Faltan datos del torneo para generar el fixture.", variant: "destructive" });
      return;
    }

    const newFixture: FixtureData = {};
    const initialGroupSettings: GroupScheduleState = {};
    const newTimersState: Record<string, GroupTimerState> = {};
    const defaultDuration = matchDurationGlobal || 60;
    const defaultDurationStr = defaultDuration.toString();

    for (const category of torneo.categoriesWithDuplas) {
        const categoryName = category ? `${category.type} - ${category.level}` : "Categoría Desconocida";
        if (!category || category.duplas.length < 2) { 
            newFixture[category.id] = {
              categoryId: category.id,
              categoryName: categoryName,
              groups: [],
              playoffMatches: []
            };
            continue; 
        }

        const groups: Group[] = [];
        const categoryDuplas = shuffleArray([...category.duplas]); 
        const numCategoryDuplas = categoryDuplas.length;
        let groupLetter = 'A';

        if (numCategoryDuplas < 3) {
             const groupId = `${category.id}-G${groupLetter}`;
            groups.push({
                id: groupId,
                name: `Grupo ${groupLetter}`,
                duplas: [...categoryDuplas],
                standings: categoryDuplas.map(d => ({ duplaId: d.id, duplaName: d.nombre, pj: 0, pg: 0, pp: 0, pf: 0, pc: 0, pts: 0 })),
                matches: generateAndOrderGroupMatches([...categoryDuplas], groupId), 
                groupAssignedCourt: undefined,
                groupStartTime: undefined,
                groupMatchDuration: undefined,
            });
            initialGroupSettings[groupId] = { court: '1', startTime: '09:00', duration: defaultDurationStr };
            newTimersState[groupId] = { isActive: false, timeRemaining: defaultDuration * 60, initialDuration: defaultDuration * 60 };
        } else {
            let duplasToAssign = numCategoryDuplas;
            const idealGroupSize = Math.min(5, Math.max(3, Math.ceil(numCategoryDuplas / Math.ceil(numCategoryDuplas/5))));
            
            while(duplasToAssign > 0) {
                const groupId = `${category.id}-G${groupLetter}`;
                let currentGroupSize = Math.min(duplasToAssign, idealGroupSize);

                if (duplasToAssign - currentGroupSize > 0 && duplasToAssign - currentGroupSize < 3) {
                     if (groups.length > 0 && duplasToAssign < idealGroupSize && duplasToAssign < 3 && groups[groups.length-1].duplas.length + duplasToAssign <=5 ) { 
                        const remainingDuplasToMerge = categoryDuplas.splice(0, duplasToAssign);
                        groups[groups.length-1].duplas.push(...remainingDuplasToMerge);
                        const newStandingsForCombined = remainingDuplasToMerge.map(d => ({ duplaId: d.id, duplaName: d.nombre, pj: 0, pg: 0, pp: 0, pf: 0, pc: 0, pts: 0 }));
                        groups[groups.length - 1].standings.push(...newStandingsForCombined);
                        groups[groups.length - 1].matches = generateAndOrderGroupMatches(groups[groups.length-1].duplas, groups[groups.length-1].id);
                        duplasToAssign = 0;
                    } else { 
                        currentGroupSize = Math.max(3, Math.min(duplasToAssign, currentGroupSize)); 
                        const groupDuplas = categoryDuplas.splice(0, currentGroupSize);
                        groups.push({ 
                            id: groupId, 
                            name: `Grupo ${groupLetter}`, 
                            duplas: groupDuplas, 
                            standings: groupDuplas.map(d => ({ duplaId: d.id, duplaName: d.nombre, pj: 0, pg: 0, pp: 0, pf: 0, pc: 0, pts: 0 })), 
                            matches: generateAndOrderGroupMatches(groupDuplas, groupId),
                            groupAssignedCourt: undefined, groupStartTime: undefined, groupMatchDuration: undefined,
                        });
                        initialGroupSettings[groupId] = { court: '1', startTime: '09:00', duration: defaultDurationStr };
                        newTimersState[groupId] = { isActive: false, timeRemaining: defaultDuration * 60, initialDuration: defaultDuration * 60 };
                        duplasToAssign -= groupDuplas.length;
                    }
                } else {
                    const groupDuplas = categoryDuplas.splice(0, currentGroupSize);
                     groups.push({ 
                        id: groupId, 
                        name: `Grupo ${groupLetter}`, 
                        duplas: groupDuplas, 
                        standings: groupDuplas.map(d => ({ duplaId: d.id, duplaName: d.nombre, pj: 0, pg: 0, pp: 0, pf: 0, pc: 0, pts: 0 })), 
                        matches: generateAndOrderGroupMatches(groupDuplas, groupId),
                        groupAssignedCourt: undefined, groupStartTime: undefined, groupMatchDuration: undefined,
                    });
                    initialGroupSettings[groupId] = { court: '1', startTime: '09:00', duration: defaultDurationStr };
                    newTimersState[groupId] = { isActive: false, timeRemaining: defaultDuration * 60, initialDuration: defaultDuration * 60 };
                    duplasToAssign -= groupDuplas.length;
                }
                groupLetter = String.fromCharCode(groupLetter.charCodeAt(0) + 1);
                if (categoryDuplas.length === 0) duplasToAssign = 0; 
            }
        }
        
        let playoffMatchesForCategory: PlayoffMatch[] | undefined = undefined;
        if (groups.length === 2 && groups.every(g => g.duplas.length >=2)) { 
            const placeholderDuplaW_G1 = {id: 'placeholder-G1W', nombre: 'Ganador Grupo A', jugadores:[] as any};
            const placeholderDuplaRU_G1 = {id: 'placeholder-G1RU', nombre: 'Segundo Grupo A', jugadores:[] as any};
            const placeholderDuplaW_G2 = {id: 'placeholder-G2W', nombre: 'Ganador Grupo B', jugadores:[] as any};
            const placeholderDuplaRU_G2 = {id: 'placeholder-G2RU', nombre: 'Segundo Grupo B', jugadores:[] as any};
            const placeholderDuplaW_SF1 = {id: 'placeholder-SF1W', nombre: 'Ganador SF1', jugadores:[] as any};
            const placeholderDuplaL_SF1 = {id: 'placeholder-SF1L', nombre: 'Perdedor SF1', jugadores:[] as any};
            const placeholderDuplaW_SF2 = {id: 'placeholder-SF2W', nombre: 'Ganador SF2', jugadores:[] as any};
            const placeholderDuplaL_SF2 = {id: 'placeholder-SF2L', nombre: 'Perdedor SF2', jugadores:[] as any};

            playoffMatchesForCategory = [
                { id: `${category.id}-SF1`, dupla1: placeholderDuplaW_G1, dupla2: placeholderDuplaRU_G2, status: 'pending', stage: 'semifinal', description: 'Ganador Grupo A vs Segundo Grupo B', court: undefined, time: undefined },
                { id: `${category.id}-SF2`, dupla1: placeholderDuplaW_G2, dupla2: placeholderDuplaRU_G1, status: 'pending', stage: 'semifinal', description: 'Ganador Grupo B vs Segundo Grupo A', court: undefined, time: undefined },
                { id: `${category.id}-F`, dupla1: placeholderDuplaW_SF1, dupla2: placeholderDuplaW_SF2, status: 'pending', stage: 'final', description: 'Final', court: undefined, time: undefined },
            ];

            if (playThirdPlace) {
              playoffMatchesForCategory.push({ id: `${category.id}-TP`, dupla1: placeholderDuplaL_SF1, dupla2: placeholderDuplaL_SF2, status: 'pending', stage: 'tercer_puesto', description: 'Tercer Puesto', court: undefined, time: undefined});
            }
        }

        newFixture[category.id] = {
            categoryId: category.id,
            categoryName: categoryName,
            groups,
            playoffMatches: playoffMatchesForCategory
        };
    } 

    setFixture(newFixture);
    setGroupScheduleSettings(initialGroupSettings);
    setGroupTimers(newTimersState);
    setActiveTimers([]); // Reset active timers on new fixture
    if (torneo) {
      sessionStorage.setItem(`fixture_${torneo.tournamentName}`, JSON.stringify(newFixture));
    }
    toast({ title: "Enfrentamientos Generados", description: "Se ha creado la planilla de grupos y partidos (sin horarios ni canchas asignadas)." });
  };


  const handleScheduleGroupConfirm = (categoryId: string, groupId: string) => {
    if (!fixture || !torneo || !groupScheduleSettings[groupId]) {
      toast({ title: "Error", description: "Faltan datos para programar el grupo.", variant: "destructive" });
      return;
    }

    const { court: assignedCourtStr, startTime: groupStartTimeStr, duration: groupDurationStr } = groupScheduleSettings[groupId];
    const assignedCourt = !isNaN(parseInt(assignedCourtStr, 10)) ? parseInt(assignedCourtStr, 10) : assignedCourtStr;
    const groupMatchDuration = parseInt(groupDurationStr, 10);

    if (!groupStartTimeStr || !/^\d{2}:\d{2}$/.test(groupStartTimeStr) || !groupMatchDuration || groupMatchDuration <=0) {
      toast({ title: "Error de Configuración", description: "Hora de inicio o duración de partido inválida.", variant: "destructive" });
      return;
    }

    const newFixture = JSON.parse(JSON.stringify(fixture)) as FixtureData;
    const categoryFixture = newFixture[categoryId];
    if (!categoryFixture) return;

    const groupIndex = categoryFixture.groups.findIndex(g => g.id === groupId);
    if (groupIndex === -1) return;

    let groupToSchedule = categoryFixture.groups[groupIndex];
    groupToSchedule.groupAssignedCourt = assignedCourt;
    groupToSchedule.groupStartTime = groupStartTimeStr;
    groupToSchedule.groupMatchDuration = groupMatchDuration;
    
    // Update timer state for this group
    setGroupTimers(prev => ({
      ...prev,
      [groupId]: {
        isActive: false,
        timeRemaining: groupMatchDuration * 60,
        initialDuration: groupMatchDuration * 60
      }
    }));
    
    groupToSchedule = recalculateMatchTimesForGroup(groupToSchedule, torneo.date, groupStartTimeStr, groupMatchDuration);

    categoryFixture.groups[groupIndex] = groupToSchedule;

    const categoryName = categoryFixture ? categoryFixture.categoryName : 'Categoría';
    const newTimerInfo: ActiveTimerInfo = {
        groupId: groupId,
        groupName: groupToSchedule.name,
        categoryId: categoryId,
        categoryName: categoryName,
        court: assignedCourt,
        matches: groupToSchedule.matches,
    };

    setActiveTimers(prev => {
        const existingIndex = prev.findIndex(t => t.groupId === groupId);
        const updatedTimers = [...prev];
        if (existingIndex > -1) {
            updatedTimers[existingIndex] = newTimerInfo;
        } else {
            updatedTimers.push(newTimerInfo);
        }
        return updatedTimers;
    });


    setFixture(newFixture);
    sessionStorage.setItem(`fixture_${torneo.tournamentName}`, JSON.stringify(newFixture));
    toast({ title: "Grupo Programado", description: `Partidos del ${groupToSchedule.name} actualizados con cancha ${assignedCourt}, comenzando a las ${groupStartTimeStr} con duración de ${groupMatchDuration} min.` });
  };
  
  const handleMoveMatch = (categoryId: string, groupId: string, matchIndex: number, direction: 'up' | 'down') => {
      if (!fixture || !torneo) return;

      const newFixture = JSON.parse(JSON.stringify(fixture)) as FixtureData;
      const categoryFixture = newFixture[categoryId];
      if (!categoryFixture) return;

      const groupIndex = categoryFixture.groups.findIndex(g => g.id === groupId);
      if (groupIndex === -1) return;

      const group = categoryFixture.groups[groupIndex];
      
      if (group.matches[matchIndex].status === 'completed') {
        toast({ title: "Acción no permitida", description: "No se pueden reordenar partidos completados.", variant: "destructive" });
        return;
      }

      const newMatchIndex = direction === 'up' ? matchIndex - 1 : matchIndex + 1;
      if (newMatchIndex < 0 || newMatchIndex >= group.matches.length) return;

      const newMatches = [...group.matches];
      const [movedMatch] = newMatches.splice(matchIndex, 1);
      newMatches.splice(newMatchIndex, 0, movedMatch);
      
      group.matches = newMatches;

      const updatedGroup = recalculateMatchTimesForGroup(
        group,
        torneo.date,
        group.groupStartTime!,
        group.groupMatchDuration!
      );
      
      categoryFixture.groups[groupIndex] = updatedGroup;
      
      // Update activeTimers state to reflect the change immediately in the cronometers
      setActiveTimers(prev => prev.map(timerInfo => 
          timerInfo.groupId === groupId 
              ? { ...timerInfo, matches: [...updatedGroup.matches] }
              : timerInfo
      ));

      setFixture(newFixture);
      sessionStorage.setItem(`fixture_${torneo.tournamentName}`, JSON.stringify(newFixture));
      toast({ title: "Partidos Reordenados", description: `Se actualizó el horario para el ${group.name}.` });
  };


  const handleDeleteTournamentConfirm = () => {
    if (torneo) {
      const currentTournamentName = torneo.tournamentName;
      sessionStorage.removeItem(`fixture_${currentTournamentName}`);
      
      const updatedList = listaTorneos.filter(t => t.tournamentName !== currentTournamentName);
      setListaTorneos(updatedList);
      sessionStorage.setItem('listaTorneosActivos', JSON.stringify(updatedList));
      
      setFixture(null); 
      setTorneo(null);   
      setGroupScheduleSettings({});
      setGroupTimers({});
      setActiveTimers([]);
      setCurrentTournamentIndex(-1);
      
      toast({ title: "Torneo Borrado", description: `El torneo "${currentTournamentName}" ha sido eliminado.` });

      if (updatedList.length > 0) {
        router.push(`/active-tournament?tournamentName=${encodeURIComponent(updatedList[0].tournamentName)}`);
      } else {
        router.push('/active-tournament'); // Go to base page, will show no tournaments
      }
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
                const wasPending = matchToUpdate.status === 'pending' || (!matchToUpdate.score1 && !matchToUpdate.score2) ;

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
                        standing1.pj -=1; 
                        standing2.pj -=1;

                    }
                    standing1.pj += 1;
                    standing2.pj += 1;
                    
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
                
                const updatedGroup = group;
                setActiveTimers(prev => prev.map(timerInfo =>
                    timerInfo.groupId === updatedGroup.id
                        ? { ...timerInfo, matches: [...updatedGroup.matches] }
                        : timerInfo
                ));
                
                if (activeTimers.some(t => t.groupId === currentEditingMatch.groupOriginId)) {
                  handleTimerControl(currentEditingMatch.groupOriginId, 'reset');
                }

                const newCurrentMatch = updatedGroup.matches.find(m => m.status !== 'completed');
                if (newCurrentMatch) {
                    // This match is now starting, remove its warning if it exists.
                    setToastWarnings(prev => {
                        const newMap = new Map(prev);
                        if (newMap.has(newCurrentMatch.id)) {
                            newMap.delete(newCurrentMatch.id);
                            return newMap;
                        }
                        return prev;
                    });

                    if (updatedGroup.groupAssignedCourt) {
                        setNextMatchInfo({
                            dupla1: newCurrentMatch.dupla1,
                            dupla2: newCurrentMatch.dupla2,
                            court: updatedGroup.groupAssignedCourt,
                            categoryName: categoryFixture.categoryName,
                        });
                        setIsNextMatchDialogOpen(true);
                    }
                }
            }
        }
    } 
    else if (categoryFixture.playoffMatches && (currentEditingMatch as PlayoffMatch).stage) { 
        const matchIndex = categoryFixture.playoffMatches.findIndex(m => m.id === currentEditingMatch.id);
        if (matchIndex !== -1) {
            const matchToUpdate = categoryFixture.playoffMatches[matchIndex];
            matchToUpdate.score1 = score1;
            matchToUpdate.score2 = score2;
            matchToUpdate.status = 'completed';
            matchToUpdate.winnerId = score1 > score2 ? matchToUpdate.dupla1.id : matchToUpdate.dupla2.id;
            matchFound = true;
            
            if (matchToUpdate.stage === 'semifinal') {
                const finalMatch = categoryFixture.playoffMatches.find(m => m.stage === 'final');
                const thirdPlaceMatch = categoryFixture.playoffMatches.find(m => m.stage === 'tercer_puesto');

                if (finalMatch) {
                    const winnerDupla = matchToUpdate.winnerId === matchToUpdate.dupla1.id ? matchToUpdate.dupla1 : matchToUpdate.dupla2;
                    const loserDupla = matchToUpdate.winnerId === matchToUpdate.dupla1.id ? matchToUpdate.dupla2 : matchToUpdate.dupla1;
                    
                    if (matchToUpdate.id.endsWith('SF1')) { 
                        finalMatch.dupla1 = winnerDupla;
                        if (thirdPlaceMatch) thirdPlaceMatch.dupla1 = loserDupla;
                    } else if (matchToUpdate.id.endsWith('SF2')) { 
                        finalMatch.dupla2 = winnerDupla;
                        if (thirdPlaceMatch) thirdPlaceMatch.dupla2 = loserDupla;
                    }

                    const matchesToReset = [finalMatch];
                    if (thirdPlaceMatch) {
                      matchesToReset.push(thirdPlaceMatch);
                    }
                    matchesToReset.forEach(m => {
                        if (m && (m.dupla1.id.startsWith('placeholder-') || m.dupla2.id.startsWith('placeholder-'))) {
                        } else if (m){
                           m.score1 = undefined; m.score2 = undefined; m.status = 'pending'; m.winnerId = undefined;
                        }
                    });
                }
            }
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

  const handleOpenPlayoffScheduler = (categoryId: string) => {
    if (!fixture || !torneo) return;
    const catFixture = fixture[categoryId];
    const catData = torneo.categoriesWithDuplas.find(c => c.id === categoryId);

    if (!catFixture || !catData || !catFixture.playoffMatches || catFixture.playoffMatches.length === 0) {
        toast({ title: "Error", description: "Playoffs no aplican o no están definidos para esta categoría.", variant: "destructive" });
        return;
    }

    let allGroupMatchesCompleted = true;
    if (catFixture.groups.length > 0) { 
      for (const group of catFixture.groups) {
          if (group.matches.some(m => m.status !== 'completed')) {
              allGroupMatchesCompleted = false;
              break;
          }
      }
      if (!allGroupMatchesCompleted) {
          toast({ title: "Acción Requerida", description: "Todos los partidos de grupo de esta categoría deben estar completados y con resultados para programar playoffs.", variant: "warning" });
          return;
      }
    }


    setCategoryForPlayoffScheduling(catData);
    setPlayoffSchedulingSettings({ breakDuration: "30", defaultMatchDuration: matchDurationGlobal?.toString() || "60" });
    setIsPlayoffSchedulerDialogOpen(true);
  };

const handleConfirmPlayoffSchedule = () => {
    if (!fixture || !torneo || !categoryForPlayoffScheduling) {
        toast({ title: "Error", description: "Faltan datos para programar los playoffs.", variant: "destructive" });
        return;
    }

    const categoryId = categoryForPlayoffScheduling.id;
    const newFixture = JSON.parse(JSON.stringify(fixture)) as FixtureData;
    const catFixture = newFixture[categoryId];

    if (!catFixture || !catFixture.playoffMatches) {
        toast({ title: "Error", description: "Datos de fixture incompletos para playoffs.", variant: "destructive" });
        return;
    }
    if (!catFixture.groups) catFixture.groups = []; 
    
    const groupA = catFixture.groups.find(g => g.name.toLowerCase().includes("grupo a")) || catFixture.groups[0];
    const groupB = catFixture.groups.length > 1 ? (catFixture.groups.find(g => g.name.toLowerCase().includes("grupo b")) || catFixture.groups[1]) : groupA;

    let sortedStandingsA: Standing[] = [];
    let sortedStandingsB: Standing[] = [];

    if (groupA && groupA.standings.length > 0) {
        sortedStandingsA = [...groupA.standings].sort(compareStandingsNumerically);
        if (sortedStandingsA.length >= 2 && compareStandingsNumerically(sortedStandingsA[0], sortedStandingsA[1]) === 0) {
            const headToHeadMatch = groupA.matches.find(m =>
                m.status === 'completed' &&
                ((m.dupla1.id === sortedStandingsA[0].duplaId && m.dupla2.id === sortedStandingsA[1].duplaId) ||
                 (m.dupla1.id === sortedStandingsA[1].duplaId && m.dupla2.id === sortedStandingsA[0].duplaId))
            );
            if (headToHeadMatch?.winnerId === sortedStandingsA[1].duplaId) {
                [sortedStandingsA[0], sortedStandingsA[1]] = [sortedStandingsA[1], sortedStandingsA[0]];
            }
        }
    }

    if (groupB && groupB.standings.length > 0) {
        sortedStandingsB = [...groupB.standings].sort(compareStandingsNumerically);
        if (groupB.id === groupA?.id) sortedStandingsB = sortedStandingsA; 
        else if (sortedStandingsB.length >= 2 && compareStandingsNumerically(sortedStandingsB[0], sortedStandingsB[1]) === 0) {
             const headToHeadMatch = groupB.matches.find(m =>
                m.status === 'completed' &&
                ((m.dupla1.id === sortedStandingsB[0].duplaId && m.dupla2.id === sortedStandingsB[1].duplaId) ||
                 (m.dupla1.id === sortedStandingsB[1].duplaId && m.dupla2.id === sortedStandingsB[0].duplaId))
            );
            if (headToHeadMatch?.winnerId === sortedStandingsB[1].duplaId) {
                [sortedStandingsB[0], sortedStandingsB[1]] = [sortedStandingsB[1], sortedStandingsB[0]];
            }
        }
    } else if (groupA) { 
        sortedStandingsB = sortedStandingsA;
    }


    const winnerA = groupA?.duplas.find(d => d.id === sortedStandingsA[0]?.duplaId);
    const runnerUpA = groupA?.duplas.find(d => d.id === sortedStandingsA[1]?.duplaId);
    const winnerB = groupB?.duplas.find(d => d.id === sortedStandingsB[0]?.duplaId);
    const runnerUpB = groupB?.duplas.find(d => d.id === sortedStandingsB[1]?.duplaId);

    if (catFixture.groups.length > 0 && (!winnerA || !runnerUpA || !winnerB || !runnerUpB)) {
        toast({ title: "Error de Clasificación", description: "No se pudieron determinar todos los clasificados. Asegúrate que los grupos tengan resultados y al menos 2 duplas.", variant: "destructive"});
        return;
    }
    
    const sf1Match = catFixture.playoffMatches.find(m => m.id.endsWith('-SF1'));
    const sf2Match = catFixture.playoffMatches.find(m => m.id.endsWith('-SF2'));
    const finalMatch = catFixture.playoffMatches.find(m => m.stage === 'final');
    const thirdPlaceMatch = catFixture.playoffMatches.find(m => m.stage === 'tercer_puesto');

    if (sf1Match) { 
        if(winnerA && runnerUpB) { sf1Match.dupla1 = winnerA; sf1Match.dupla2 = runnerUpB; } 
        else if (!winnerA && sf1Match.dupla1.id.startsWith('placeholder-')) { /* keep placeholder */ }
        else if (!runnerUpB && sf1Match.dupla2.id.startsWith('placeholder-')) { /* keep placeholder */ }
        else if (catFixture.groups.length > 0) {toast({title:"Error", description:"SF1: Clasificados A o B no encontrados."}); return; }
    } else { toast({title:"Error", description:"SF1 no encontrada"}); return; }

    if (sf2Match) { 
        if(winnerB && runnerUpA) { sf2Match.dupla1 = winnerB; sf2Match.dupla2 = runnerUpA; } 
        else if (!winnerB && sf2Match.dupla1.id.startsWith('placeholder-')) { /* keep placeholder */ }
        else if (!runnerUpA && sf2Match.dupla2.id.startsWith('placeholder-')) { /* keep placeholder */ }
        else if (catFixture.groups.length > 0) {toast({title:"Error", description:"SF2: Clasificados B o A no encontrados."}); return; }
    } else { toast({title:"Error", description:"SF2 no encontrada"}); return; }
    
    const matchesToReset = [finalMatch];
    if (thirdPlaceMatch) {
      matchesToReset.push(thirdPlaceMatch);
    }
    matchesToReset.forEach(m => {
        if (m && (!m.dupla1.id.startsWith('placeholder-') || !m.dupla2.id.startsWith('placeholder-'))) {
             m.score1 = undefined; m.score2 = undefined; m.status = 'pending'; m.winnerId = undefined;
        }
    });


    let lastRelevantGroupMatchEndTime = new Date(0);
    if(catFixture.groups.length > 0) {
        catFixture.groups.forEach(group => {
            if (!group.groupStartTime || !group.groupMatchDuration) return;
            const groupBaseDate = torneo.date ? new Date(torneo.date) : new Date(); 
            
            group.matches.forEach(match => {
                 if (match.time && match.status === 'completed') { 
                    const matchStartTime = parse(match.time, "HH:mm", groupBaseDate);
                    if (isValid(matchStartTime)) {
                        const matchEndTime = addMinutes(matchStartTime, group.groupMatchDuration!);
                        if (matchEndTime > lastRelevantGroupMatchEndTime) {
                            lastRelevantGroupMatchEndTime = matchEndTime;
                        }
                    }
                 }
            });
        });
    }


    if (lastRelevantGroupMatchEndTime.getTime() === new Date(0).getTime()) { 
        const [generalHours, generalMinutes] = (torneo.time || "09:00").split(':').map(Number);
        lastRelevantGroupMatchEndTime = setMinutes(setHours(new Date(torneo.date), generalHours), generalMinutes);
        if (catFixture.groups.length > 0) {
             toast({ title: "Advertencia", description: "No se pudo determinar la hora de fin de grupos. Playoffs comenzarán desde hora general.", variant: "warning" });
        }
    }


    const breakMinutes = parseInt(playoffSchedulingSettings.breakDuration, 10);
    const playoffMatchDuration = parseInt(playoffSchedulingSettings.defaultMatchDuration, 10);

    let semiFinalsStartTime = addMinutes(lastRelevantGroupMatchEndTime, breakMinutes);
    
    const courtSf1 = groupA?.groupAssignedCourt || (numCourtsGlobal && numCourtsGlobal >= 1 ? "1" : "Cancha Principal");
    const courtSf2 = (groupB && groupB.groupAssignedCourt && groupB.groupAssignedCourt !== courtSf1) 
                     ? groupB.groupAssignedCourt 
                     : (numCourtsGlobal && numCourtsGlobal >= 2 ? (courtSf1 === "1" ? "2" : "1") : (courtSf1 === "Cancha Principal" ? "Cancha Secundaria" : "Cancha Principal"));


    if (sf1Match) {
      sf1Match.time = format(semiFinalsStartTime, "HH:mm");
      sf1Match.court = courtSf1;
    }
    const sf1EndTime = addMinutes(semiFinalsStartTime, playoffMatchDuration);

    if (sf2Match) {
      if (courtSf1 === courtSf2) { 
          sf2Match.time = format(sf1EndTime, "HH:mm");
      } else { 
          sf2Match.time = format(semiFinalsStartTime, "HH:mm");
      }
      sf2Match.court = courtSf2;
    }
    const sf2ParsedStartTime = sf2Match ? parse(sf2Match.time!, "HH:mm", new Date(torneo.date)) : new Date(0);
    const sf2EndTime = sf2Match ? addMinutes(sf2ParsedStartTime, playoffMatchDuration) : new Date(0);

    const latestSemiFinalEndTime = sf1EndTime > sf2EndTime ? sf1EndTime : sf2EndTime;

    let finalRoundStartTime = addMinutes(latestSemiFinalEndTime, breakMinutes);

    const courtFinal = groupA?.groupAssignedCourt || (numCourtsGlobal && numCourtsGlobal >= 1 ? "1" : "Cancha Principal");
    const courtThirdPlace = (groupB && groupB.groupAssignedCourt && groupB.groupAssignedCourt !== courtFinal)
                          ? groupB.groupAssignedCourt
                          : (numCourtsGlobal && numCourtsGlobal >= 2 ? (courtFinal === "1" ? "2" : "1") : (courtFinal === "Cancha Principal" ? "Cancha Secundaria": "Cancha Principal"));


    if (finalMatch) {
        finalMatch.time = format(finalRoundStartTime, "HH:mm");
        finalMatch.court = courtFinal;
    }
    const finalEndTime = addMinutes(finalRoundStartTime, playoffMatchDuration);

    if (thirdPlaceMatch) {
        if (courtFinal === courtThirdPlace) { 
            thirdPlaceMatch.time = format(finalEndTime, "HH:mm");
        } else { 
            thirdPlaceMatch.time = format(finalRoundStartTime, "HH:mm");
        }
        thirdPlaceMatch.court = courtThirdPlace;
    }
    
    setFixture(newFixture);
    sessionStorage.setItem(`fixture_${torneo.tournamentName}`, JSON.stringify(newFixture));
    toast({ title: "Playoffs Programados", description: `Playoffs para ${categoryForPlayoffScheduling.type} - ${categoryForPlayoffScheduling.level} programados.` });
    setIsPlayoffSchedulerDialogOpen(false);
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
        <h1 className="text-3xl md:text-4xl font-bold text-primary mb-4">
            {listaTorneos.length > 0 && !tournamentNameToLoad ? "Selecciona un Torneo" : "No hay Torneo Activo"}
        </h1>
        <p className="text-md text-muted-foreground mb-6 max-w-md">
          {listaTorneos.length > 0 && !tournamentNameToLoad 
            ? `Hay ${listaTorneos.length} torneo(s) activos. Navega entre ellos o crea uno nuevo.`
            : "No se ha generado un torneo recientemente o los datos no pudieron cargarse."
          }
        </p>
        {listaTorneos.length > 0 && !tournamentNameToLoad && (
             <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2">Torneos Disponibles:</h2>
                <ul className="list-disc list-inside">
                    {listaTorneos.map(t => (
                        <li key={t.tournamentName}>
                            <Link href={`/active-tournament?tournamentName=${encodeURIComponent(t.tournamentName)}`} className="text-primary hover:underline">
                                {t.tournamentName}
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        )}
        <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/random-tournament" passHref>
              <Button variant="default" size="lg">Crear un Torneo Random</Button>
            </Link>
             <Link href="/tournament" passHref>
              <Button variant="default" size="lg">Crear Torneo por Duplas</Button>
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
            <AlertDialogTitle>¿Estás seguro de borrar el torneo "{torneo.tournamentName}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminarán todos los datos de este torneo activo, incluyendo
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
        
      {listaTorneos.length > 1 && (
        <div className="flex items-center justify-between w-full max-w-4xl mb-4">
            <Button onClick={() => navigateTournament('prev')} variant="outline" size="sm" disabled={listaTorneos.length <=1}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
            </Button>
            <p className="text-sm text-muted-foreground">
                Torneo {currentTournamentIndex + 1} de {listaTorneos.length}
            </p>
            <Button onClick={() => navigateTournament('next')} variant="outline" size="sm" disabled={listaTorneos.length <=1}>
                Siguiente <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
        </div>
      )}

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
            <p><strong>Hora Inicio General:</strong> {torneo.time || "No especificada"}</p>
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
            <Label htmlFor="numCourtsGlobal" className="flex items-center"><Settings className="mr-2 h-4 w-4 text-muted-foreground" />Nº de Canchas Disponibles (Info)</Label>
            <Select 
                value={numCourtsGlobal?.toString()} 
                onValueChange={(value) => handleGlobalTournamentSettingChange('courts', value)}
            >
              <SelectTrigger id="numCourtsGlobal">
                <SelectValue placeholder="Canchas en el recinto" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 19 }, (_, i) => i + 2).map(n => ( 
                  <SelectItem key={n} value={n.toString()}>{n} canchas</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
           <div className="flex items-center space-x-2 col-span-full sm:col-span-1">
            <ShieldQuestion className="h-5 w-5 text-primary" />
            <Label htmlFor="play-third-place" className="flex-grow">Jugar Tercer Puesto</Label>
            <Switch
              id="play-third-place"
              checked={playThirdPlace}
              onCheckedChange={(checked) => handleGlobalTournamentSettingChange('thirdPlace', checked)}
              disabled={!!fixture}
            />
          </div>
          {!!fixture && 
            <div className="col-span-full sm:col-span-1">
              <p className="text-xs text-muted-foreground">
                No se puede cambiar una vez generado el fixture.
              </p>
            </div>
          }

        </CardContent>
        <CardFooter className="flex justify-between items-center pt-4">
            <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)} >
                <Trash2 className="mr-2 h-5 w-5" />
                Borrar Torneo
            </Button>
            <Button onClick={generateFixture} disabled={!!fixture}>
                <ListChecks className="mr-2 h-5 w-5" />
                {fixture ? "Enfrentamientos Ya Generados" : "Generar Enfrentamientos"}
            </Button>
        </CardFooter>
      </Card>

      {activeTimers.length > 0 && (
        <Card className="w-full max-w-4xl mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center">
              <Clock className="mr-2 h-6 w-6 text-primary" /> Cronómetros y Partidos en Juego
            </CardTitle>
            <CardDescription>
              Controla el tiempo y registra resultados de los grupos programados. Puedes iniciar múltiples cronómetros a la vez.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeTimers.sort((a, b) => a.court.toString().localeCompare(b.court.toString())).map((timerInfo) => {
              const timer = groupTimers[timerInfo.groupId];
              if (!timer) return null;

              const currentMatch = timerInfo.matches.find(m => m.status !== 'completed');
              const currentMatchIndex = timerInfo.matches.findIndex(m => m.id === currentMatch?.id);
              const nextMatch = currentMatchIndex > -1 ? timerInfo.matches[currentMatchIndex + 1] : undefined;


              return (
                <div key={timerInfo.groupId} className="border p-4 rounded-lg bg-background">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex-grow">
                      <p className="font-semibold text-primary">{`Cancha ${timerInfo.court}`}</p>
                      <p className="text-sm font-medium">{`${timerInfo.categoryName} - ${timerInfo.groupName}`}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="font-mono text-3xl font-bold text-primary">
                          {formatTime(timer.timeRemaining ?? 0)}
                        </div>
                        <Progress
                          value={
                            timer && timer.initialDuration > 0
                              ? ((timer.initialDuration - timer.timeRemaining) / timer.initialDuration) * 100
                              : 0
                          }
                          className="h-2 w-24 mt-1"
                        />
                      </div>
                      <div className="flex gap-2">
                        {(!timer || !timer.isActive) ? (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleTimerControl(timerInfo.groupId, 'start')}
                            aria-label="Iniciar"
                          >
                            <Play className="h-5 w-5" />
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleTimerControl(timerInfo.groupId, 'pause')}
                            aria-label="Pausar"
                          >
                            <Pause className="h-5 w-5" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleTimerControl(timerInfo.groupId, 'reset')}
                          aria-label="Reiniciar"
                        >
                          <RotateCcw className="h-5 w-5" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              aria-label="Añadir tiempo para calentamiento"
                              title="Añadir tiempo para calentamiento"
                            >
                              <PlusCircle className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {[1, 2, 3, 4, 5].map((min) => (
                              <DropdownMenuItem
                                key={min}
                                onClick={() =>
                                  handleTimerControl(
                                    timerInfo.groupId,
                                    "addTime",
                                    min
                                  )
                                }
                              >
                                Añadir {min} {min === 1 ? 'minuto' : 'minutos'}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                  
                  <Separator className="my-4" />

                  <div className="space-y-3 text-sm">
                    <div>
                      <h4 className="font-semibold text-muted-foreground mb-1">Partido Actual</h4>
                      {currentMatch ? (
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                            <p className="flex-grow">
                              <span className="font-medium">{currentMatch.dupla1.nombre}</span>
                              <span className="text-primary mx-2">vs</span>
                              <span className="font-medium">{currentMatch.dupla2.nombre}</span>
                            </p>
                            <Button size="sm" variant="secondary" onClick={() => {
                                setCurrentEditingMatch({ ...currentMatch, categoryId: timerInfo.categoryId, groupOriginId: timerInfo.groupId });
                                setIsResultModalOpen(true);
                              }}
                              className="h-8"
                            >
                              <Edit3 className="mr-2 h-4 w-4" /> Registrar
                            </Button>
                          </div>
                        ) : (
                          <p className="text-muted-foreground">No hay partidos pendientes en este grupo.</p>
                      )}
                    </div>
                     <div>
                      <h4 className="font-semibold text-muted-foreground mb-1">Siguiente Partido</h4>
                       {nextMatch ? (
                         <p className="text-muted-foreground">
                           {nextMatch.dupla1.nombre} vs {nextMatch.dupla2.nombre}
                         </p>
                       ) : (
                         <p className="text-muted-foreground">Último partido del grupo.</p>
                       )}
                    </div>
                  </div>

                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

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
                <CardDescription>Define la configuración para cada grupo y programa sus partidos. Luego programa los playoffs.</CardDescription>
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
                             <div className="flex justify-end mb-2">
                                <Button
                                  onClick={() => setCategoryToShare(catFixture)}
                                  disabled={isSharing}
                                  size="sm"
                                >
                                  <Share2 className="mr-2 h-4 w-4" />
                                  Compartir Planilla de Grupos
                                </Button>
                              </div>
                            <Tabs defaultValue="grupos" className="w-full">
                                <TabsList className="grid w-full grid-cols-3 mb-2">
                                    <TabsTrigger value="grupos" disabled={catFixture.groups.length === 0}>Grupos y Posiciones</TabsTrigger>
                                    <TabsTrigger value="partidos" disabled={!catFixture.groups.some(g => g.matches.length > 0)}>Partidos y Resultados</TabsTrigger>
                                    <TabsTrigger value="playoffs" disabled={!catFixture.playoffMatches || catFixture.playoffMatches.length === 0}>Playoffs</TabsTrigger>
                                </TabsList>
                                <TabsContent value="grupos">
                                    {catFixture.groups.length > 0 ? catFixture.groups.map(group => (
                                        <div key={group.id} className="mb-6 border p-4 rounded-lg">
                                            <h4 className="text-lg font-semibold text-primary mb-3">{group.name}</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 items-end">
                                                <div>
                                                    <Label htmlFor={`${group.id}-court`}>Cancha Asignada</Label>
                                                    <Select 
                                                        value={groupScheduleSettings[group.id]?.court || group.groupAssignedCourt?.toString() || '1'}
                                                        onValueChange={(value) => handleGroupScheduleSettingChange(group.id, 'court', value)}
                                                    >
                                                        <SelectTrigger id={`${group.id}-court`}>
                                                            <SelectValue placeholder="Selecciona cancha" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {Array.from({ length: numCourtsGlobal || 1 }, (_, i) => i + 1).map(n => (
                                                              <SelectItem key={n} value={n.toString()}>Cancha {n}</SelectItem>
                                                            ))}
                                                            <SelectItem value="Cancha Principal">Cancha Principal</SelectItem>
                                                            <SelectItem value="Cancha Secundaria">Cancha Secundaria</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div>
                                                    <Label htmlFor={`${group.id}-startTime`}>Hora Inicio Grupo</Label>
                                                    <Input 
                                                        type="time" 
                                                        id={`${group.id}-startTime`} 
                                                        value={groupScheduleSettings[group.id]?.startTime || group.groupStartTime || '09:00'}
                                                        onChange={(e) => handleGroupScheduleSettingChange(group.id, 'startTime', e.target.value)}
                                                    />
                                                </div>
                                                <div>
                                                    <Label htmlFor={`${group.id}-duration`}>Duración Partidos</Label>
                                                    <Select
                                                        value={groupScheduleSettings[group.id]?.duration || group.groupMatchDuration?.toString() || (matchDurationGlobal?.toString() || '60')}
                                                        onValueChange={(value) => handleGroupScheduleSettingChange(group.id, 'duration', value)}
                                                    >
                                                        <SelectTrigger id={`${group.id}-duration`}>
                                                            <SelectValue placeholder="Selecciona duración" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="1">1 min</SelectItem>
                                                            <SelectItem value="30">30 min</SelectItem>
                                                            <SelectItem value="45">45 min</SelectItem>
                                                            <SelectItem value="60">60 min</SelectItem>
                                                            <SelectItem value="90">90 min</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <Button onClick={() => handleScheduleGroupConfirm(catFixture.categoryId, group.id)} className="w-full md:w-auto">
                                                    <PlayCircle className="mr-2 h-5 w-5" /> Programar Grupo
                                                </Button>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead className="w-[30px] px-2 text-center">#</TableHead>
                                                            <TableHead className="min-w-[150px] px-2">Dupla</TableHead>
                                                            <TableHead className="w-[40px] px-1 text-center">PJ</TableHead>
                                                            <TableHead className="w-[40px] px-1 text-center">PG</TableHead>
                                                            <TableHead className="w-[40px] px-1 text-center">PP</TableHead>
                                                            <TableHead className="w-[60px] px-1 text-center">DIF</TableHead>
                                                            <TableHead className="w-[40px] px-1 text-center">PF</TableHead>
                                                            <TableHead className="w-[40px] px-1 text-center">PC</TableHead>
                                                            <TableHead className="w-[40px] px-1 text-center">Pts</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {[...group.standings].sort(compareStandingsNumerically).map((s, idx) => (
                                                            <TableRow key={s.duplaId}>
                                                                <TableCell className="px-2 text-center">{idx + 1}</TableCell>
                                                                <TableCell className="px-2 text-xs sm:text-sm">{s.duplaName}</TableCell>
                                                                <TableCell className="px-1 text-center">{s.pj}</TableCell>
                                                                <TableCell className="px-1 text-center">{s.pg}</TableCell>
                                                                <TableCell className="px-1 text-center">{s.pp}</TableCell>
                                                                <TableCell className="px-1 text-center">{s.pf - s.pc}</TableCell>
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
                                                {group.matches.map((match, matchIndex) => (
                                                    <li key={match.id} className="p-3 border rounded-md bg-secondary/20 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                                        <div className="flex-grow font-medium">
                                                            <span>{match.dupla1.nombre}</span> <span className="font-bold mx-1 text-primary">vs</span> <span>{match.dupla2.nombre}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                            <div className="text-xs text-muted-foreground text-right">
                                                                <span>{match.court ? (typeof match.court === 'number' ? `Cancha ${match.court}` : match.court) : 'Cancha TBD'}, {match.time || 'Hora TBD'}</span>
                                                                {match.status === 'completed' && <span className="font-bold ml-2">{`${match.score1} : ${match.score2}`}</span>}
                                                            </div>
                                                            {group.groupStartTime && match.status !== 'completed' && (
                                                                <div className="flex border-l pl-2 ml-2">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-6 w-6"
                                                                        title="Mover arriba"
                                                                        disabled={matchIndex === 0}
                                                                        onClick={() => handleMoveMatch(catFixture.categoryId, group.id, matchIndex, 'up')}
                                                                    >
                                                                        <ArrowUp className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-6 w-6"
                                                                        title="Mover abajo"
                                                                        disabled={matchIndex === group.matches.length - 1}
                                                                        onClick={() => handleMoveMatch(catFixture.categoryId, group.id, matchIndex, 'down')}
                                                                    >
                                                                        <ArrowDown className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            )}
                                                            <Button variant="outline" size="sm" className="text-xs h-7"
                                                                onClick={() => {
                                                                    setCurrentEditingMatch({ ...match, categoryId: catFixture.categoryId, groupOriginId: match.groupOriginId || group.id });
                                                                    setIsResultModalOpen(true);
                                                                }}
                                                            >
                                                                <Edit3 className="mr-1 h-3 w-3" />{match.status === 'completed' ? 'Editar' : 'Ingresar'}
                                                            </Button>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )) : <p className="text-muted-foreground text-center py-3">No hay partidos generados para esta categoría.</p>}
                                </TabsContent>
                                <TabsContent value="playoffs">
                                    {catFixture.playoffMatches && catFixture.playoffMatches.length > 0 ? (
                                        <div className="mb-6">
                                            <div className="flex justify-between items-center mb-3">
                                                <h4 className="text-lg font-semibold text-primary">Fase de Playoffs</h4>
                                                <Button 
                                                    onClick={() => handleOpenPlayoffScheduler(catFixture.categoryId)}
                                                    disabled={!catFixture.groups.every(g => g.matches.every(m => m.status === 'completed')) && catFixture.groups.length > 0}
                                                    size="sm"
                                                >
                                                    <CalendarIconLucide className="mr-2 h-4 w-4" /> Programar Playoffs
                                                </Button>
                                            </div>
                                            <p className="text-sm text-muted-foreground mb-3">
                                                {catFixture.groups.length === 0 || catFixture.groups.every(g => g.matches.every(m => m.status === 'completed')) 
                                                    ? "Define la configuración y programa los horarios y canchas para los playoffs." 
                                                    : "Completa todos los partidos de grupo y registra sus resultados para poder programar los playoffs."
                                                }
                                            </p>
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
                                                    return (a.time || "99:99").localeCompare(b.time || "99:99") || (a.court?.toString() || "Z99").localeCompare((b.court?.toString() || "Z99"));
                                                }).map(match => (
                                                    <li key={match.id} className="p-3 border rounded-md bg-secondary/20 text-sm">
                                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                                            <div>
                                                                <strong>{match.stage === 'semifinal' ? 'Semifinal' : match.stage === 'final' ? 'Final' : 'Tercer Puesto'}:</strong> {match.description}
                                                                <br/>
                                                                <span>{match.dupla1.nombre}</span> <span className="font-bold mx-1">vs</span> <span>{match.dupla2.nombre}</span>
                                                            </div>
                                                              <div className="text-xs text-muted-foreground mt-1 sm:mt-0 sm:ml-2">
                                                                ({match.court ? (typeof match.court === 'number' ? `Cancha ${match.court}`: match.court) : 'Cancha TBD'}, {match.time || 'Hora TBD'})
                                                                {match.status === 'completed' && ` - ${match.score1} : ${match.score2}`}
                                                            </div>
                                                        </div>
                                                          <Button variant="outline" size="sm" className="mt-2 sm:mt-0 sm:ml-3 text-xs h-6 float-right" 
                                                            onClick={() => {
                                                                setCurrentEditingMatch({ ...match, categoryId: catFixture.categoryId });
                                                                setIsResultModalOpen(true);
                                                            }}
                                                            disabled={match.dupla1.id.startsWith('placeholder-') || match.dupla2.id.startsWith('placeholder-')}
                                                          >
                                                            <Edit3 className="mr-1 h-3 w-3"/>{match.status === 'completed' ? 'Editar Resultado' : 'Ingresar Resultado'}
                                                          </Button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ) : (
                                        <p className="text-muted-foreground text-center py-3">La fase de playoffs no aplica o no ha sido generada para esta categoría (requiere 2 grupos con al menos 2 duplas c/u y resultados para la estructura actual).</p>
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
         <Link href="/tournament" passHref>
          <Button variant="outline" size="lg" className="text-base w-full sm:w-auto">Crear Nuevo Torneo por Duplas</Button>
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

      <Dialog open={isNextMatchDialogOpen} onOpenChange={setIsNextMatchDialogOpen}>
          <DialogContent className="sm:max-w-md text-center">
              <DialogHeader>
                  <DialogTitle className="text-2xl md:text-3xl font-bold text-center text-primary">
                      <Swords className="inline-block h-8 w-8 mr-2" />
                      ¡Siguiente Partido!
                  </DialogTitle>
                  {nextMatchInfo && (
                      <DialogDescription className="text-lg pt-1">
                          En Cancha {nextMatchInfo.court}
                      </DialogDescription>
                  )}
              </DialogHeader>
              {nextMatchInfo && (
                  <div className="py-6">
                      <p className="text-lg font-medium text-muted-foreground">{nextMatchInfo.categoryName}</p>
                      <p className="text-xl font-semibold mt-2">{nextMatchInfo.dupla1.nombre}</p>
                      <p className="text-2xl font-bold text-primary my-2">VS</p>
                      <p className="text-xl font-semibold">{nextMatchInfo.dupla2.nombre}</p>
                  </div>
              )}
              <DialogFooter className="sm:justify-center">
                  <DialogClose asChild>
                      <Button type="button" size="lg">Entendido</Button>
                  </DialogClose>
              </DialogFooter>
          </DialogContent>
      </Dialog>


      <Dialog open={isPlayoffSchedulerDialogOpen} onOpenChange={setIsPlayoffSchedulerDialogOpen}>
          <DialogContent className="sm:max-w-md">
              <DialogHeader>
                  <DialogTitle>Programar Playoffs para {categoryForPlayoffScheduling?.type} - {categoryForPlayoffScheduling?.level}</DialogTitle>
                  <DialogDescription>
                      Define la duración de los partidos de playoff y el descanso entre rondas.
                      Las canchas se intentarán asignar basadas en las canchas de los grupos principales (A y B si existen).
                      Asegúrate que todos los partidos de grupo de esta categoría estén completados.
                  </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                  <div className="space-y-1">
                      <Label htmlFor="playoffBreakDuration">Descanso entre Rondas de Playoff (minutos)</Label>
                      <Select
                          value={playoffSchedulingSettings.breakDuration}
                          onValueChange={(value) => setPlayoffSchedulingSettings(prev => ({ ...prev, breakDuration: value }))}
                      >
                          <SelectTrigger id="playoffBreakDuration" aria-label="Duración del Descanso entre Rondas de Playoff">
                              <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="0">0 minutos</SelectItem>
                              <SelectItem value="15">15 minutos</SelectItem>
                              <SelectItem value="30">30 minutos</SelectItem>
                              <SelectItem value="45">45 minutos</SelectItem>
                              <SelectItem value="60">60 minutos</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>
                  <div className="space-y-1">
                      <Label htmlFor="playoffMatchDuration">Duración Partidos de Playoff (minutos)</Label>
                      <Select
                          value={playoffSchedulingSettings.defaultMatchDuration}
                          onValueChange={(value) => setPlayoffSchedulingSettings(prev => ({ ...prev, defaultMatchDuration: value }))}
                      >
                          <SelectTrigger id="playoffMatchDuration" aria-label="Duración de Partidos de Playoff">
                              <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="1">1 minuto</SelectItem>
                              <SelectItem value="30">30 minutos</SelectItem>
                              <SelectItem value="45">45 minutos</SelectItem>
                              <SelectItem value="60">60 minutos</SelectItem>
                              <SelectItem value="90">90 minutos</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setIsPlayoffSchedulerDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleConfirmPlayoffSchedule}>Confirmar y Programar Playoffs</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
      <div style={{ position: 'absolute', left: '-9999px', top: 0, zIndex: -1 }}>
         {torneo && <ShareableFixture ref={shareableRef} tournamentName={torneo.tournamentName} categoryFixture={categoryToShare} />}
      </div>
    </div>
  );
}
    
export default function ActiveTournamentPage() {
  return (
    <Suspense fallback={<div className="container mx-auto flex flex-col items-center justify-center flex-1 py-12 px-4 md:px-6 text-center"><Activity className="h-16 w-16 text-primary mb-6 animate-spin" /><p className="text-lg text-muted-foreground">Cargando...</p></div>}>
      <ActiveTournamentPageComponent />
    </Suspense>
  );
}
