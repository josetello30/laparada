-- Privilegios mínimos por tabla (la RLS filtra después las filas por rol). Principio de mínimo privilegio:
-- authenticated no puede borrar registros y anon solo lee el tarifario.
grant usage on schema public to anon, authenticated;
grant select, insert, update on perfiles, comerciantes, puestos, estibadores, tarifas,
  ordenes_estibaje, zonas, citas, inspecciones, incidencias to authenticated;
grant select on tarifas to anon;
grant usage, select on all sequences in schema public to authenticated;
