-- Datos de prueba · La Parada Digital
-- Cuentas demo (contraseña de todas: Parada2026!)
do $$
declare
  u record;
begin
  for u in select * from (values
    ('11111111-1111-1111-1111-111111111111'::uuid, 'admin@laparada.pe',         'Admin Municipal',     'admin'),
    ('22222222-2222-2222-2222-222222222222'::uuid, 'comerciante@laparada.pe',   'Rosa Quispe',         'comerciante'),
    ('33333333-3333-3333-3333-333333333333'::uuid, 'estibador@laparada.pe',     'Juan Mamani',         'estibador'),
    ('44444444-4444-4444-4444-444444444444'::uuid, 'fiscalizador@laparada.pe',  'Carla Huamán',        'fiscalizador'),
    ('55555555-5555-5555-5555-555555555555'::uuid, 'transportista@laparada.pe', 'Pedro Condori',       'transportista')
  ) as t(id, email, nombre, rol)
  loop
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                            raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                            confirmation_token, recovery_token, email_change_token_new, email_change)
    values ('00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
            crypt('Parada2026!', gen_salt('bf')), now(),
            '{"provider":"email","providers":["email"]}', jsonb_build_object('nombre', u.nombre),
            now(), now(), '', '', '', '')
    on conflict (id) do nothing;
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), u.id, u.id::text,
            jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
            'email', now(), now(), now())
    on conflict do nothing;
    update perfiles set rol = u.rol::rol_usuario, nombre = u.nombre where id = u.id;
  end loop;
end $$;

insert into comerciantes (user_id, nombre_comercial, tipo_doc, num_doc, rubro, telefono, estado) values
  ('22222222-2222-2222-2222-222222222222', 'Frutas Rosa', 'RUC', '10456789123', 'Frutas', '987654321', 'formalizado'),
  (null, 'Papas Don Lucho',     'DNI', '45678912', 'Tubérculos', '912345678', 'formalizado'),
  (null, 'Verduras La Huerta',  'RUC', '20601234567', 'Verduras', '923456789', 'en_proceso'),
  (null, 'Cítricos del Norte',  'DNI', '41234567', 'Frutas', '934567890', 'pendiente'),
  (null, 'Distribuidora Andina','RUC', '20512345678', 'Tubérculos', '945678901', 'observado'),
  (null, 'Mercado Verde SAC',   'RUC', '20587654321', 'Verduras', '956789012', 'formalizado');
update comerciantes set observacion = 'Falta licencia municipal de funcionamiento' where num_doc = '20512345678';

insert into puestos (codigo, pabellon, rubro) values
  ('A-101','Pabellón A','Frutas'), ('A-102','Pabellón A','Frutas'), ('A-103','Pabellón A','Frutas'),
  ('B-201','Pabellón B','Tubérculos'), ('B-202','Pabellón B','Tubérculos'),
  ('C-301','Pabellón C','Verduras'), ('C-302','Pabellón C','Verduras'), ('C-303','Pabellón C','Verduras');
update puestos set estado='ocupado', comerciante_id=(select id from comerciantes where num_doc='10456789123') where codigo='A-101';
update puestos set estado='ocupado', comerciante_id=(select id from comerciantes where num_doc='45678912')   where codigo='B-201';
update puestos set estado='ocupado', comerciante_id=(select id from comerciantes where num_doc='20587654321') where codigo='C-301';

insert into estibadores (user_id, nombre, dni, carne, estado) values
  ('33333333-3333-3333-3333-333333333333', 'Juan Mamani', '47896541', 'EST-0001', 'activo'),
  (null, 'Luis Ccahuana', '46325874', 'EST-0002', 'activo'),
  (null, 'Mario Ticona',  '43698521', 'EST-0003', 'activo'),
  (null, 'Víctor Apaza',  '42587413', 'EST-0004', 'suspendido');

insert into tarifas (tipo_carga, unidad, monto) values
  ('Papa (saco 50 kg)', 'saco', 1.50),
  ('Fruta en jaba',     'jaba', 1.00),
  ('Verdura en caja',   'caja', 0.80),
  ('Cebolla (saco 50 kg)', 'saco', 1.20);

insert into ordenes_estibaje (comerciante_id, tarifa_id, cantidad, estado, estibador_id, completada_at)
select c.id, t.id, x.cant, x.est::estado_orden, e.id, case when x.est='completada' then now() - interval '2 days' end
from (values
  ('10456789123','Fruta en jaba',40,'completada','EST-0001'),
  ('10456789123','Fruta en jaba',25,'aceptada','EST-0001'),
  ('45678912','Papa (saco 50 kg)',60,'completada','EST-0002'),
  ('45678912','Papa (saco 50 kg)',30,'pendiente',null),
  ('20587654321','Verdura en caja',80,'completada','EST-0003'),
  ('20587654321','Verdura en caja',20,'pendiente',null)
) as x(doc, carga, cant, est, carne)
join comerciantes c on c.num_doc = x.doc
join tarifas t on t.tipo_carga = x.carga
left join estibadores e on e.carne = x.carne;

insert into zonas (nombre, aforo) values ('Zona Norte - Frutas', 3), ('Zona Sur - Tubérculos', 3), ('Zona Este - Verduras', 2);

insert into citas (transportista_id, zona_id, fecha, franja, placa, estado)
select '55555555-5555-5555-5555-555555555555', z.id, current_date + 1, x.franja, x.placa, 'reservada'
from (values ('Zona Norte - Frutas','04:00-06:00','ABC-123'),
             ('Zona Sur - Tubérculos','06:00-08:00','B7K-456'),
             ('Zona Este - Verduras','04:00-06:00','C2M-789')) as x(zona, franja, placa)
join zonas z on z.nombre = x.zona;

insert into inspecciones (puesto_id, fiscalizador_id, resultado, observaciones)
select p.id, '44444444-4444-4444-4444-444444444444', x.res::resultado_insp, x.obs
from (values ('A-101','conforme','Puesto limpio, productos en jabas sobre tarimas'),
             ('B-201','no_conforme','Acumulación de residuos orgánicos junto al puesto'),
             ('C-301','conforme','Cumple con manipulación de alimentos')) as x(cod, res, obs)
join puestos p on p.codigo = x.cod;

insert into incidencias (tipo, gravedad, prioridad, descripcion, puesto_id, reportado_por, estado)
select x.tipo::tipo_incidencia, x.grav::nivel_gravedad, x.prio::nivel_prioridad, x.descr, p.id, x.por::uuid, x.est::estado_incid
from (values
  ('seguridad','alta','critica','Persona exigiendo pago de cupo a estibadores en la puerta 3','A-101','22222222-2222-2222-2222-222222222222','en_atencion'),
  ('transito','media','media','Camión estacionado en doble fila bloqueando el ingreso norte',null,'44444444-4444-4444-4444-444444444444','abierta'),
  ('salubridad','baja','baja','Falta de tachos de basura en el pasillo del pabellón C','C-301','44444444-4444-4444-4444-444444444444','cerrada')
) as x(tipo, grav, prio, descr, cod, por, est)
left join puestos p on p.codigo = x.cod;
