-- Run this once in Neon's SQL editor, AFTER 001_users.sql.
-- Creates your own manager login so you can sign in and then create
-- everyone else's account from the /admin/users page.
--
-- Starting password: ChangeMe123!
-- Sign in with it once, then it's a good idea to create a fresh account
-- for yourself with a password only you know (delete this one after).

insert into users (email, password_hash, name, role)
values (
  'sookyan@easystore.co',
  '$2a$10$CavlmiglDi2l4I7OmJ3iAuhT2OLneYuPHky3d49tznnGpJcQ049M.',
  'Sook Yan',
  'manager'
)
on conflict (email) do nothing;
