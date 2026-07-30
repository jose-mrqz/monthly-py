-- migrate:up
insert into report_kind (id, name, display_name) values
(1, 'monthly', 'Monto y transacciones'),
(2, 'monthly_amount_only', 'Solo monto'),
(3, 'monthly_with_modules', 'Monto y transacciones con módulos'),
(4, 'monthly_daily', 'Monto y transacciones diarias');

insert into tenant (id, tenant_name, brand_name, location_name, document_number) values
(1, 'Tenant 1', 'Brand A', 'Location X', 'DOC123'),
(2, 'Tenant 2', 'Brand B', 'Location Y', 'DOC456'),
(3, 'Tenant 3', 'Brand C', 'Location Z', 'DOC789'),
(4, 'Tenant 4', 'Brand D', 'Location W', 'DOC012');

insert into tenant_report_kind (tenant_id, report_kind_id) values
(1, 1),
(2, 2),
(3, 3),
(4, 4);


-- migrate:down

