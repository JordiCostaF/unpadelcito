export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <h1 className="text-5xl font-bold text-primary">
        Página de Prueba
      </h1>
      <p className="mt-4 text-xl text-foreground">
        Si puedes ver este texto, el problema está en los componentes de la página de inicio original.
      </p>
      <p className="mt-2 text-lg text-muted-foreground">
        Si sigues sin ver nada, el problema podría estar en la configuración del proyecto o del servidor local.
      </p>
    </div>
  );
}
