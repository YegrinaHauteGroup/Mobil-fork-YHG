insert into storage.buckets (id, name, public) values ('files', 'files', false);

create policy storage_files_insert on storage.objects for insert
with check (
  bucket_id = 'files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy storage_files_select on storage.objects for select
using (
  bucket_id = 'files'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1 from public.files f
      join public.file_permissions fp on fp.file_id = f.id
      where f.storage_path = name and fp.user_id = auth.uid()
    )
    or public.is_admin()
  )
);

create policy storage_files_delete on storage.objects for delete
using (
  bucket_id = 'files'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);
