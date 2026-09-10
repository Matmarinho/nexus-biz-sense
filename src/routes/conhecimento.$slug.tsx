import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowLeft, ArrowRight, Clock, Lightbulb } from "lucide-react";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { CATEGORY_LABELS, findArticle, relatedArticles } from "@/lib/knowledge";

export const Route = createFileRoute("/conhecimento/$slug")({
  loader: ({ params }) => {
    const article = findArticle(params.slug);
    if (!article) throw notFound();
    return { title: article.title, desc: article.desc };
  },
  head: ({ loaderData }) => {
    const title = `${loaderData?.title ?? "Artigo"} · Central Nexus ERP`;
    const desc = loaderData?.desc ?? "Guia da Central de Conhecimento do Nexus ERP.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center bg-background px-6 text-center">
      <div>
        <h1 className="font-display text-2xl font-semibold">Artigo não encontrado</h1>
        <Link to="/conhecimento" className="mt-4 inline-flex items-center gap-2 text-sm text-primary">
          <ArrowLeft className="size-4" /> Voltar para a Central
        </Link>
      </div>
    </div>
  ),
  errorComponent: () => (
    <div className="grid min-h-screen place-items-center bg-background px-6 text-center">
      <div>
        <h1 className="font-display text-2xl font-semibold">Não foi possível abrir este artigo</h1>
        <Link to="/conhecimento" className="mt-4 inline-flex items-center gap-2 text-sm text-primary">
          <ArrowLeft className="size-4" /> Voltar para a Central
        </Link>
      </div>
    </div>
  ),
  component: ArticlePage,
});

function ArticlePage() {
  const { slug } = Route.useParams();
  const article = findArticle(slug)!;
  const related = relatedArticles(article);

  useEffect(() => {
    document.documentElement.classList.add("dark");
    window.scrollTo({ top: 0 });
  }, [slug]);

  return (
    <div className="bg-background">
      <SiteHeader />
      <main className="px-6 pt-32 pb-24 lg:px-10">
        <div className="mx-auto max-w-3xl">
          <Link
            to="/conhecimento"
            className="inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> Central de Conhecimento
          </Link>

          <div className="mt-6 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-primary">
              {CATEGORY_LABELS[article.cat] ?? article.cat}
            </span>
            <span className="rounded-full border border-border/60 px-3 py-1 uppercase">{article.level}</span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" /> {article.minutes} min de leitura
            </span>
          </div>

          <h1 className="mt-5 font-display text-3xl leading-tight font-semibold text-balance sm:text-4xl">
            {article.title}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">{article.desc}</p>

          <div className="mt-10 space-y-5">
            {article.body.map((block, i) => {
              if (block.type === "h")
                return (
                  <h2 key={i} className="pt-4 font-display text-xl font-semibold">
                    {block.text}
                  </h2>
                );
              if (block.type === "p")
                return (
                  <p key={i} className="leading-relaxed text-muted-foreground">
                    {block.text}
                  </p>
                );
              if (block.type === "list")
                return (
                  <ul key={i} className="space-y-2">
                    {block.items.map((it) => (
                      <li key={it} className="flex gap-3 text-muted-foreground">
                        <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                );
              if (block.type === "steps")
                return (
                  <ol key={i} className="space-y-3">
                    {block.items.map((it, n) => (
                      <li key={it} className="flex gap-3">
                        <span className="numeric grid size-6 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                          {n + 1}
                        </span>
                        <span className="text-muted-foreground">{it}</span>
                      </li>
                    ))}
                  </ol>
                );
              if (block.type === "tip")
                return (
                  <div key={i} className="glass flex gap-3 rounded-2xl p-4">
                    <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" />
                    <p className="text-sm text-muted-foreground">{block.text}</p>
                  </div>
                );
              return (
                <pre
                  key={i}
                  className="numeric overflow-x-auto rounded-2xl border border-border/60 bg-surface-2/60 p-4 text-xs leading-relaxed"
                >
                  <code>{block.text}</code>
                </pre>
              );
            })}
          </div>

          <div className="glass mt-14 flex flex-wrap items-center justify-between gap-4 rounded-3xl p-6">
            <p className="max-w-sm text-sm text-muted-foreground">
              Quer testar na prática? Abra a plataforma com dados de demonstração e siga este guia passo a passo.
            </p>
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-all hover:-translate-y-0.5"
            >
              Entrar grátis <ArrowRight className="size-4" />
            </Link>
          </div>

          <section className="mt-14">
            <h2 className="font-display text-lg font-semibold">Continue lendo</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  to="/conhecimento/$slug"
                  params={{ slug: r.slug }}
                  className="glass group rounded-2xl p-4 transition-all hover:-translate-y-1"
                >
                  <r.icon className="size-4 text-primary" />
                  <p className="mt-3 text-sm leading-snug font-medium">{r.title}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{r.minutes} min</p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
