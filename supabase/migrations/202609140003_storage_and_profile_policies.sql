create policy "user reads own profile" on public.profiles for select using (id = auth.uid());

insert into storage.buckets (id, name, public) values
('products','products',true),('gallery','gallery',true),('categories','categories',true),('branding','branding',true),('custom-cakes','custom-cakes',false)
on conflict (id) do update set public = excluded.public;

create policy "public product assets" on storage.objects for select using (bucket_id in ('products','gallery','categories','branding'));
create policy "admin product assets" on storage.objects for all using (bucket_id in ('products','gallery','categories','branding') and public.is_admin()) with check (bucket_id in ('products','gallery','categories','branding') and public.is_admin());
create policy "staff custom cake read" on storage.objects for select using (bucket_id='custom-cakes' and public.is_staff());
create policy "custom cake upload" on storage.objects for insert with check (bucket_id='custom-cakes' and (auth.role() = 'authenticated' or auth.role() = 'anon'));
create policy "admin custom cake files" on storage.objects for all using (bucket_id='custom-cakes' and public.is_admin()) with check (bucket_id='custom-cakes' and public.is_admin());
