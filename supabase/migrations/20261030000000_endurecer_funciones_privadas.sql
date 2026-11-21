-- Hallazgos del linter de seguridad de Supabase: funciones SECURITY DEFINER expuestas por la API REST.
-- Se mueven a un esquema privado (no expuesto por PostgREST). Las políticas RLS y los triggers
-- referencian las funciones por OID, por lo que siguen funcionando.
create schema if not exists privado;
revoke all on schema privado from public, anon;
grant usage on schema privado to authenticated;

alter function public.rol_actual() set schema privado;
alter function public.es_admin() set schema privado;
alter function public.crear_perfil() set schema privado;
alter function public.proteger_rol() set schema privado;
alter function public.calcular_monto_orden() set schema privado;
alter function public.validar_aforo() set schema privado;
alter function public.incidencia_por_inspeccion() set schema privado;

revoke execute on all functions in schema privado from public, anon, authenticated;
grant execute on function privado.rol_actual(), privado.es_admin() to authenticated;

create or replace function privado.proteger_rol() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.rol is distinct from old.rol and auth.uid() is not null and not privado.es_admin() then
    raise exception 'Solo un administrador puede cambiar roles';
  end if;
  return new;
end $$;
revoke execute on function privado.proteger_rol() from public, anon, authenticated;
