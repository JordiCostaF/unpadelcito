
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";

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
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, Shuffle, Trash2, UserPlus, Users, Trophy, MapPin, Clock, FileText, XCircle } from "lucide-react";

const playerSchema = z.object({
  id: z.string().optional(), // Optional, could be generated
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
  rut: z.string().min(8, { message: "El RUT debe tener un formato válido (ej: 12345678-9)." })
    .regex(/^\d{7,8}-[\dkK]$/, { message: "RUT inválido. Formato: 12345678-9 o 12345678-K." }),
  position: z.enum(["drive", "reves", "ambos"], { required_error: "Debes seleccionar una posición." }),
});

const tournamentFormSchema = z.object({
  tournamentName: z.string().min(3, { message: "El nombre del torneo debe tener al menos 3 caracteres." }),
  date: z.date({ required_error: "La fecha es obligatoria." }),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Formato de hora inválido (HH:MM)." }),
  place: z.string().min(3, { message: "El lugar debe tener al menos 3 caracteres." }),
  players: z.array(playerSchema).min(1, { message: "Debe haber al menos un jugador inscrito." }),
});

type TournamentFormValues = z.infer<typeof tournamentFormSchema>;
type PlayerFormValues = z.infer<typeof playerSchema>;

export default function RandomTournamentPage() {
  const { toast } = useToast();

  const form = useForm<TournamentFormValues>({
    resolver: zodResolver(tournamentFormSchema),
    defaultValues: {
      tournamentName: "",
      time: "",
      place: "",
      players: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "players",
  });

  const playerForm = useForm<PlayerFormValues>({
    resolver: zodResolver(playerSchema),
    defaultValues: {
      name: "",
      rut: "",
      position: undefined,
    },
  });

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
    // Here you would typically send the data to a backend
    // For now, we'll just log it and reset the form if needed
  }

  function handleAddPlayer(playerData: PlayerFormValues) {
    const playerExists = fields.some(p => p.rut === playerData.rut);
    if (playerExists) {
      playerForm.setError("rut", { type: "manual", message: "Este RUT ya ha sido registrado." });
      return;
    }
    append({ ...playerData, id: crypto.randomUUID() });
    playerForm.reset();
    toast({
      title: "Jugador Añadido",
      description: `${playerData.name} ha sido añadido al torneo.`,
    });
  }

  return (
    <div className="container mx-auto flex flex-col items-center flex-1 py-8 px-4 md:px-6">
      <div className="flex items-center mb-8">
        <Shuffle className="h-12 w-12 text-primary mr-3" />
        <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary">
          Crear Torneo Random
        </h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmitTournament)} className="w-full max-w-2xl space-y-8">
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
              <CardTitle className="text-2xl flex items-center"><Users className="mr-2 h-6 w-6 text-primary" />Inscribir Jugadores</CardTitle>
              <CardDescription>Añade los participantes del torneo.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...playerForm}>
                <div className="space-y-4">
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
                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecciona posición" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="drive">Drive</SelectItem>
                                <SelectItem value="reves">Revés</SelectItem>
                                <SelectItem value="ambos">Ambos</SelectItem
                                >
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  <Button type="button" onClick={playerForm.handleSubmit(handleAddPlayer)} className="w-full md:w-auto mt-2">
                    <UserPlus className="mr-2 h-4 w-4" /> Añadir Jugador
                  </Button>
                </div>
              </Form>

              <Separator className="my-6" />
              
              {fields.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-4">Jugadores Inscritos:</h3>
                  <ul className="space-y-3">
                    {fields.map((player, index) => (
                      <li key={player.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-md shadow-sm">
                        <div>
                          <p className="font-semibold">{player.name}</p>
                          <p className="text-sm text-muted-foreground">RUT: {player.rut} - Posición: <span className="capitalize">{player.position}</span></p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => {
                          remove(index);
                          toast({ title: "Jugador Eliminado", description: `${player.name} ha sido eliminado.`});
                        }}>
                          <Trash2 className="h-5 w-5 text-destructive" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {fields.length === 0 && (
                <p className="text-muted-foreground text-center py-4">Aún no hay jugadores inscritos.</p>
              )}
              <FormField
                control={form.control}
                name="players"
                render={() => ( <FormMessage className="mt-2 text-center" /> )}
              />

            </CardContent>
          </Card>
          
          <div className="flex flex-col sm:flex-row justify-end gap-4 mt-8">
            <Link href="/" passHref>
              <Button variant="outline" type="button" className="w-full sm:w-auto">
                <XCircle className="mr-2 h-4 w-4" /> Cancelar y Volver
              </Button>
            </Link>
            <Button type="submit" className="w-full sm:w-auto">
              <Shuffle className="mr-2 h-4 w-4" /> Registrar Torneo
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

    