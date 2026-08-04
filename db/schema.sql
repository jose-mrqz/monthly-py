CREATE TABLE IF NOT EXISTS "schema_migrations" (version varchar(128) primary key);
CREATE TABLE user (
  id integer primary key autoincrement,
  username text not null,
  password text not null,
  created_at text default current_timestamp
);
CREATE TABLE tenant (
  id integer primary key autoincrement,
  tenant_name text,
  brand_name text,
  location_name text,
  document_number text,
  created_at text default current_timestamp
);
CREATE TABLE tenant_report_kind(
  id integer primary key autoincrement,
  tenant_id integer not null references tenant(id),
  report_kind_id integer not null references report_kind(id),
  created_at text default current_timestamp
);
CREATE TABLE report_kind (
  id integer primary key autoincrement,
  name text not null,
  display_name text not null
);
CREATE TABLE report (
  id integer primary key autoincrement,
  date text not null,
  amount real,
  transactions integer,
  modules_amount real,
  modules_transactions integer,
  tenant_id integer not null references tenant(id),
  report_kind_id integer not null references report_kind(id),
  created_at text default current_timestamp
);
CREATE UNIQUE INDEX report_tenant_date_unique
  on report (tenant_id, date);
CREATE TABLE record (
  id integer primary key autoincrement,
  report_id integer not null references report(id),
  date text not null,
  previous_amount real,
  amount real,
  previous_transactions integer,
  transactions integer,
  previous_modules_amount real,
  modules_amount real,
  previous_modules_transactions integer,
  modules_transactions integer,
  created_at text default current_timestamp,
  username text default 'system'
);
-- Dbmate schema migrations
INSERT INTO "schema_migrations" (version) VALUES
  ('20260714215645');
