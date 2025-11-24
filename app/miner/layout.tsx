export default function MinerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col items-center justify-center gap-4 py-4 md:py-5">
      <div className="items-start flex flex-col w-full mb-4">
            <h1 className="text-3xl font-semibold">Miner</h1>
        </div>
      <div className="inline-block w-full text-center justify-center">
        {children}
      </div>
    </section>
  );
}
