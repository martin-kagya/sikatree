-- Single-operator admin credential. The password is a salted scrypt hash,
-- never plaintext and never a build-time environment variable. Rotate it by
-- updating password_hash with a new hash from lib/password.ts.
create table if not exists admin_credential (
  id integer primary key check (id = 1),
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into admin_credential (id, password_hash)
values (1, 'scrypt$a151bcd29e73b774b719ca80f53868ad$84ee84f3e8e27f979c857fda810fe7a35d82386e344d83c1e2ee9464513a8725b8c623cd13ebc8dabc2992b4a139478a720b3450f44196fc6e47d19af952d32b')
on conflict (id) do nothing;
