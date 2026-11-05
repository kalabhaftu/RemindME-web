insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

drop policy if exists "Public access to logos" on storage.objects;
create policy "Public access to logos"
on storage.objects for select
to public
using ( bucket_id = 'logos' );

drop policy if exists "Authenticated users can upload logos" on storage.objects;
create policy "Authenticated users can upload logos"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'logos' );
