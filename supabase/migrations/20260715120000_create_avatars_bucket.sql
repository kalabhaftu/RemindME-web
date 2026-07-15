insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Public access to avatars"
on storage.objects for select
to public
using ( bucket_id = 'avatars' );

create policy "Authenticated users can upload avatars"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'avatars' );

create policy "Users can update their own avatars"
on storage.objects for update
to authenticated
using ( bucket_id = 'avatars' );

create policy "Users can delete their own avatars"
on storage.objects for delete
to authenticated
using ( bucket_id = 'avatars' );
