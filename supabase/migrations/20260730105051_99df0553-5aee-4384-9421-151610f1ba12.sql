
update public.plans set
  name='Startup / PJ', tagline='Entrada & validação: organização financeira sem complicações',
  audience='Autônomos, MEIs e freelancers',
  price_monthly=49.90, price_yearly=508.98,
  limits='{"workspaces":1,"users":3,"fiscal_docs":50,"ai_reads":30,"funnels":1,"leads":50}'::jsonb,
  features='["1 workspace (CNPJ ou CPF)","Até 3 usuários (dono, operacional e contador)","50 notas fiscais/mês","30 leituras de IA (OCR)/mês","Dashboard financeiro essencial com fluxo de caixa de 30 dias","Notas fiscais, boletos e cobranças recorrentes via Pix","Gestão de contratos (CLM) básica com assinatura digital","CRM de vendas simples (1 funil, 50 leads ativos)","Command Bar (Ctrl/Cmd + K)","Suporte por ticket com IA"]'::jsonb,
  updated_at=now()
where code='startup';

update public.plans set
  name='Pro Scale', tagline='Tração & crescimento com automação bancária e projetos',
  audience='Empresas em expansão', badge='Mais Popular',
  price_monthly=149.90, price_yearly=1528.98,
  limits='{"workspaces":3,"users":15,"fiscal_docs":250,"ai_reads":200}'::jsonb,
  features='["Até 3 workspaces","Até 15 usuários com permissões avançadas","250 notas fiscais/mês","200 leituras de IA/mês + auditoria fiscal básica","Tudo do Startup","Conciliação bancária automática via Open Finance","Projetos (Kanban) com timesheet integrado ao faturamento","Previsão de caixa de 60 e 90 dias com alerta de riscos","Central de widgets arrasta-e-solta no dashboard","Consultas por texto via IA","Multimoedas com faturamento internacional"]'::jsonb,
  updated_at=now()
where code='pro';

update public.plans set
  name='Enterprise', tagline='Operações consolidadas, emissão ilimitada e auditoria contínua',
  audience='Empresas consolidadas, holdings e grupos operacionais',
  price_monthly=399.90, price_yearly=4078.98,
  limits='{"workspaces":10,"users":50,"fiscal_docs":null,"ai_reads":1000,"accountants":null}'::jsonb,
  features='["Até 10 workspaces","Até 50 usuários + acessos contábeis e de auditoria ilimitados","Notas fiscais ilimitadas","1.000 leituras de IA/mês + auditoria fiscal preventiva contínua","Tudo do Pro Scale","Visão consolidada de grupo econômico em tela única","CRM ilimitado com automação de propostas","Tradução dinâmica da interface por IA","Identidade visual e paleta personalizadas por workspace","Tela de login premium em glassmorphism com vídeo","Suporte prioritário com especialista"]'::jsonb,
  updated_at=now()
where code='enterprise';

update public.plans set
  name='Holding & Global', tagline='Corporativo sob medida, infraestrutura dedicada',
  audience='Redes, franquias, corporações globais e fundos', badge='Sob consulta',
  price_monthly=null, price_yearly=null,
  limits='{"workspaces":null,"users":null,"fiscal_docs":null,"ai_reads":null}'::jsonb,
  features='["Workspaces e usuários ilimitados","Instâncias de banco e servidores dedicados/isolados","API-first irrestrita com ERPs legados (SAP, TOTVS, Oracle)","Treinamento de modelo de IA exclusivo","Governança e SLA personalizados","Onboarding dedicado"]'::jsonb,
  updated_at=now()
where code='holding';
