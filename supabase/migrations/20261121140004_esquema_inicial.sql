-- La Parada Digital · Esquema inicial (3FN) con Row Level Security
-- Entidades: perfiles, comerciantes, puestos, estibadores, tarifas, órdenes de estibaje,
-- zonas, citas de descarga, inspecciones e incidencias.

create extension if not exists pgcrypto;

-- ===================== Tipos =====================
create type rol_usuario      as enum ('admin','comerciante','estibador','fiscalizador','transportista');
create type tipo_documento   as enum ('DNI','RUC');
create type estado_formal    as enum ('pendiente','en_proceso','formalizado','observado');
create type estado_puesto    as enum ('disponible','ocupado');
create type estado_estibador as enum ('activo','suspendido');
create type estado_orden     as enum ('pendiente','aceptada','completada');
create type estado_cita      as enum ('reservada','en_mercado','finalizada');
create type resultado_insp   as enum ('conforme','no_conforme');
create type tipo_incidencia  as enum ('salubridad','seguridad','transito');
create type nivel_gravedad   as enum ('baja','media','alta');
create type nivel_prioridad  as enum ('baja','media','alta','critica');
create type estado_incid     as enum ('abierta','en_atencion','cerrada');

-- ===================== Tablas =====================
create table perfiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  nombre     text not null default '',
  email      text not null,
  rol        rol_usuario not null default 'comerciante',
  created_at timestamptz not null default now()
);

create table comerciantes (
  id               bigint generated always as identity primary key,
  user_id          uuid unique references perfiles(id) on delete set null,
  nombre_comercial text not null check (length(trim(nombre_comercial)) >= 3),
  tipo_doc         tipo_documento not null,
  num_doc          text not null unique,
  rubro            text not null,
  telefono         text not null check (telefono ~ '^9[0-9]{8}$'),
  estado           estado_formal not null default 'pendiente',
  observacion      text,
  created_at       timestamptz not null default now(),
  constraint doc_valido check (
    (tipo_doc = 'DNI' and num_doc ~ '^[0-9]{8}$') or
    (tipo_doc = 'RUC' and num_doc ~ '^(10|15|17|20)[0-9]{9}$'))
);

create table puestos (
  id             bigint generated always as identity primary key,
  codigo         text not null unique check (codigo ~ '^[A-Z]-[0-9]{3}$'),
  pabellon       text not null,
  rubro          text not null,
  estado         estado_puesto not null default 'disponible',
  comerciante_id bigint unique references comerciantes(id) on delete set null,
  created_at     timestamptz not null default now(),
  constraint ocupacion_coherente check (
    (estado = 'ocupado' and comerciante_id is not null) or
    (estado = 'disponible' and comerciante_id is null))
);

create table estibadores (
  id         bigint generated always as identity primary key,
  user_id    uuid unique references perfiles(id) on delete set null,
  nombre     text not null,
  dni        text not null unique check (dni ~ '^[0-9]{8}$'),
  carne      text not null unique default ('EST-' || upper(substr(md5(random()::text), 1, 6))),
  estado     estado_estibador not null default 'activo',
  created_at timestamptz not null default now()
);

create table tarifas (
  id         bigint generated always as identity primary key,
  tipo_carga text not null unique,
  unidad     text not null check (unidad in ('saco','jaba','caja')),
  monto      numeric(8,2) not null check (monto > 0)
);

create table ordenes_estibaje (
  id             bigint generated always as identity primary key,
  comerciante_id bigint not null references comerciantes(id),
  tarifa_id      bigint not null references tarifas(id),
  cantidad       int not null check (cantidad > 0 and cantidad <= 1000),
  monto          numeric(10,2) not null default 0,
  estado         estado_orden not null default 'pendiente',
  estibador_id   bigint references estibadores(id),
  created_at     timestamptz not null default now(),
  completada_at  timestamptz
);

create table zonas (
  id     bigint generated always as identity primary key,
  nombre text not null unique,
  aforo  int not null check (aforo between 1 and 100)
);

create table citas (
  id               bigint generated always as identity primary key,
  transportista_id uuid not null references perfiles(id),
  zona_id          bigint not null references zonas(id),
  fecha            date not null,
  franja           text not null check (franja in ('04:00-06:00','06:00-08:00','08:00-10:00','10:00-12:00')),
  placa            text not null check (placa ~ '^[A-Z0-9]{3}-[0-9]{3}$'),
  estado           estado_cita not null default 'reservada',
  ingreso_at       timestamptz,
  salida_at        timestamptz,
  created_at       timestamptz not null default now()
);

create table inspecciones (
  id              bigint generated always as identity primary key,
  puesto_id       bigint not null references puestos(id),
  fiscalizador_id uuid not null references perfiles(id),
  resultado       resultado_insp not null,
  observaciones   text not null default '',
  created_at      timestamptz not null default now()
);

create table incidencias (
  id            bigint generated always as identity primary key,
  tipo          tipo_incidencia not null,
  gravedad      nivel_gravedad not null,
  prioridad     nivel_prioridad not null default 'media',
  descripcion   text not null check (length(trim(descripcion)) >= 10),
  puesto_id     bigint references puestos(id),
  inspeccion_id bigint references inspecciones(id),
  reportado_por uuid not null references perfiles(id),
  estado        estado_incid not null default 'abierta',
  created_at    timestamptz not null default now()
);

create index on ordenes_estibaje (estado);
create index on ordenes_estibaje (estibador_id);
create index on citas (fecha, franja, zona_id);
create index on incidencias (estado, prioridad);

-- ===================== Funciones de apoyo =====================
-- Rol del usuario actual (security definer para evitar recursión en RLS)
create or replace function public.rol_actual() returns rol_usuario
language sql stable security definer set search_path = public as $$
  select rol from perfiles where id = auth.uid()
$$;

create or replace function public.es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select rol = 'admin' from perfiles where id = auth.uid()), false)
$$;

-- Perfil automático al registrarse (rol comerciante por defecto)
create or replace function public.crear_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into perfiles (id, email, nombre)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email,'@',1)));
  return new;
end $$;
create trigger al_crear_usuario after insert on auth.users
  for each row execute function public.crear_perfil();

-- Solo un admin puede cambiar roles (defensa adicional a la RLS)
create or replace function public.proteger_rol() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.rol is distinct from old.rol and not public.es_admin() then
    raise exception 'Solo un administrador puede cambiar roles';
  end if;
  return new;
end $$;
create trigger proteger_rol before update on perfiles
  for each row execute function public.proteger_rol();

-- Monto de la orden calculado en servidor con la tarifa oficial (no confiable desde el cliente)
create or replace function public.calcular_monto_orden() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select t.monto * new.cantidad into new.monto from tarifas t where t.id = new.tarifa_id;
  return new;
end $$;
create trigger monto_orden before insert or update of cantidad, tarifa_id on ordenes_estibaje
  for each row execute function public.calcular_monto_orden();

-- Aforo máximo por zona, fecha y franja
create or replace function public.validar_aforo() returns trigger
language plpgsql security definer set search_path = public as $$
declare ocupados int; maximo int;
begin
  select aforo into maximo from zonas where id = new.zona_id;
  select count(*) into ocupados from citas
   where zona_id = new.zona_id and fecha = new.fecha and franja = new.franja and estado <> 'finalizada';
  if ocupados >= maximo then
    raise exception 'Franja llena';
  end if;
  return new;
end $$;
create trigger aforo_cita before insert on citas
  for each row execute function public.validar_aforo();

-- Inspección no conforme => incidencia de salubridad automática
create or replace function public.incidencia_por_inspeccion() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.resultado = 'no_conforme' then
    insert into incidencias (tipo, gravedad, prioridad, descripcion, puesto_id, inspeccion_id, reportado_por)
    values ('salubridad', 'alta', 'alta',
            'Inspección no conforme: ' || coalesce(nullif(new.observaciones,''), 'sin observaciones'),
            new.puesto_id, new.id, new.fiscalizador_id);
  end if;
  return new;
end $$;
create trigger insp_no_conforme after insert on inspecciones
  for each row execute function public.incidencia_por_inspeccion();

-- Consulta pública: solo formalizados y sin datos sensibles (sin documento ni teléfono)
create or replace function public.comerciantes_publicos(p_rubro text default null)
returns table (nombre_comercial text, rubro text, puesto text, pabellon text)
language sql stable security definer set search_path = public as $$
  select c.nombre_comercial, c.rubro, p.codigo, p.pabellon
    from comerciantes c left join puestos p on p.comerciante_id = c.id
   where c.estado = 'formalizado'
     and (p_rubro is null or p_rubro = '' or c.rubro = p_rubro)
   order by c.nombre_comercial
$$;

-- ===================== Row Level Security =====================
alter table perfiles         enable row level security;
alter table comerciantes     enable row level security;
alter table puestos          enable row level security;
alter table estibadores      enable row level security;
alter table tarifas          enable row level security;
alter table ordenes_estibaje enable row level security;
alter table zonas            enable row level security;
alter table citas            enable row level security;
alter table inspecciones     enable row level security;
alter table incidencias      enable row level security;

-- perfiles
create policy perfil_ver on perfiles for select to authenticated
  using (id = auth.uid() or public.rol_actual() in ('admin','fiscalizador'));
create policy perfil_admin_actualiza on perfiles for update to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- comerciantes
create policy com_ver on comerciantes for select to authenticated
  using (user_id = auth.uid() or public.rol_actual() in ('admin','fiscalizador','estibador'));
create policy com_registrar on comerciantes for insert to authenticated
  with check ((user_id = auth.uid() and estado = 'pendiente') or public.es_admin());
create policy com_admin_actualiza on comerciantes for update to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- puestos
create policy puesto_ver on puestos for select to authenticated using (true);
create policy puesto_admin on puestos for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- estibadores
create policy est_ver on estibadores for select to authenticated using (true);
create policy est_admin on estibadores for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- tarifas (tarifario público)
create policy tarifa_ver on tarifas for select to anon, authenticated using (true);
create policy tarifa_admin on tarifas for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- órdenes de estibaje
create policy ord_ver on ordenes_estibaje for select to authenticated using (
  public.rol_actual() in ('admin','fiscalizador')
  or comerciante_id in (select id from comerciantes where user_id = auth.uid())
  or (public.rol_actual() = 'estibador' and (estado = 'pendiente'
      or estibador_id in (select id from estibadores where user_id = auth.uid()))));
create policy ord_solicitar on ordenes_estibaje for insert to authenticated with check (
  estado = 'pendiente' and estibador_id is null and
  comerciante_id in (select c.id from comerciantes c join puestos p on p.comerciante_id = c.id
                      where c.user_id = auth.uid()));
create policy ord_atender on ordenes_estibaje for update to authenticated
  using (public.es_admin() or (public.rol_actual() = 'estibador' and (estado = 'pendiente'
         or estibador_id in (select id from estibadores where user_id = auth.uid()))))
  with check (public.es_admin() or estibador_id in
         (select id from estibadores where user_id = auth.uid() and estado = 'activo'));

-- zonas
create policy zona_ver on zonas for select to authenticated using (true);
create policy zona_admin on zonas for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- citas
create policy cita_ver on citas for select to authenticated
  using (transportista_id = auth.uid() or public.rol_actual() in ('admin','fiscalizador'));
create policy cita_reservar on citas for insert to authenticated
  with check (transportista_id = auth.uid() and estado = 'reservada'
              and public.rol_actual() in ('transportista','admin'));
create policy cita_control on citas for update to authenticated
  using (public.rol_actual() in ('admin','fiscalizador'))
  with check (public.rol_actual() in ('admin','fiscalizador'));

-- inspecciones
create policy insp_ver on inspecciones for select to authenticated
  using (public.rol_actual() in ('admin','fiscalizador'));
create policy insp_registrar on inspecciones for insert to authenticated
  with check (fiscalizador_id = auth.uid() and public.rol_actual() in ('admin','fiscalizador'));

-- incidencias
create policy inc_ver on incidencias for select to authenticated
  using (reportado_por = auth.uid() or public.rol_actual() in ('admin','fiscalizador'));
create policy inc_reportar on incidencias for insert to authenticated
  with check (reportado_por = auth.uid() and estado = 'abierta');
create policy inc_seguimiento on incidencias for update to authenticated
  using (public.rol_actual() in ('admin','fiscalizador'))
  with check (public.rol_actual() in ('admin','fiscalizador'));

-- Permisos de ejecución
revoke execute on function public.comerciantes_publicos(text) from public;
grant execute on function public.comerciantes_publicos(text) to anon, authenticated;
