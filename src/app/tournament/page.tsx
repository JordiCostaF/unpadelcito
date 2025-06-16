
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
  CalendarIcon, Users as UsersIcon, Trash2, UserPlus, Trophy, MapPin, Clock, FileText, XCircle, Layers, PlusCircle, Tag, TestTube2, Pencil, Swords
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
import type { TorneoActivoData, CategoriaConDuplas as CategoriaConDuplasFromActive, PlayerFormValues as PlayerFormValuesFromActiveTournament } from '../active-tournament/page';


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

const individualPlayerInDuplaSchema = z.object({
  name: z.string().min(2, { message: "Nombre del jugador debe tener al menos 2 caracteres." }),
  rut: z.string().optional(), 
});

const duplaSchema = z.object({
  id: z.string().optional(), 
  player1: individualPlayerInDuplaSchema,
  player2: individualPlayerInDuplaSchema,
  categoryId: z.string().min(1, { message: "Debes asignar la dupla a una categoría." }),
});

const tournamentFormSchema = z.object({
  tournamentName: z.string().min(3, { message: "El nombre del torneo debe tener al menos 3 caracteres." }),
  date: z.date({ required_error: "La fecha es obligatoria." }),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Formato de hora inválido (HH:MM)." }),
  place: z.string().min(3, { message: "El lugar debe tener al menos 3 caracteres." }),
  categories: z.array(categorySchema).min(1, { message: "Debe haber al menos una categoría en el torneo." }),
  duplas: z.array(duplaSchema),
});

export type TournamentFormValues = z.infer<typeof tournamentFormSchema>;
export type DuplaFormValues = z.infer<typeof duplaSchema>;
export type CategoryFormValues = z.infer<typeof categorySchema>;
export type IndividualPlayerInDuplaValues = z.infer<typeof individualPlayerInDuplaSchema>;


const generateDuplaIdForActiveTournament = (p1Name?: string, p2Name?: string, p1Rut?: string, p2Rut?: string): string => {
  const p1Identifier = p1Rut || p1Name || "jugador1";
  const p2Identifier = p2Rut || p2Name || "jugador2";
  return [p1Identifier, p2Identifier].sort().join('-');
};


export default function TournamentPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [selectedCategoryTypeForNew, setSelectedCategoryTypeForNew] = useState<CategoryType | "">("");
  const [editingDupla, setEditingDupla] = useState<DuplaFormValues & { originalIndex: number } | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
 
  const form = useForm<TournamentFormValues>({
    resolver: zodResolver(tournamentFormSchema),
    defaultValues: {
      tournamentName: "",
      time: "",
      place: "",
      categories: [],
      duplas: [],
    },
  });

  const { fields: categoryFields, append: appendCategory, remove: removeCategory, replace: replaceCategories } = useFieldArray({
    control: form.control,
    name: "categories",
  });

  const { fields: duplaFields, append: appendDupla, remove: removeDupla, update: updateDupla, replace: replaceDuplas } = useFieldArray({
    control: form.control,
    name: "duplas",
  });

  const categoryForm = useForm<Omit<CategoryFormValues, 'id'>>({
    resolver: zodResolver(categorySchema.omit({id: true})),
    defaultValues: {
      type: undefined,
      level: "",
    },
  });

  const duplaForm = useForm<Omit<DuplaFormValues, 'id'>>({ 
    resolver: zodResolver(duplaSchema.omit({id: true})),
    defaultValues: {
      player1: { name: "" }, 
      player2: { name: "" }, 
      categoryId: "",
    },
  });
  
  const editDuplaForm = useForm<Omit<DuplaFormValues, 'id'>>({
    resolver: zodResolver(duplaSchema.omit({id: true})),
  });

  const watchedCategories = form.watch("categories");
  const watchedDuplas = form.watch("duplas");

  useEffect(() => {
    if (editingDupla) {
      editDuplaForm.reset({
        player1: { name: editingDupla.player1.name, rut: editingDupla.player1.rut }, 
        player2: { name: editingDupla.player2.name, rut: editingDupla.player2.rut }, 
        categoryId: editingDupla.categoryId,
      });
    }
  }, [editingDupla, editDuplaForm]);

  function onSubmitTournament(data: TournamentFormValues) {
    const { tournamentName, date, time, place, categories, duplas } = data;

    if (categories.length === 0) {
      toast({
        title: "Error de Validación",
        description: "Debes tener al menos una categoría para generar el torneo.",
        variant: "destructive",
      });
      return;
    }

    if (duplas.length === 0) {
      toast({
       title: "Error de Validación",
       description: "Debes tener al menos una dupla inscrita en total en el torneo.",
       variant: "destructive",
     });
     return;
    }
    
    let categoryHasLessThanTwoDuplas = false;
    categories.forEach(cat => {
        const duplasInCategory = duplas.filter(d => d.categoryId === cat.id);
        if (duplasInCategory.length > 0 && duplasInCategory.length < 2) { 
            categoryHasLessThanTwoDuplas = true;
        }
    });

    if (categoryHasLessThanTwoDuplas) {
         toast({
          title: "Advertencia de Validación",
          description: "Una o más categorías tienen solo una dupla. Se necesitan al menos dos duplas por categoría para generar partidos. El torneo se creará, pero esas categorías no tendrán fixture.",
          variant: "default", 
        });
    }

    const categoriesWithDuplasOutput: CategoriaConDuplasFromActive[] = categories.map(category => {
      const duplasDeCategoria = duplas
        .filter(d => d.categoryId === category.id)
        .map(d => {
          const p1Active: PlayerFormValuesFromActiveTournament = {
            id: crypto.randomUUID(),
            name: d.player1.name,
            rut: d.player1.rut || `TEMP-${d.player1.name.replace(/\s+/g, '')}-${Math.random().toString(36).substring(2,5)}`,
            position: "ambos", 
            categoryId: category.id,
          };
          const p2Active: PlayerFormValuesFromActiveTournament = {
            id: crypto.randomUUID(),
            name: d.player2.name,
            rut: d.player2.rut || `TEMP-${d.player2.name.replace(/\s+/g, '')}-${Math.random().toString(36).substring(2,5)}`,
            position: "ambos", 
            categoryId: category.id,
          };
          return {
            id: generateDuplaIdForActiveTournament(p1Active.name, p2Active.name, p1Active.rut, p2Active.rut),
            jugadores: [p1Active, p2Active] as [PlayerFormValuesFromActiveTournament, PlayerFormValuesFromActiveTournament],
            nombre: `${d.player1.name} / ${d.player2.name}`
          };
        });
      
      return {
        ...category, 
        duplas: duplasDeCategoria,
        jugadoresSobrantes: [], 
        numTotalJugadores: duplasDeCategoria.length * 2
      };
    });

    const newTournamentData: TorneoActivoData = {
        tournamentName,
        date: date.toISOString(),
        time,
        place,
        categoriesWithDuplas: categoriesWithDuplasOutput,
        numCourts: form.getValues().duplas.length > 5 ? 4 : 2, // Example, can be adjusted
        matchDuration: 60, // Default
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
      // sessionStorage.removeItem('torneoActivo'); 

      toast({
        title: "Torneo Registrado",
        description: "Serás redirigido a la página del torneo activo para generar el fixture.",
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

  function handleAddDupla(duplaData: Omit<DuplaFormValues, 'id'>) {
    appendDupla({ ...duplaData, id: crypto.randomUUID() });
    duplaForm.reset({
      player1: { name: "" }, 
      player2: { name: "" }, 
      categoryId: duplaData.categoryId, 
    });
    toast({
      title: "Dupla Añadida",
      description: `Dupla ${duplaData.player1.name} / ${duplaData.player2.name} ha sido añadida.`,
    });
  }
  
  function handleOpenEditDuplaModal(dupla: DuplaFormValues, index: number) {
    const duplaGlobalIndex = watchedDuplas.findIndex(d => d.id === dupla.id);
    if (duplaGlobalIndex === -1) {
        toast({ title: "Error", description: "No se pudo encontrar la dupla para editar.", variant: "destructive"});
        return;
    }
    setEditingDupla({ ...dupla, originalIndex: duplaGlobalIndex });
    setIsEditModalOpen(true);
  }

  function handleUpdateDupla(data: Omit<DuplaFormValues, 'id'>) {
    if (!editingDupla) return;
    
    updateDupla(editingDupla.originalIndex, { ...data, id: editingDupla.id }); 
    toast({
      title: "Dupla Actualizada",
      description: `Los datos de la dupla ${data.player1.name} / ${data.player2.name} han sido actualizados.`,
    });
    setIsEditModalOpen(false);
    setEditingDupla(null);
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

  const fillWithTestData = () => {
    form.reset({
      tournamentName: "Torneo de Duplas Pre-formadas Elite",
      date: new Date(),
      time: "14:30",
      place: "Club Padel Masters",
      categories: [],
      duplas: [],
    });
    replaceCategories([]); 
    replaceDuplas([]);   
    
    const testCategoriesArray: CategoryFormValues[] = [
      { id: crypto.randomUUID(), type: "varones", level: "3° Categoría" },
      { id: crypto.randomUUID(), type: "damas", level: "Categoría A" },
      { id: crypto.randomUUID(), type: "mixto", level: "Mixto Elite" },
    ];
    
    replaceCategories(testCategoriesArray); 

    const newDuplasArray: DuplaFormValues[] = [];
    const duplasPerCategory = 6; 

    for (let catIdx = 0; catIdx < testCategoriesArray.length; catIdx++) {
        const categoryId = testCategoriesArray[catIdx].id;
        for (let i = 0; i < duplasPerCategory; i++) {
            newDuplasArray.push({
                id: crypto.randomUUID(),
                player1: {
                    name: `Atleta ${catIdx * duplasPerCategory * 2 + i * 2 + 1}`,
                    rut: `${10000000 + catIdx * duplasPerCategory * 2 + i * 2 + 1}-K`
                },
                player2: {
                    name: `Atleta ${catIdx * duplasPerCategory * 2 + i * 2 + 2}`,
                    rut: `${10000000 + catIdx * duplasPerCategory * 2 + i * 2 + 2}-9`
                },
                categoryId: categoryId,
            });
        }
    }
    replaceDuplas(newDuplasArray); 

    toast({
      title: "Datos de Prueba Cargados (Duplas)",
      description: `El formulario ha sido llenado con ${testCategoriesArray.length} categorías y ${newDuplasArray.length} duplas.`,
    });
  };


  return (
    <div className="container mx-auto flex flex-col items-center flex-1 py-8 px-4 md:px-6">
      <div className="flex items-center mb-8">
        <Swords className="h-12 w-12 text-primary mr-3" />
        <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary">
          Crear Torneo por Duplas
        </h1>
      </div>

      <div className="w-full max-w-3xl mb-4">
        <Button type="button" onClick={fillWithTestData} variant="outline" className="w-full md:w-auto">
          <TestTube2 className="mr-2 h-4 w-4" /> Llenar con Datos de Prueba (Duplas)
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
                      <Input placeholder="Ej: Copa Amistad por Duplas" {...field} />
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
                      <Input placeholder="Ej: Complejo Deportivo XYZ" {...field} />
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
                          const duplasInCategory = duplaFields.filter(d => d.categoryId === category.id);
                          if (duplasInCategory.length > 0) {
                            toast({
                              title: "Advertencia",
                              description: `La categoría ${category.type} - ${category.level} tiene ${duplasInCategory.length} dupla(s) inscrita(s). Si la eliminas, estas duplas quedarán sin categoría o serán eliminadas.`,
                              variant: "destructive" 
                            });
                          }
                          removeCategory(index);
                          const updatedDuplas = duplaFields.filter(d => d.categoryId !== category.id);
                          replaceDuplas(updatedDuplas);

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
              <CardTitle className="text-2xl flex items-center"><UsersIcon className="mr-2 h-6 w-6 text-primary" />Inscribir Duplas</CardTitle>
              <CardDescription>Añade las duplas participantes a las categorías correspondientes.</CardDescription>
            </CardHeader>
            <CardContent>
              {watchedCategories.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Debes añadir al menos una categoría al torneo antes de inscribir duplas.
                </p>
              ) : (
                <Form {...duplaForm}>
                  <div className="space-y-6 p-4 border rounded-md bg-secondary/20">
                    <div>
                        <h4 className="font-medium mb-2">Jugador 1</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={duplaForm.control}
                                name="player1.name"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nombre Jugador 1</FormLabel>
                                    <FormControl><Input placeholder="Nombre" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={duplaForm.control}
                                name="player1.rut"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>RUT Jugador 1 (Opcional)</FormLabel>
                                    <FormControl><Input placeholder="12345678-9" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>
                    </div>
                    <div>
                        <h4 className="font-medium mb-2">Jugador 2</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={duplaForm.control}
                                name="player2.name"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nombre Jugador 2</FormLabel>
                                    <FormControl><Input placeholder="Nombre" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={duplaForm.control}
                                name="player2.rut"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>RUT Jugador 2 (Opcional)</FormLabel>
                                    <FormControl><Input placeholder="12345678-9" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>
                    </div>
                    <FormField
                      control={duplaForm.control}
                      name="categoryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center"><Tag className="mr-2 h-4 w-4 text-muted-foreground" />Asignar Dupla a Categoría</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona categoría para la dupla" />
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
                    <Button type="button" onClick={duplaForm.handleSubmit(handleAddDupla)} className="w-full md:w-auto mt-2">
                      <UserPlus className="mr-2 h-4 w-4" /> Añadir Dupla
                    </Button>
                  </div>
                </Form>
              )}

              <Separator className="my-6" />
              
              {watchedDuplas.length > 0 && watchedCategories.length > 0 ? (
                <div>
                  <h3 className="text-lg font-medium mb-4">Duplas Inscritas:</h3>
                  <Tabs defaultValue={watchedCategories[0]?.id || "no-category"} className="w-full">
                    <TabsList className="grid w-full grid-cols-min-1fr md:grid-cols-none md:flex md:flex-wrap justify-start">
                      {watchedCategories.map((category) => (
                        <TabsTrigger key={category.id} value={category.id} className="capitalize truncate text-xs sm:text-sm px-2 sm:px-3">
                          {getCategoryShortName(category)} ({watchedDuplas.filter(d => d.categoryId === category.id).length})
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {watchedCategories.map((category) => {
                      const duplasInCategory = watchedDuplas.filter(d => d.categoryId === category.id);
                      return (
                        <TabsContent key={category.id} value={category.id}>
                          {duplasInCategory.length > 0 ? (
                            <ul className="space-y-3 mt-4">
                              {duplasInCategory.map((dupla, duplaIndex) => (
                                <li key={dupla.id || duplaIndex} className="flex items-center justify-between p-3 bg-secondary/30 rounded-md shadow-sm">
                                  <div className="flex items-start space-x-3">
                                    <span className="text-sm font-medium text-primary pt-0.5 w-6 text-right">{duplaIndex + 1}.</span>
                                    <div>
                                      <p className="font-semibold">{dupla.player1.name} / {dupla.player2.name}</p>
                                      {(dupla.player1.rut || dupla.player2.rut) && (
                                        <p className="text-xs text-muted-foreground">
                                          {dupla.player1.rut && `RUT J1: ${dupla.player1.rut}`}
                                          {dupla.player1.rut && dupla.player2.rut && " - "}
                                          {dupla.player2.rut && `RUT J2: ${dupla.player2.rut}`}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <Button variant="ghost" size="icon" onClick={() => handleOpenEditDuplaModal(dupla, duplaIndex)}>
                                      <Pencil className="h-5 w-5 text-blue-500" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => {
                                      const duplaGlobalIndex = watchedDuplas.findIndex(d => d.id === dupla.id);
                                      if (duplaGlobalIndex !== -1) {
                                        removeDupla(duplaGlobalIndex);
                                        toast({ title: "Dupla Eliminada", description: `Dupla ${dupla.player1.name} / ${dupla.player2.name} ha sido eliminada de la categoría ${getCategoryName(dupla.categoryId)}.`});
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
                              No hay duplas inscritas en la categoría {getCategoryName(category.id)}.
                            </p>
                          )}
                        </TabsContent>
                      );
                    })}
                  </Tabs>
                </div>
              ) : watchedCategories.length > 0 && (
                 <p className="text-muted-foreground text-center py-4">Aún no hay duplas inscritas en el torneo.</p>
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
              <Trophy className="mr-2 h-4 w-4" /> Registrar Torneo y Continuar
            </Button>
          </div>
        </form>
      </Form>

      {editingDupla && (
        <Dialog open={isEditModalOpen} onOpenChange={(isOpen) => {
          setIsEditModalOpen(isOpen);
          if (!isOpen) setEditingDupla(null);
        }}>
          <DialogContent className="sm:max-w-lg">
            <Form {...editDuplaForm}>
              <form onSubmit={editDuplaForm.handleSubmit(handleUpdateDupla)}>
                <DialogHeader>
                  <DialogTitle>Editar Dupla</DialogTitle>
                  <DialogDescription>
                    Modifica los datos de la dupla {editingDupla.player1.name} / {editingDupla.player2.name}.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    <div>
                        <h4 className="font-medium mb-2 text-sm">Jugador 1</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField
                                control={editDuplaForm.control}
                                name="player1.name"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nombre Jugador 1</FormLabel>
                                    <FormControl><Input {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={editDuplaForm.control}
                                name="player1.rut"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>RUT Jugador 1 (Opcional)</FormLabel>
                                    <FormControl><Input {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>
                    </div>
                     <div>
                        <h4 className="font-medium mb-2 text-sm">Jugador 2</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField
                                control={editDuplaForm.control}
                                name="player2.name"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nombre Jugador 2</FormLabel>
                                    <FormControl><Input {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={editDuplaForm.control}
                                name="player2.rut"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>RUT Jugador 2 (Opcional)</FormLabel>
                                    <FormControl><Input {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>
                    </div>
                  <FormField
                    control={editDuplaForm.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoría</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
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

    
