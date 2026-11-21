-- Los procesos del servidor (sin sesión de usuario: migraciones, seed, service_role) pueden asignar roles;
-- desde el cliente solo un administrador.
create or replace function public.proteger_rol() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.rol is distinct from old.rol and auth.uid() is not null and not public.es_admin() then
    raise exception 'Solo un administrador puede cambiar roles';
  end if;
  return new;
end $$;
revoke execute on function public.rol_actual() from anon;
revoke execute on function public.es_admin() from anon;
