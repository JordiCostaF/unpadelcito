
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, Controller } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import React, { useState } from "react";

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
import { CalendarIcon, Shuffle, Trash2, UserPlus, Users, Trophy, MapPin, Clock, FileText, XCircle, Layers, PlusCircle, Tag, TestTube2 } from "lucide-react";

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

export default function RandomTournamentPage() {
  const { toast } = useToast();
  const [selectedCategoryTypeForNew, setSelectedCategoryTypeForNew] = useState<CategoryType | "">("");

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

  const { fields: playerFields, append: appendPlayer, remove: removePlayer, replace: replacePlayers } = useFieldArray({
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

  const watchedCategories = form.watch("categories");
  const watchedPlayers = form.watch("players");

  function onSubmitTournament(data: TournamentFormValues) {
    console.log("Tournament Data:", data);
    toast({
      title: "Torneo Registrado (simulado)",
      description: (
        <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
          <code className="text-white">{JSON.stringify(data, null, 2)}</code>
        </pre>
      ),
    });
  }

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

  function handleAddPlayer(playerData: PlayerFormValues) {
    const playerExistsInSameCategory = playerFields.some(p => p.rut === playerData.rut && p.categoryId === playerData.categoryId);
    if (playerExistsInSameCategory) {
      playerForm.setError("rut", { type: "manual", message: "Este RUT ya ha sido registrado en esta categoría." });
      return;
    }
    appendPlayer({ ...playerData, id: crypto.randomUUID() });
    playerForm.reset();
    toast({
      title: "Jugador Añadido",
      description: `${playerData.name} ha sido añadido al torneo.`,
    });
  }

  const getCategoryName = (categoryId: string) => {
    const category = watchedCategories.find(c => c.id === categoryId);
    return category ? `${category.type} - ${category.level}` : "Categoría desconocida";
  };
  
  const getCategoryShortName = (category: CategoryFormValues) => {
    return `${category.type.substring(0,3)}. ${category.level}`;
  }

  const fillWithTestData = () => {
    form.reset({
      tournamentName: "Torneo de Prueba Rápida",
      date: new Date(),
      time: "10:00",
      place: "Club de Pádel Central",
      categories: [],
      players: [],
    });
    replaceCategories([]);
    replacePlayers([]);

    const testCategories: CategoryFormValues[] = [
      { id: crypto.randomUUID(), type: "varones", level: "3° Categoría" },
      { id: crypto.randomUUID(), type: "damas", level: "Categoría B" },
    ];

    testCategories.forEach(cat => appendCategory(cat));

    const newPlayers: PlayerFormValues[] = [];
    const positions: PlayerFormValues["position"][] = ["drive", "reves", "ambos"];

    for (let i = 0; i < 40; i++) {
      const categoryIndex = i < 20 ? 0 : 1;
      const rutBase = 10000000 + i * 1000 + Math.floor(Math.random() * 1000);
      const dv = Math.random() > 0.5 ? Math.floor(Math.random() * 10).toString() : "K";
      newPlayers.push({
        id: crypto.randomUUID(),
        name: `Jugador ${i + 1}`,
        rut: `${rutBase}-${dv}`,
        position: positions[i % 3],
        categoryId: testCategories[categoryIndex].id,
      });
    }
    newPlayers.forEach(player => appendPlayer(player));

    toast({
      title: "Datos de Prueba Cargados",
      description: "El formulario ha sido llenado con 2 categorías y 40 jugadores.",
    });
  };


  return (
    <div className="container mx-auto flex flex-col items-center flex-1 py-8 px-4 md:px-6">
      <div className="flex items-center mb-8">
        <Shuffle className="h-12 w-12 text-primary mr-3" />
        <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary">
          Crear Torneo Random
        </h1>
      </div>

      <div className="w-full max-w-3xl mb-4">
        <Button type="button" onClick={fillWithTestData} variant="outline" className="w-full md:w-auto">
          <TestTube2 className="mr-2 h-4 w-4" /> Llenar con Datos de Prueba
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
                      <Input placeholder="Ej: Padelazo de Verano" {...field} />
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
                        <Input type="time" {...field} />
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
                      <Input placeholder="Ej: Club Padel Pro" {...field} />
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
                        <Button variant="ghost" size="icon" onClick={() => {
                          const playersInCategory = playerFields.filter(p => p.categoryId === category.id);
                          if (playersInCategory.length > 0) {
                            toast({
                              title: "Advertencia",
                              description: `La categoría ${category.type} - ${category.level} tiene ${playersInCategory.length} jugador(es) inscrito(s). Si la eliminas, estos jugadores quedarán sin categoría.`,
                              variant: "destructive"
                            });
                          }
                          removeCategory(index);
                          // Actualizar jugadores que estaban en la categoría eliminada
                          const updatedPlayers = playerFields
                            .filter(p => p.categoryId !== category.id)
                            .map(p => ({...p})); // shallow copy to avoid issues with field array
                          
                          // Opcional: Mover jugadores a una categoría "Sin asignar" o similar, o simplemente eliminarlos de la lista si se elimina la categoría
                          // Por ahora, los jugadores cuya categoría se eliminó no se modificarán explícitamente aquí,
                          // pero ya no tendrán una categoría válida en el selector o al listar.
                          // Podrías setear su categoryId a "" o un valor especial.
                          
                          // Si decides reasignar, aquí iría la lógica para actualizar el categoryId de los jugadores afectados.
                          // Ejemplo:
                          // const playersToUpdate = playerFields.filter(p => p.categoryId === category.id);
                          // playersToUpdate.forEach(player => {
                          //   const playerIndex = playerFields.findIndex(p => p.id === player.id);
                          //   if (playerIndex !== -1) {
                          //     // updatePlayer(playerIndex, { ...player, categoryId: "" }); // Asumiendo que tienes una función updatePlayer
                          //     // O bien, manejar esto al momento de listar o procesar los jugadores.
                          //   }
                          // });

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
              <CardTitle className="text-2xl flex items-center"><Users className="mr-2 h-6 w-6 text-primary" />Inscribir Jugadores</CardTitle>
              <CardDescription>Añade los participantes del torneo a las categorías correspondientes.</CardDescription>
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
                            <FormLabel>Nombre del Jugador</FormLabel>
                            <FormControl>
                              <Input placeholder="Juan Pérez" {...field} />
                            </FormControl>
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
                    <TabsList className="grid w-full grid-cols-min-1fr md:grid-cols-none md:flex md:flex-wrap">
                      {watchedCategories.map((category) => (
                        <TabsTrigger key={category.id} value={category.id} className="capitalize truncate">
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
                              {playersInCategory.map((player, index) => (
                                <li key={player.id || index} className="flex items-center justify-between p-3 bg-secondary/30 rounded-md shadow-sm">
                                  <div>
                                    <p className="font-semibold">{player.name}</p>
                                    <p className="text-sm text-muted-foreground">RUT: {player.rut} - Posición: <span className="capitalize">{player.position}</span></p>
                                  </div>
                                  <Button variant="ghost" size="icon" onClick={() => {
                                    const playerGlobalIndex = watchedPlayers.findIndex(p => p.id === player.id);
                                    if (playerGlobalIndex !== -1) {
                                      removePlayer(playerGlobalIndex);
                                      toast({ title: "Jugador Eliminado", description: `${player.name} ha sido eliminado de la categoría ${getCategoryName(player.categoryId)}.`});
                                    }
                                  }}>
                                    <Trash2 className="h-5 w-5 text-destructive" />
                                  </Button>
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
              <Shuffle className="mr-2 h-4 w-4" /> Registrar Torneo y Generar Partidos
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
    

    