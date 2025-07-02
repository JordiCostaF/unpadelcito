
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, Controller } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import React, { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  CalendarIcon, Shuffle, Trash2, UserPlus, Users, Trophy, MapPin, Clock, FileText, XCircle, Layers, PlusCircle, Tag, TestTube2, Pencil, Eraser
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
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
import type { TorneoActivoData, CategoriaConDuplas } from '@/lib/tournament-types';


const categoryOptions = {
  varones: ["1° Categoría", "2° Categoría", "3° Categoría", "4° Categoría", "5° Categoría", "6° Categoría"],
  damas: ["Categoría A", "Categoría B", "Categoría C", "Categoría D", "Damas Iniciación"],
  mixto: ["Mixto A", "Mixto B", "Mixto C", "Mixto D", "Mixto Iniciación"],
};
type CategoryType = keyof typeof categoryOptions;

const categorySchema = z.object({
  id: z.string(),
  type: z.enum(["varones", "damas", "mixto"], { required_error: "Debes seleccionar un tipo de categoría." }),
  level: z.string().min(1, { message: "Debes seleccionar un nivel para la categoría." }),
});

const playerSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
  rut: z.string().min(8, { message: "El RUT debe tener un formato válido (ej: 12345678-9)." })
    .regex(/^\d{7,8}-[\dkK]$/, { message: "RUT inválido. Formato: 12345678-9 o 12345678-K." }),
  position: z.enum(["drive", "reves", "ambos"], { required_error: "Debes seleccionar una posición." }),
  categoryId: z.string().min(1, { message: "Debes asignar el jugador a una categoría." }),
});

const tournamentFormSchema = z.object({
  tournamentName: z.string().min(3, { message: "El nombre del torneo debe tener al menos 3 caracteres." }),
  date: z.date({ required_error: "La fecha es obligatoria." }),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Formato de hora inválido (HH:MM)." }),
  place: z.string().min(3, { message: "El lugar debe tener al menos 3 caracteres." }),
  categories: z.array(categorySchema).min(1, { message: "Debe haber al menos una categoría en el torneo." }),
  players: z.array(playerSchema),
});

type TournamentFormValues = z.infer<typeof tournamentFormSchema>;
type PlayerFormValues = z.infer<typeof playerSchema>;
type CategoryFormValues = z.infer<typeof categorySchema>;

// Helper function to shuffle an array
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

const generateDuplaIdInternal = (players: [PlayerFormValues, PlayerFormValues]): string => {
  const p1Rut = players[0].rut;
  const p2Rut = players[1].rut;
  return [p1Rut, p2Rut].sort().join('-');
};

export default function RandomTournamentPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [selectedCategoryTypeForNew, setSelectedCategoryTypeForNew] = useState<CategoryType | "">("");
  const [editingPlayer, setEditingPlayer] = useState<PlayerFormValues & { originalIndex: number } | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [playerPool, setPlayerPool] = useState<{name: string, rut: string}[]>([]);
  const [isClearPoolDialogOpen, setIsClearPoolDialogOpen] = useState(false);
 
  const form = useForm<TournamentFormValues>({
    resolver: zodResolver(tournamentFormSchema),
    defaultValues: {
      tournamentName: "",
      time: "",
      place: "",
      categories: [],
      players: [],
    },
  });

  const { fields: categoryFields, append: appendCategory, remove: removeCategory, replace: replaceCategories } = useFieldArray({
    control: form.control,
    name: "categories",
  });

  const { fields: playerFields, append: appendPlayer, remove: removePlayer, update: updatePlayer, replace: replacePlayers } = useFieldArray({
    control: form.control,
    name: "players",
  });

  const categoryForm = useForm<Omit<CategoryFormValues, 'id'>>({
    resolver: zodResolver(categorySchema.omit({id: true})),
    defaultValues: {
      type: undefined,
      level: "",
    },
  });

  const playerForm = useForm<PlayerFormValues>({
    resolver: zodResolver(playerSchema),
    defaultValues: {
      name: "",
      rut: "",
      position: undefined,
      categoryId: "",
    },
  });
  
  const editPlayerForm = useForm<PlayerFormValues>({
    resolver: zodResolver(playerSchema),
  });

  const watchedCategories = form.watch("categories");
  const watchedPlayers = form.watch("players");

  useEffect(() => {
    try {
      const storedPool = localStorage.getItem('unpadelcitoPlayerPool');
      if (storedPool) {
        setPlayerPool(JSON.parse(storedPool));
      }
    } catch (error) {
      console.error("Error loading player pool from localStorage:", error);
    }
  }, []);

  useEffect(() => {
    if (editingPlayer) {
      editPlayerForm.reset({
        id: editingPlayer.id,
        name: editingPlayer.name,
        rut: editingPlayer.rut,
        position: editingPlayer.position,
        categoryId: editingPlayer.categoryId,
      });
    }
  }, [editingPlayer, editPlayerForm]);

  function onSubmitTournament(data: TournamentFormValues) {
    const { tournamentName, date, time, place, categories, players } = data;

    if (categories.length === 0) {
      toast({
        title: "Error de Validación",
        description: "Debes tener al menos una categoría para generar partidos.",
        variant: "destructive",
      });
      return;
    }

    let totalPlayersNeeded = 0;
    categories.forEach(cat => {
        const playersInCategory = players.filter(p => p.categoryId === cat.id);
        if (playersInCategory.length < 2) {
            totalPlayersNeeded++;
        }
    });

    if (totalPlayersNeeded > 0 && categories.some(cat => players.filter(p => p.categoryId === cat.id).length <2)) {
         toast({
          title: "Error de Validación",
          description: "Cada categoría debe tener al menos dos jugadores inscritos para generar duplas.",
          variant: "destructive",
        });
        return;
    }
    if (players.length < 2) {
        toast({
         title: "Error de Validación",
         description: "Debes tener al menos dos jugadores inscritos en total en el torneo.",
         variant: "destructive",
       });
       return;
   }

    const categoriesWithDuplasOutput: CategoriaConDuplas[] = categories.map(category => {
      const playersInCategory = players.filter(p => p.categoryId === category.id);
      
      let drives = shuffleArray(playersInCategory.filter(p => p.position === 'drive'));
      let reveses = shuffleArray(playersInCategory.filter(p => p.position === 'reves'));
      let ambidiestros = shuffleArray(playersInCategory.filter(p => p.position === 'ambos'));

      const duplasRaw: PlayerFormValues[][] = [];
      
      while (reveses.length > 0 && drives.length > 0) {
        duplasRaw.push([reveses.pop()!, drives.pop()!]);
      }
      while (reveses.length > 0 && ambidiestros.length > 0) {
        duplasRaw.push([reveses.pop()!, ambidiestros.pop()!]);
      }
      while (drives.length > 0 && ambidiestros.length > 0) {
        duplasRaw.push([drives.pop()!, ambidiestros.pop()!]);
      }
      while (ambidiestros.length >= 2) {
        duplasRaw.push([ambidiestros.pop()!, ambidiestros.pop()!]);
      }
      while (reveses.length >= 2) {
        duplasRaw.push([reveses.pop()!, reveses.pop()!]);
      }
      while (drives.length >= 2) {
        duplasRaw.push([drives.pop()!, drives.pop()!]);
      }
      
      const jugadoresSobrantes = [...drives, ...reveses, ...ambidiestros];

      const formattedDuplas = duplasRaw.map(duplaPair => {
        const p1 = duplaPair[0];
        const p2 = duplaPair[1];
        if (!p1 || !p2) {
            console.error("Invalid dupla pair:", duplaPair);
            return null;
        }
        return {
          id: generateDuplaIdInternal([p1, p2]),
          jugadores: [p1, p2] as [PlayerFormValues, PlayerFormValues],
          nombre: `${p1.name} / ${p2.name}`
        };
      }).filter(Boolean);
      
      return {
        ...category,
        duplas: formattedDuplas as any[],
        jugadoresSobrantes,
        numTotalJugadores: playersInCategory.length
      };
    });
    
    const newTournamentData: TorneoActivoData = {
        tournamentName,
        date: date.toISOString(),
        time,
        place,
        categoriesWithDuplas: categoriesWithDuplasOutput,
        numCourts: form.getValues().players.length > 10 ? 4 : 2,
        matchDuration: 60,
        playThirdPlace: true,
    };
  
    try {
      let listaTorneosActivos: TorneoActivoData[] = [];
      const storedLista = sessionStorage.getItem('listaTorneosActivos');
      if (storedLista) {
        listaTorneosActivos = JSON.parse(storedLista);
      }

      const existingIndex = listaTorneosActivos.findIndex(t => t.tournamentName === newTournamentData.tournamentName);
      if (existingIndex > -1) {
        listaTorneosActivos[existingIndex] = newTournamentData;
      } else {
        listaTorneosActivos.push(newTournamentData);
      }
      
      sessionStorage.setItem('listaTorneosActivos', JSON.stringify(listaTorneosActivos));

      toast({
        title: "Torneo Registrado y Duplas Generadas",
        description: "Serás redirigido a la página del torneo activo.",
      });
      router.push(`/active-tournament?tournamentName=${encodeURIComponent(newTournamentData.tournamentName)}`);
    } catch (error) {
      console.error("Error saving to sessionStorage:", error);
      toast({
        title: "Error al Guardar",
        description: "No se pudo guardar el torneo en la sesión del navegador. Intenta de nuevo.",
        variant: "destructive",
      });
    }
  }


  function handleAddPlayer(playerData: PlayerFormValues) {
    const playerExistsInSameCategory = playerFields.some(p => p.rut === playerData.rut && p.categoryId === playerData.categoryId);
    if (playerExistsInSameCategory) {
      playerForm.setError("rut", { type: "manual", message: "Este RUT ya ha sido registrado en esta categoría." });
      return;
    }
    appendPlayer({ ...playerData, id: crypto.randomUUID() });
    playerForm.reset({ name: "", rut: "", position: undefined, categoryId: playerData.categoryId });

    toast({
      title: "Jugador Añadido",
      description: `${playerData.name} ha sido añadido al torneo.`,
    });

    const isPlayerInPool = playerPool.some(p => p.rut === playerData.rut);
    if (!isPlayerInPool) {
      const newPool = [...playerPool, { name: playerData.name, rut: playerData.rut }];
      setPlayerPool(newPool);
      try {
        localStorage.setItem('unpadelcitoPlayerPool', JSON.stringify(newPool));
         toast({
           title: "Jugador Guardado",
           description: `${playerData.name} se ha guardado en tu lista para futuros torneos.`,
         });
      } catch (error) {
        console.error("Error saving player to localStorage:", error);
      }
    }
  }
  
  function handleOpenEditPlayerModal(player: PlayerFormValues, index: number) {
    const playerGlobalIndex = watchedPlayers.findIndex(p => p.id === player.id);
    if (playerGlobalIndex === -1) {
        toast({ title: "Error", description: "No se pudo encontrar el jugador para editar.", variant: "destructive"});
        return;
    }
    setEditingPlayer({ ...player, originalIndex: playerGlobalIndex });
    setIsEditModalOpen(true);
  }

  function handleUpdatePlayer(data: PlayerFormValues) {
    if (!editingPlayer) return;

    const rutChanged = data.rut !== editingPlayer.rut;
    const categoryChanged = data.categoryId !== editingPlayer.categoryId;

    if (rutChanged || categoryChanged) {
      const playerExistsInSameCategory = playerFields.some(
        (p, index) =>
          p.rut === data.rut &&
          p.categoryId === data.categoryId &&
          index !== editingPlayer.originalIndex
      );
      if (playerExistsInSameCategory) {
        editPlayerForm.setError("rut", { type: "manual", message: "Este RUT ya está registrado en esta categoría." });
        return;
      }
    }

    updatePlayer(editingPlayer.originalIndex, data);
    toast({
      title: "Jugador Actualizado",
      description: `Los datos de ${data.name} han sido actualizados.`,
    });
    setIsEditModalOpen(false);
    setEditingPlayer(null);
  }

  const getCategoryName = (categoryId: string) => {
    const category = watchedCategories.find(c => c.id === categoryId);
    return category ? `${category.type} - ${category.level}` : "Categoría desconocida";
  };
  
  const getCategoryShortName = (category: CategoryFormValues) => {
    const type = category.type === "varones" ? "Var" : category.type === "damas" ? "Dam" : "Mix";
    const levelShort = category.level.split(" ")[0];
    return `${type}. ${levelShort}`;
  }
  
  const handlePlayerNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const name = event.target.value;
    playerForm.setValue("name", name);
    const matchedPlayer = playerPool.find(p => p.name === name);
    if (matchedPlayer) {
      playerForm.setValue("rut", matchedPlayer.rut, { shouldValidate: true });
    }
  };
  
  const handleClearPlayerPoolConfirm = () => {
    try {
      localStorage.removeItem('unpadelcitoPlayerPool');
      setPlayerPool([]);
      toast({
        title: "Lista de Jugadores Limpiada",
        description: "Todos los jugadores guardados han sido eliminados de la memoria del navegador.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo limpiar la lista de jugadores guardados.",
        variant: "destructive",
      });
    }
    setIsClearPoolDialogOpen(false);
  };


  const fillWithTestData = () => {
    form.reset({
      tournamentName: "Torneo Masivo de Prueba - 80 Jugadores",
      date: new Date(),
      time: "09:00",
      place: "Mega Padel Center",
      categories: [],
      players: [],
    });
    replaceCategories([]); 
    replacePlayers([]);   
    
    const testCategoriesArray: CategoryFormValues[] = [
      { id: crypto.randomUUID(), type: "varones", level: "3° Categoría" },
      { id: crypto.randomUUID(), type: "varones", level: "5° Categoría" },
      { id: crypto.randomUUID(), type: "damas", level: "Categoría B" },
      { id: crypto.randomUUID(), type: "damas", level: "Damas Iniciación" },
    ];
    
    replaceCategories(testCategoriesArray); 

    const newPlayersArray: PlayerFormValues[] = [];
    const positions: PlayerFormValues["position"][] = ["drive", "reves", "ambos"];
    const totalPlayers = 80; 
    const playersPerCategory = totalPlayers / testCategoriesArray.length; 

    for (let i = 0; i < totalPlayers; i++) {
      const categoryIndex = Math.floor(i / playersPerCategory);
      const rutBase = 10000000 + i * 1000 + Math.floor(Math.random() * 1000);
      const dvOptions = [...Array(10).keys()].map(String).concat(['K']);
      const dv = dvOptions[Math.floor(Math.random() * dvOptions.length)];
      
      newPlayersArray.push({
        id: crypto.randomUUID(),
        name: `Jugador Test ${i + 1}`,
        rut: `${rutBase}-${dv}`,
        position: positions[i % 3],
        categoryId: testCategoriesArray[categoryIndex].id, 
      });
    }
    replacePlayers(newPlayersArray); 

    toast({
      title: "Datos de Prueba Cargados (80 Jugadores)",
      description: `El formulario ha sido llenado con ${testCategoriesArray.length} categorías y ${totalPlayers} jugadores (${playersPerCategory} por categoría).`,
    });
  };

  function handleAddCategory(categoryData: Omit<CategoryFormValues, 'id'>) {
    const categoryExists = categoryFields.some(c => c.type === categoryData.type && c.level === categoryData.level);
    if (categoryExists) {
      categoryForm.setError("level", { type: "manual", message: "Esta categoría (tipo y nivel) ya existe." });
      return;
    }
    appendCategory({ ...categoryData, id: crypto.randomUUID() });
    categoryForm.reset();
    setSelectedCategoryTypeForNew("");
    toast({
      title: "Categoría Añadida",
      description: `Categoría ${categoryData.type} - ${categoryData.level} añadida.`,
    });
  }


  return (
    <div className="container mx-auto flex flex-col items-center flex-1 py-8 px-4 md:px-6">
      <AlertDialog open={isClearPoolDialogOpen} onOpenChange={setIsClearPoolDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente tu lista de jugadores guardados del navegador. No podrás deshacer esta acción.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearPlayerPoolConfirm} className="bg-destructive hover:bg-destructive/90">
              Sí, Limpiar Lista
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-center mb-8">
        <Shuffle className="h-12 w-12 text-primary mr-3" />
        <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary">
          Crear Torneo Random
        </h1>
      </div>

      <div className="w-full max-w-3xl mb-4">
        <Button type="button" onClick={fillWithTestData} variant="outline" className="w-full md:w-auto">
          <TestTube2 className="mr-2 h-4 w-4" /> Llenar con Datos de Prueba (80 Jugadores)
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmitTournament)} className="w-full max-w-3xl space-y-8">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center"><Trophy className="mr-2 h-6 w-6 text-primary" /> Detalles del Torneo</CardTitle>
              <CardDescription>Ingresa la información básica para tu nuevo torneo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="tournamentName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><FileText className="mr-2 h-4 w-4 text-muted-foreground" />Nombre del Torneo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Padelazo de Verano" {...field} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="flex items-center"><CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />Fecha</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: es })
                              ) : (
                                <span>Selecciona una fecha</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date(new Date().setHours(0,0,0,0))
                            }
                            initialFocus
                            locale={es}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center"><Clock className="mr-2 h-4 w-4 text-muted-foreground" />Horario</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="place"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><MapPin className="mr-2 h-4 w-4 text-muted-foreground" />Lugar</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Club Padel Pro" {...field} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center"><Layers className="mr-2 h-6 w-6 text-primary" /> Gestionar Categorías</CardTitle>
              <CardDescription>Añade y configura las categorías del torneo.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...categoryForm}>
                <div className="space-y-4 p-4 border rounded-md bg-secondary/20">
                  <FormField
                    control={categoryForm.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Categoría</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            setSelectedCategoryTypeForNew(value as CategoryType | "");
                            categoryForm.setValue("level", "");
                          }}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="varones">Varones</SelectItem>
                            <SelectItem value="damas">Damas</SelectItem>
                            <SelectItem value="mixto">Mixto</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {selectedCategoryTypeForNew && (
                    <FormField
                      control={categoryForm.control}
                      name="level"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nivel de Categoría</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona nivel" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categoryOptions[selectedCategoryTypeForNew].map(level => (
                                <SelectItem key={level} value={level}>{level}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <Button type="button" onClick={categoryForm.handleSubmit(handleAddCategory)} className="w-full md:w-auto mt-2">
                    <PlusCircle className="mr-2 h-4 w-4" /> Añadir Categoría
                  </Button>
                </div>
              </Form>

              <Separator className="my-6" />

              {categoryFields.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-4">Categorías del Torneo:</h3>
                  <ul className="space-y-3">
                    {categoryFields.map((category, index) => (
                      <li key={category.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-md shadow-sm">
                        <div>
                          <p className="font-semibold capitalize">{category.type} - {category.level}</p>
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => {
                          const playersInCategory = playerFields.filter(p => p.categoryId === category.id);
                          if (playersInCategory.length > 0) {
                            toast({
                              title: "Advertencia",
                              description: `La categoría ${category.type} - ${category.level} tiene ${playersInCategory.length} jugador(es) inscrito(s). Si la eliminas, estos jugadores quedarán sin categoría o serán eliminados (dependiendo de la lógica futura).`,
                              variant: "destructive"
                            });
                          }
                          removeCategory(index);
                          toast({ title: "Categoría Eliminada", description: `Categoría ${category.type} - ${category.level} eliminada.`});
                        }}>
                          <Trash2 className="h-5 w-5 text-destructive" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {categoryFields.length === 0 && (
                <p className="text-muted-foreground text-center py-4">Aún no hay categorías añadidas al torneo.</p>
              )}
               <FormField
                control={form.control}
                name="categories"
                render={() => ( <FormMessage className="mt-2 text-center" /> )}
              />
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex justify-between items-center">
                 <CardTitle className="text-2xl flex items-center"><Users className="mr-2 h-6 w-6 text-primary" />Inscribir Jugadores</CardTitle>
                 <Button type="button" variant="outline" size="sm" onClick={() => setIsClearPoolDialogOpen(true)} disabled={playerPool.length === 0}>
                    <Eraser className="mr-2 h-4 w-4" /> Limpiar Jugadores Guardados
                  </Button>
              </div>
              <CardDescription>Añade los participantes del torneo. Los nuevos jugadores se guardarán para futuros torneos.</CardDescription>
            </CardHeader>
            <CardContent>
              {watchedCategories.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Debes añadir al menos una categoría al torneo antes de inscribir jugadores.
                </p>
              ) : (
                <Form {...playerForm}>
                  <div className="space-y-4 p-4 border rounded-md bg-secondary/20">
                      <FormField
                        control={playerForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre del Jugador (Escribe para buscar)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Juan Pérez" 
                                {...field} 
                                onChange={handlePlayerNameChange}
                                list="player-pool-list"
                              />
                            </FormControl>
                            <datalist id="player-pool-list">
                              {playerPool.map(p => <option key={p.rut} value={p.name} />)}
                            </datalist>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={playerForm.control}
                          name="rut"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>RUT</FormLabel>
                              <FormControl>
                                <Input placeholder="12345678-9" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={playerForm.control}
                          name="position"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Posición</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecciona posición" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="drive">Drive</SelectItem>
                                  <SelectItem value="reves">Revés</SelectItem>
                                  <SelectItem value="ambos">Ambos</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={playerForm.control}
                        name="categoryId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center"><Tag className="mr-2 h-4 w-4 text-muted-foreground" />Asignar a Categoría</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecciona categoría para el jugador" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {watchedCategories.map(cat => (
                                  <SelectItem key={cat.id} value={cat.id}>
                                    {cat.type} - {cat.level}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    <Button type="button" onClick={playerForm.handleSubmit(handleAddPlayer)} className="w-full md:w-auto mt-2">
                      <UserPlus className="mr-2 h-4 w-4" /> Añadir Jugador
                    </Button>
                  </div>
                </Form>
              )}

              <Separator className="my-6" />
              
              {watchedPlayers.length > 0 && watchedCategories.length > 0 ? (
                <div>
                  <h3 className="text-lg font-medium mb-4">Jugadores Inscritos:</h3>
                  <Tabs defaultValue={watchedCategories[0]?.id || "no-category"} className="w-full">
                    <TabsList className="grid w-full grid-cols-min-1fr md:grid-cols-none md:flex md:flex-wrap justify-start">
                      {watchedCategories.map((category) => (
                        <TabsTrigger key={category.id} value={category.id} className="capitalize truncate text-xs sm:text-sm px-2 sm:px-3">
                          {getCategoryShortName(category)}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {watchedCategories.map((category) => {
                      const playersInCategory = watchedPlayers.filter(p => p.categoryId === category.id);
                      return (
                        <TabsContent key={category.id} value={category.id}>
                          {playersInCategory.length > 0 ? (
                            <ul className="space-y-3 mt-4">
                              {playersInCategory.map((player, playerIndex) => (
                                <li key={player.id || playerIndex} className="flex items-center justify-between p-3 bg-secondary/30 rounded-md shadow-sm">
                                  <div className="flex items-start space-x-3">
                                    <span className="text-sm font-medium text-primary pt-0.5 w-6 text-right">{playerIndex + 1}.</span>
                                    <div>
                                      <p className="font-semibold">{player.name}</p>
                                      <p className="text-sm text-muted-foreground">RUT: {player.rut} - Posición: <span className="capitalize">{player.position}</span></p>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <Button type="button" variant="ghost" size="icon" onClick={() => handleOpenEditPlayerModal(player, playerIndex)}>
                                      <Pencil className="h-5 w-5 text-blue-500" />
                                    </Button>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => {
                                      const playerGlobalIndex = watchedPlayers.findIndex(p => p.id === player.id);
                                      if (playerGlobalIndex !== -1) {
                                        removePlayer(playerGlobalIndex);
                                        toast({ title: "Jugador Eliminado", description: `${player.name} ha sido eliminado de la categoría ${getCategoryName(player.categoryId)}.`});
                                      }
                                    }}>
                                      <Trash2 className="h-5 w-5 text-destructive" />
                                    </Button>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-muted-foreground text-center py-4 mt-4">
                              No hay jugadores inscritos en la categoría {getCategoryName(category.id)}.
                            </p>
                          )}
                        </TabsContent>
                      );
                    })}
                  </Tabs>
                </div>
              ) : watchedCategories.length > 0 && (
                 <p className="text-muted-foreground text-center py-4">Aún no hay jugadores inscritos en el torneo.</p>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row justify-end gap-4 mt-8">
            <Link href="/" passHref>
              <Button variant="outline" type="button" className="w-full sm:w-auto">
                <XCircle className="mr-2 h-4 w-4" /> Cancelar y Volver
              </Button>
            </Link>
            <Button type="submit" className="w-full sm:w-auto">
              <Shuffle className="mr-2 h-4 w-4" /> Registrar Torneo y Generar Duplas
            </Button>
          </div>
        </form>
      </Form>

      {editingPlayer && (
        <Dialog open={isEditModalOpen} onOpenChange={(isOpen) => {
          setIsEditModalOpen(isOpen);
          if (!isOpen) setEditingPlayer(null);
        }}>
          <DialogContent className="sm:max-w-[425px]">
            <Form {...editPlayerForm}>
              <form onSubmit={editPlayerForm.handleSubmit(handleUpdatePlayer)}>
                <DialogHeader>
                  <DialogTitle>Editar Jugador</DialogTitle>
                  <DialogDescription>
                    Modifica los datos de {editingPlayer.name}. Haz clic en guardar cuando termines.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <FormField
                    control={editPlayerForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre del Jugador</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editPlayerForm.control}
                    name="rut"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>RUT</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editPlayerForm.control}
                    name="position"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Posición</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona posición" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="drive">Drive</SelectItem>
                            <SelectItem value="reves">Revés</SelectItem>
                            <SelectItem value="ambos">Ambos</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editPlayerForm.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoría</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona categoría" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {watchedCategories.map(cat => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.type} - {cat.level}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">Cancelar</Button>
                  </DialogClose>
                  <Button type="submit">Guardar Cambios</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
