import Layout from "@/components/Layout";

const GC = () => {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">GC</h1>
          <p className="text-muted-foreground mt-1">GC</p>
        </div>

        <div className="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-5 py-3 text-center">
          <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">🚧 Em construção</p>
        </div>

        <div className="glass-card p-12 text-center text-muted-foreground">
          Esta funcionalidade está sendo desenvolvida.
        </div>
      </div>
    </Layout>
  );
};

export default GC;
