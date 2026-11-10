-- Email becomes a second identity for a vendor: signing up from the web and
-- signing back in without WhatsApp. Phone stays the unique shop identity, so
-- the bot and the web path cannot create two shops for one number.
alter table vendors add column email text;

create unique index if not exists vendors_email_unique
  on vendors (lower(email))
  where email is not null;
