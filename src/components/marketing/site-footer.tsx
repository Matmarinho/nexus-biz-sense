import { Link } from "@tanstack/react-router";
import { Building2 } from "lucide-react";

const COLUMNS: { title: string; links: string[] }[] = [
  { title: "Empresa", links: ["Sobre a Nexus", "Carreiras", "Parceiros", "Imprensa", "Contato"] },
  { title: "Produtos", links: ["Financeiro", "Contratos", "Patrimônio", "CRM", "RH", "BI & IA"] },
  { title: "Soluções", links: ["Holding", "Indústria", "Comércio", "Prefeituras", "Saúde", "Educação"] },
  { title: "Recursos", links: ["Academy", "Blog", "Central de Ajuda", "Documentação API", "Roadmap", "Downloads"] },
  { title: "Legal", links: ["LGPD", "Privacidade", "Termos de Uso", "Cookies", "Mapa do Site"] },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-surface/40">
      <div className="mx-auto max-w-[90rem] px-6 py-14 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_repeat(5,1fr)]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
                <Building2 className="size-5" />
              </span>
              <span className="font-display text-sm font-semibold">Nexus ERP</span>
            </div>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Plataforma global de gestão empresarial com inteligência artificial, para organizações
              privadas e públicas.
            </p>
            <div className="mt-5 flex gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border border-border/60 px-3 py-1">PT-BR</span>
              <span className="rounded-full border border-border/60 px-3 py-1">EN</span>
              <span className="rounded-full border border-border/60 px-3 py-1">ES</span>
            </div>
          </div>
          {COLUMNS.map((c) => (
            <nav key={c.title} aria-label={c.title}>
              <p className="text-[11px] font-semibold tracking-[0.16em] text-foreground uppercase">{c.title}</p>
              <ul className="mt-4 space-y-2">
                {c.links.map((l) => (
                  <li key={l}>
                    <a href="#home" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} Nexus ERP · Gestão Inteligente Global. Todos os direitos reservados.</p>
          <div className="flex gap-4 sm:ml-auto">
            <a href="#contato" className="hover:text-foreground">LinkedIn</a>
            <a href="#contato" className="hover:text-foreground">YouTube</a>
            <a href="#contato" className="hover:text-foreground">Instagram</a>
            <Link to="/auth" className="hover:text-foreground">Entrar</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}