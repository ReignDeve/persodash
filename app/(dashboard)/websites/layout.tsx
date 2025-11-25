export default function WebsitesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
        <div className="items-start flex flex-col w-full mb-4">
            <h1 className="text-3xl font-semibold">Websites</h1>
        </div>
      <div className="inline-block w-full text-center justify-center">
        {children}
      </div>
    </section>
  );
}
