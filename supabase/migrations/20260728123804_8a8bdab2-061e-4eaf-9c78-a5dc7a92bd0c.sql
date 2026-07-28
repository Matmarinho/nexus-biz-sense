-- ======== DEMO TENANT ========
INSERT INTO public.tenants (id, legal_name, trade_name, tax_id, tax_id_kind, country, currency, segment, headcount, status, is_demo, plan_code, accent_color, theme)
VALUES ('00000000-0000-4000-8000-000000000001','Alpha Serviços Empresariais LTDA','Demo — Alpha Serviços','12.345.678/0001-90','cnpj','BR','BRL','Serviços profissionais','11-50','active',true,'pro','#8B5CF6','dark');

INSERT INTO public.subscriptions (tenant_id, plan_code, billing_cycle, status, current_period_start, current_period_end)
VALUES ('00000000-0000-4000-8000-000000000001','pro','yearly','active', CURRENT_DATE - 60, CURRENT_DATE + 305);

INSERT INTO public.bank_accounts (id, tenant_id, name, bank_name, account_type, opening_balance, color) VALUES
('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000001','Conta Movimento','Banco do Brasil','checking',85000,'#8B5CF6'),
('00000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000001','Reserva','Itaú','savings',120000,'#22C55E'),
('00000000-0000-4000-8000-000000000103','00000000-0000-4000-8000-000000000001','Caixa Interno',NULL,'cash',3500,'#F59E0B');

INSERT INTO public.financial_categories (id, tenant_id, name, kind, color) VALUES
('00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000001','Consultoria','income','#22C55E'),
('00000000-0000-4000-8000-000000000202','00000000-0000-4000-8000-000000000001','Implantação','income','#10B981'),
('00000000-0000-4000-8000-000000000203','00000000-0000-4000-8000-000000000001','Suporte recorrente','income','#14B8A6'),
('00000000-0000-4000-8000-000000000211','00000000-0000-4000-8000-000000000001','Pessoal','expense','#EF4444'),
('00000000-0000-4000-8000-000000000212','00000000-0000-4000-8000-000000000001','Tecnologia','expense','#8B5CF6'),
('00000000-0000-4000-8000-000000000213','00000000-0000-4000-8000-000000000001','Marketing','expense','#F59E0B'),
('00000000-0000-4000-8000-000000000214','00000000-0000-4000-8000-000000000001','Impostos','expense','#64748B'),
('00000000-0000-4000-8000-000000000215','00000000-0000-4000-8000-000000000001','Aluguel','expense','#0EA5E9'),
('00000000-0000-4000-8000-000000000216','00000000-0000-4000-8000-000000000001','Fornecedores','expense','#EC4899');

INSERT INTO public.cost_centers (id, tenant_id, name, code) VALUES
('00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000001','Operações','OPS'),
('00000000-0000-4000-8000-000000000302','00000000-0000-4000-8000-000000000001','Comercial','COM'),
('00000000-0000-4000-8000-000000000303','00000000-0000-4000-8000-000000000001','Administrativo','ADM');

INSERT INTO public.customers_vendors (id, tenant_id, type, name, tax_id, email, phone) VALUES
('00000000-0000-4000-8000-000000000401','00000000-0000-4000-8000-000000000001','customer','Northwind Indústria S/A','21.222.333/0001-11','financeiro@northwind.com.br','(11) 3555-1000'),
('00000000-0000-4000-8000-000000000402','00000000-0000-4000-8000-000000000001','customer','Beta Logística ME','33.444.555/0001-22','contas@betalog.com.br','(21) 3222-4400'),
('00000000-0000-4000-8000-000000000403','00000000-0000-4000-8000-000000000001','customer','Clínica Vitalis','44.555.666/0001-33','adm@vitalis.com.br','(31) 3111-7788'),
('00000000-0000-4000-8000-000000000404','00000000-0000-4000-8000-000000000001','customer','Grupo Meridiano','55.666.777/0001-44','pagamentos@meridiano.com','(11) 4002-8922'),
('00000000-0000-4000-8000-000000000411','00000000-0000-4000-8000-000000000001','vendor','CloudHost Brasil','66.777.888/0001-55','billing@cloudhost.com.br',NULL),
('00000000-0000-4000-8000-000000000412','00000000-0000-4000-8000-000000000001','vendor','Imobiliária Central','77.888.999/0001-66','locacao@central.com.br',NULL),
('00000000-0000-4000-8000-000000000413','00000000-0000-4000-8000-000000000001','vendor','Agência Pulso','88.999.000/0001-77','contato@pulso.ag',NULL);

-- 12 months of receitas
INSERT INTO public.financial_transactions (tenant_id, bank_account_id, party_id, category_id, cost_center_id, direction, status, amount, due_date, payment_date, description, doc_number, payment_method)
SELECT '00000000-0000-4000-8000-000000000001',
       '00000000-0000-4000-8000-000000000101',
       (ARRAY['00000000-0000-4000-8000-000000000401','00000000-0000-4000-8000-000000000402','00000000-0000-4000-8000-000000000403','00000000-0000-4000-8000-000000000404']::uuid[])[1 + ((m*3 + k) % 4)],
       (ARRAY['00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000202','00000000-0000-4000-8000-000000000203']::uuid[])[1 + (k % 3)],
       '00000000-0000-4000-8000-000000000302',
       'income',
       CASE WHEN d < CURRENT_DATE - 5 THEN 'paid' ELSE 'pending' END,
       ROUND((18000 + (m * 850) + ((m*7 + k*13) % 9) * 1900)::numeric, 2),
       d,
       CASE WHEN d < CURRENT_DATE - 5 THEN d + ((k % 4)) ELSE NULL END,
       (ARRAY['Consultoria mensal','Projeto de implantação','Suporte e sustentação','Horas extras de squad'])[1 + (k % 4)],
       'NFS-' || lpad(((m*4)+k)::text, 5, '0'),
       (ARRAY['pix','boleto','transferencia'])[1 + (k % 3)]
FROM generate_series(0, 11) m
CROSS JOIN generate_series(1, 4) k
CROSS JOIN LATERAL (SELECT (date_trunc('month', CURRENT_DATE) - (11 - m) * interval '1 month' + ((k * 6) - 1) * interval '1 day')::date AS d) x;

-- 12 months of despesas
INSERT INTO public.financial_transactions (tenant_id, bank_account_id, party_id, category_id, cost_center_id, direction, status, amount, due_date, payment_date, description, payment_method)
SELECT '00000000-0000-4000-8000-000000000001',
       '00000000-0000-4000-8000-000000000101',
       (ARRAY[NULL,'00000000-0000-4000-8000-000000000411','00000000-0000-4000-8000-000000000412','00000000-0000-4000-8000-000000000413',NULL,NULL]::uuid[])[k],
       (ARRAY['00000000-0000-4000-8000-000000000211','00000000-0000-4000-8000-000000000212','00000000-0000-4000-8000-000000000215','00000000-0000-4000-8000-000000000213','00000000-0000-4000-8000-000000000214','00000000-0000-4000-8000-000000000216']::uuid[])[k],
       (ARRAY['00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000303','00000000-0000-4000-8000-000000000302','00000000-0000-4000-8000-000000000303','00000000-0000-4000-8000-000000000301']::uuid[])[k],
       'expense',
       CASE WHEN d < CURRENT_DATE - 3 THEN 'paid' ELSE 'pending' END,
       ROUND((ARRAY[41000, 6200, 9800, 7400, 12500, 5300]::numeric[])[k] * (1 + (m * 0.011) + ((m + k) % 5) * 0.02), 2),
       d,
       CASE WHEN d < CURRENT_DATE - 3 THEN d ELSE NULL END,
       (ARRAY['Folha de pagamento','Infraestrutura e licenças','Aluguel do escritório','Campanhas e mídia','Impostos do período','Fornecedores diversos'])[k],
       (ARRAY['transferencia','cartao','boleto','cartao','boleto','pix'])[k]
FROM generate_series(0, 11) m
CROSS JOIN generate_series(1, 6) k
CROSS JOIN LATERAL (SELECT (date_trunc('month', CURRENT_DATE) - (11 - m) * interval '1 month' + ((k * 4) + 2) * interval '1 day')::date AS d) x;

-- inadimplência: recebíveis vencidos em aberto
INSERT INTO public.financial_transactions (tenant_id, bank_account_id, party_id, category_id, direction, status, amount, due_date, description, doc_number)
VALUES
('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000402','00000000-0000-4000-8000-000000000201','income','pending',14800.00, CURRENT_DATE - 38,'Consultoria — parcela 2/3','NFS-90021'),
('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000403','00000000-0000-4000-8000-000000000203','income','pending',6250.00, CURRENT_DATE - 17,'Suporte mensal','NFS-90022'),
('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000404','00000000-0000-4000-8000-000000000202','income','pending',22400.00, CURRENT_DATE - 9,'Implantação — marco 1','NFS-90023');

-- contas a pagar vencidas
INSERT INTO public.financial_transactions (tenant_id, bank_account_id, party_id, category_id, direction, status, amount, due_date, description)
VALUES
('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000413','00000000-0000-4000-8000-000000000213','expense','pending',7900.00, CURRENT_DATE - 6,'Campanha de performance — outubro');

INSERT INTO public.recurring_rules (tenant_id, direction, description, amount, frequency, day_of_month, category_id, party_id, bank_account_id) VALUES
('00000000-0000-4000-8000-000000000001','income','Suporte recorrente — Northwind',6250.00,'monthly',5,'00000000-0000-4000-8000-000000000203','00000000-0000-4000-8000-000000000401','00000000-0000-4000-8000-000000000101'),
('00000000-0000-4000-8000-000000000001','expense','Aluguel do escritório',9800.00,'monthly',10,'00000000-0000-4000-8000-000000000215','00000000-0000-4000-8000-000000000412','00000000-0000-4000-8000-000000000101');

INSERT INTO public.transfers (tenant_id, from_account_id, to_account_id, amount, transfer_date, description) VALUES
('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000102',30000, CURRENT_DATE - 20,'Aporte na reserva'),
('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000101',12000, CURRENT_DATE - 4,'Cobertura de folha');

INSERT INTO public.alerts (tenant_id, category, level, title, message) VALUES
('00000000-0000-4000-8000-000000000001','financial','critical','Três cobranças estão vencidas','Total de R$ 43.450,00 em recebíveis vencidos. O maior valor é do Grupo Meridiano.'),
('00000000-0000-4000-8000-000000000001','financial','important','Despesas de marketing cresceram 18%','O aumento se concentra em campanhas de performance no último mês.'),
('00000000-0000-4000-8000-000000000001','operational','attention','Concentração de pagamentos no dia 10','Cinco lançamentos vencem no mesmo dia, o que pode pressionar o caixa.'),
('00000000-0000-4000-8000-000000000001','system','info','Empresa de demonstração','Estes dados são fictícios e servem apenas para você explorar o sistema.');