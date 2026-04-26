-- ============================================================
-- Trigger: crear perfil automáticamente cuando se registra un nuevo usuario
-- ============================================================
-- Este trigger se ejecuta DESPUÉS de cada INSERT en auth.users.
-- Captura el nuevo usuario y crea un registro correspondiente
-- en la tabla public.profiles con los datos disponibles.
-- ============================================================

-- Idempotencia: eliminar trigger y función si ya existen
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Función que inserta en profiles cuando se crea un user en auth.users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger en auth.users que llama a la función
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
