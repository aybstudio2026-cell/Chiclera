# ChicleControl

Sistema para controlar el negocio de máquinas chicleras (React + Vite + Supabase).

## Pasos
1. `npm install`
2. `npm run dev` y abre la URL que muestra. Sin configurar nada funciona en **modo prueba** (datos en localStorage).
3. Crea un proyecto en https://supabase.com.
4. En Supabase: SQL Editor > New query > pega `supabase/schema.sql` > Run.
5. En Project Settings > API copia **Project URL** y la clave **anon public**.
6. Copia `.env.example` a `.env` y pega ambos valores:
   `VITE_SUPABASE_URL=...` y `VITE_SUPABASE_ANON_KEY=...`
7. Reinicia `npm run dev`. El menú lateral dirá "Conectado a Supabase".
8. Deploy (Vercel): importa el repo, agrega las dos variables de entorno y publica.

## Seguridad
Las políticas RLS del schema dan acceso abierto a quien tenga la anon key. Antes de publicar,
activa Supabase Auth y cambia `anon` por `authenticated` en las políticas.

## Reglas del negocio
- Ganancia = recaudo − chicles repuestos. Dueño: 10% mes 1, 15% mes 2, 20% desde el mes 3 (sobre la ganancia).
- Mi neta = ganancia − parte del dueño. Inversión recuperada por máquina = mi neta / costo de la máquina.
- Bolsa: 500 chicles a S/ 90. Chicle a S/ 1. Máquina S/ 310 (editable en cada pantalla).
