-- auth_rls_initplan 성능 경고 수정: RLS 정책 안에서 auth.uid() 를 직접 부르면
-- 매 행마다 재평가된다. (select auth.uid()) 로 감싸면 플래너가 InitPlan 으로
-- 한 번만 평가하도록 최적화한다. 동작(허용/거부 결과)은 동일 — 순수 성능 수정.

alter policy ai_conversations_delete on public.ai_conversations
  using (owner_id = (select auth.uid()));

alter policy ai_conversations_insert on public.ai_conversations
  with check (owner_id = (select auth.uid()));

alter policy ai_conversations_select on public.ai_conversations
  using (owner_id = (select auth.uid()) or is_admin());

alter policy ai_conversations_update on public.ai_conversations
  using (owner_id = (select auth.uid()));

alter policy ai_messages_delete on public.ai_messages
  using (exists (
    select 1 from public.ai_conversations c
    where c.id = ai_messages.conversation_id and c.owner_id = (select auth.uid())
  ));

alter policy ai_messages_insert on public.ai_messages
  with check (exists (
    select 1 from public.ai_conversations c
    where c.id = ai_messages.conversation_id and c.owner_id = (select auth.uid())
  ));

alter policy ai_messages_select on public.ai_messages
  using (exists (
    select 1 from public.ai_conversations c
    where c.id = ai_messages.conversation_id
      and (c.owner_id = (select auth.uid()) or is_admin())
  ));

alter policy audit_logs_insert_own on public.audit_logs
  with check (user_id = (select auth.uid()));

alter policy code_file_permissions_select on public.code_file_permissions
  using (user_id = (select auth.uid()) or is_code_file_owner(code_file_id) or is_admin());

alter policy code_files_delete on public.code_files
  using (owner_id = (select auth.uid()) or is_admin());

alter policy code_files_insert on public.code_files
  with check (owner_id = (select auth.uid()));

alter policy code_files_select on public.code_files
  using (
    owner_id = (select auth.uid())
    or is_public = true
    or exists (
      select 1 from public.code_file_permissions cp
      where cp.code_file_id = code_files.id and cp.user_id = (select auth.uid())
    )
    or is_admin()
  );

alter policy code_files_update on public.code_files
  using (
    owner_id = (select auth.uid())
    or exists (
      select 1 from public.code_file_permissions cp
      where cp.code_file_id = code_files.id and cp.user_id = (select auth.uid()) and cp.permission = 'edit'
    )
    or is_admin()
  );

alter policy document_permissions_select on public.document_permissions
  using (user_id = (select auth.uid()) or is_document_owner(document_id) or is_admin());

alter policy documents_delete on public.documents
  using (owner_id = (select auth.uid()) or is_admin());

alter policy documents_insert on public.documents
  with check (owner_id = (select auth.uid()));

alter policy documents_select on public.documents
  using (
    owner_id = (select auth.uid())
    or is_public = true
    or exists (
      select 1 from public.document_permissions dp
      where dp.document_id = documents.id and dp.user_id = (select auth.uid())
    )
    or is_admin()
  );

alter policy documents_update on public.documents
  using (
    owner_id = (select auth.uid())
    or exists (
      select 1 from public.document_permissions dp
      where dp.document_id = documents.id and dp.user_id = (select auth.uid()) and dp.permission = 'edit'
    )
    or is_admin()
  );

alter policy file_permissions_select on public.file_permissions
  using (user_id = (select auth.uid()) or is_file_owner(file_id) or is_admin());

alter policy files_delete on public.files
  using (owner_id = (select auth.uid()) or is_admin());

alter policy files_insert on public.files
  with check (owner_id = (select auth.uid()));

alter policy files_select on public.files
  using (
    owner_id = (select auth.uid())
    or is_public = true
    or exists (
      select 1 from public.file_permissions fp
      where fp.file_id = files.id and fp.user_id = (select auth.uid())
    )
    or is_admin()
  );

alter policy files_update on public.files
  using (owner_id = (select auth.uid()) or is_admin());

alter policy mind_map_permissions_select on public.mind_map_permissions
  using (user_id = (select auth.uid()) or is_mind_map_owner(mind_map_id) or is_admin());

alter policy mind_maps_delete on public.mind_maps
  using (owner_id = (select auth.uid()) or is_admin());

alter policy mind_maps_insert on public.mind_maps
  with check (owner_id = (select auth.uid()));

alter policy mind_maps_select on public.mind_maps
  using (
    owner_id = (select auth.uid())
    or is_public = true
    or exists (
      select 1 from public.mind_map_permissions mp
      where mp.mind_map_id = mind_maps.id and mp.user_id = (select auth.uid())
    )
    or is_admin()
  );

alter policy mind_maps_update on public.mind_maps
  using (
    owner_id = (select auth.uid())
    or exists (
      select 1 from public.mind_map_permissions mp
      where mp.mind_map_id = mind_maps.id and mp.user_id = (select auth.uid()) and mp.permission = 'edit'
    )
    or is_admin()
  );

alter policy profiles_select on public.profiles
  using (id = (select auth.uid()) or is_admin());

alter policy profiles_update_own on public.profiles
  using (id = (select auth.uid()));

alter policy sheet_permissions_select on public.sheet_permissions
  using (user_id = (select auth.uid()) or is_sheet_owner(sheet_id) or is_admin());

alter policy sheets_delete on public.sheets
  using (owner_id = (select auth.uid()) or is_admin());

alter policy sheets_insert on public.sheets
  with check (owner_id = (select auth.uid()));

alter policy sheets_select on public.sheets
  using (
    owner_id = (select auth.uid())
    or is_public = true
    or exists (
      select 1 from public.sheet_permissions sp
      where sp.sheet_id = sheets.id and sp.user_id = (select auth.uid())
    )
    or is_admin()
  );

alter policy sheets_update on public.sheets
  using (
    owner_id = (select auth.uid())
    or exists (
      select 1 from public.sheet_permissions sp
      where sp.sheet_id = sheets.id and sp.user_id = (select auth.uid()) and sp.permission = 'edit'
    )
    or is_admin()
  );
