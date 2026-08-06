import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeamPanel } from "@/components/users/team-panel";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/permissions";

export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({
    meta: [
      { title: "Gestão de Usuários · Nexus ERP" },
      {
        name: "description",
        content: "Equipe e acessos, papéis e permissões por módulo em cada empresa do Nexus ERP.",
      },
      { property: "og:title", content: "Gestão de Usuários · Nexus ERP" },
      { property: "og:description", content: "Convites, papéis e permissões granulares por empresa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UsersPage,
});

function UsersPage() {
  return (
    <Tabs defaultValue="equipe" className="space-y-6">
      <div>
        <p className="text-xs tracking-wide text-muted-foreground uppercase">Gestão de Usuários</p>
        <TabsList className="mt-2">
          <TabsTrigger value="equipe">Equipe e acessos</TabsTrigger>
          <TabsTrigger value="papeis">Papéis e permissões</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="equipe">
        <TeamPanel />
      </TabsContent>
      <TabsContent value="papeis">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Object.entries(ROLE_DESCRIPTIONS).map(([role, description]) => (
            <Card key={role} className="border-border/60 bg-surface/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{ROLE_LABELS[role as keyof typeof ROLE_LABELS]}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{description}</CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
}