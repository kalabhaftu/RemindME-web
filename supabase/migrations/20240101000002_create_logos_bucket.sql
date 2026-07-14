insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

create policy "Public access to logos"
on storage.objects for select
to public
using ( bucket_id = 'logos' );

create policy "Authenticated users can upload logos"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'logos' );
