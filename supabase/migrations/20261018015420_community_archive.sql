-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

SET check_function_bodies = false;

CREATE FUNCTION public.archive_entry_guard()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
 if TG_OP='UPDATE' and OLD.ever_published and NEW.slug <> OLD.slug then raise exception 'La URL publicada es permanente'; end if;
 NEW.ever_published := NEW.status='published' or (TG_OP='UPDATE' and OLD.ever_published);
 if NEW.status='published' and exists(select 1 from public.archive_assets where entry_id=NEW.id and state='ready' and (btrim(caption)='' or btrim(credit)='')) then raise exception 'Completar leyendas y créditos antes de publicar'; end if;
 NEW.updated_at := now(); return NEW;
end $function$;

GRANT ALL ON FUNCTION public.archive_entry_guard() TO service_role;

CREATE FUNCTION public.begin_archive_backup (
  p_run_id text
)
  RETURNS void
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
 perform 1 from public.archive_media_state where id=1 for update;
 if exists(select 1 from public.archive_media_state where backup_expires_at>now()) then raise exception 'Hay un respaldo en curso'; end if;
 if p_run_id is null or length(p_run_id) not between 1 and 100 then raise exception 'Run ID inválido'; end if;
 update public.archive_media_state set backup_run_id=p_run_id,backup_expires_at=now()+interval '30 minutes' where id=1;
end $function$;

GRANT ALL ON FUNCTION public.begin_archive_backup(text) TO service_role;

CREATE FUNCTION public.claim_archive_cleanup()
  RETURNS TABLE (
    id           uuid,
    storage_path text
  )
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
declare until_time timestamptz;
begin
 select backup_expires_at into until_time from public.archive_media_state where archive_media_state.id=1 for update;
 if until_time > now() then return; end if;
 return query update public.archive_assets a set state='deleting' where a.state in ('deleted','deleting') or (a.state='reserved' and a.created_at < now()-interval '1 hour') returning a.id,a.storage_path;
end $function$;

GRANT ALL ON FUNCTION public.claim_archive_cleanup() TO service_role;

CREATE FUNCTION public.end_archive_backup (
  p_run_id text
)
  RETURNS void
  LANGUAGE sql
  SET search_path TO ''
  AS $function$
 update public.archive_media_state set backup_run_id=null,backup_expires_at=null where id=1 and backup_run_id=p_run_id;
$function$;

GRANT ALL ON FUNCTION public.end_archive_backup(text) TO service_role;

CREATE FUNCTION public.finalize_archive_asset (
  p_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
declare asset public.archive_assets;
begin
 perform 1 from public.archive_entries where id=(select entry_id from public.archive_assets where id=p_id) for update;
 select * into asset from public.archive_assets where id=p_id for update;
 if asset.id is null or asset.state<>'reserved' then raise exception 'Reserva inválida'; end if;
 if not exists(select 1 from storage.objects where bucket_id='archive-media' and name=asset.storage_path and (metadata->>'size')::bigint=asset.bytes) then raise exception 'Objeto ausente o tamaño incorrecto'; end if;
 if exists(select 1 from public.archive_entries where id=asset.entry_id and status='published') and (btrim(asset.caption)='' or btrim(asset.credit)='') then raise exception 'Completar leyenda y crédito'; end if;
 update public.archive_assets set state='ready' where id=p_id;
end $function$;

GRANT ALL ON FUNCTION public.finalize_archive_asset(uuid) TO service_role;

CREATE FUNCTION public.finish_archive_cleanup (
  p_ids uuid[]
)
  RETURNS void
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
 perform 1 from public.archive_media_state where id=1 for update;
 delete from public.archive_assets where id=any(p_ids) and state='deleting';
end $function$;

GRANT ALL ON FUNCTION public.finish_archive_cleanup(uuid[]) TO service_role;

CREATE FUNCTION public.reorder_archive_assets (
  p_entry_id uuid,
  p_ids      uuid[]
)
  RETURNS void
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
 perform 1 from public.archive_entries where id=p_entry_id for update;
 if cardinality(p_ids)<>(select count(*) from public.archive_assets where entry_id=p_entry_id and state='ready') or cardinality(p_ids)<>(select count(distinct x) from unnest(p_ids) x) or exists(select 1 from unnest(p_ids) x where not exists(select 1 from public.archive_assets where id=x and entry_id=p_entry_id and state='ready')) then raise exception 'Lista de imágenes inválida'; end if;
 update public.archive_assets a set sort_order=u.n-1 from unnest(p_ids) with ordinality u(id,n) where a.id=u.id and a.entry_id=p_entry_id;
end $function$;

GRANT ALL ON FUNCTION public.reorder_archive_assets(uuid, uuid[]) TO service_role;

CREATE FUNCTION public.retire_archive_asset (
  p_entry_id uuid,
  p_id       uuid
)
  RETURNS void
  LANGUAGE sql
  SET search_path TO ''
  AS $function$
 update public.archive_assets set state='deleted' where id=p_id and entry_id=p_entry_id and state in ('ready','reserved');
$function$;

GRANT ALL ON FUNCTION public.retire_archive_asset(uuid, uuid) TO service_role;

CREATE TABLE public.archive_assets (
  id           uuid                     DEFAULT gen_random_uuid() NOT NULL,
  entry_id     uuid                     NOT NULL,
  storage_path text                     NOT NULL,
  mime         text                     NOT NULL,
  bytes        integer                  NOT NULL,
  width        integer                  NOT NULL,
  height       integer                  NOT NULL,
  caption      text                     DEFAULT ''::text NOT NULL,
  credit       text                     DEFAULT ''::text NOT NULL,
  sort_order   integer                  DEFAULT 0 NOT NULL,
  state        text                     DEFAULT 'reserved'::text NOT NULL,
  created_at   timestamp with time zone DEFAULT now() NOT NULL
);

CREATE FUNCTION public.reserve_archive_asset (
  p_entry_id uuid,
  p_mime     text,
  p_bytes    integer,
  p_width    integer,
  p_height   integer,
  p_caption  text    DEFAULT ''::text,
  p_credit   text    DEFAULT ''::text
)
  RETURNS SETOF public.archive_assets
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
declare asset_id uuid := gen_random_uuid(); budget bigint; total bigint;
begin
 select limit_bytes into budget from public.archive_media_state where id=1 for update;
 select coalesce(sum(bytes),0) into total from public.archive_assets;
 if p_bytes < 1 or p_bytes > 2097152 or total+p_bytes > budget then raise exception 'Presupuesto de medios agotado'; end if;
 return query insert into public.archive_assets(id,entry_id,storage_path,mime,bytes,width,height,caption,credit,sort_order)
 values(asset_id,p_entry_id,p_entry_id::text || '/' || asset_id::text || case p_mime when 'image/jpeg' then '.jpg' when 'image/png' then '.png' else '.webp' end,p_mime,p_bytes,p_width,p_height,p_caption,p_credit,coalesce((select max(sort_order)+1 from public.archive_assets where entry_id=p_entry_id and state='ready'),0)) returning *;
end $function$;

GRANT ALL ON FUNCTION public.reserve_archive_asset(uuid, text, integer, integer, integer, text, text) TO service_role;

ALTER TABLE public.archive_assets
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.archive_assets
  ADD CONSTRAINT archive_assets_bytes_check CHECK (bytes >= 1 AND bytes <= 2097152);

ALTER TABLE public.archive_assets
  ADD CONSTRAINT archive_assets_caption_check CHECK (length(caption) <= 500);

ALTER TABLE public.archive_assets
  ADD CONSTRAINT archive_assets_check CHECK ((width::bigint * height::bigint) <= 20000000);

ALTER TABLE public.archive_assets
  ADD CONSTRAINT archive_assets_check1 CHECK (storage_path = (((entry_id::text || '/'::text) || id::text) ||
CASE mime
    WHEN 'image/jpeg'::text THEN '.jpg'::text
    WHEN 'image/png'::text THEN '.png'::text
    ELSE '.webp'::text
END));

ALTER TABLE public.archive_assets
  ADD CONSTRAINT archive_assets_credit_check CHECK (length(credit) <= 200);

ALTER TABLE public.archive_assets
  ADD CONSTRAINT archive_assets_height_check CHECK (height >= 1 AND height <= 20000000);

ALTER TABLE public.archive_assets
  ADD CONSTRAINT archive_assets_mime_check CHECK (mime = ANY (ARRAY['image/jpeg'::text, 'image/png'::text, 'image/webp'::text]));

ALTER TABLE public.archive_assets
  ADD CONSTRAINT archive_assets_pkey PRIMARY KEY (id);

ALTER TABLE public.archive_assets
  ADD CONSTRAINT archive_assets_sort_order_check CHECK (sort_order >= 0 AND sort_order <= 999);

ALTER TABLE public.archive_assets
  ADD CONSTRAINT archive_assets_state_check CHECK (state = ANY (ARRAY['reserved'::text, 'ready'::text, 'deleted'::text, 'deleting'::text]));

ALTER TABLE public.archive_assets
  ADD CONSTRAINT archive_assets_storage_path_key UNIQUE (storage_path);

ALTER TABLE public.archive_assets
  ADD CONSTRAINT archive_assets_width_check CHECK (width >= 1 AND width <= 20000000);

GRANT SELECT ON public.archive_assets TO anon;

GRANT SELECT ON public.archive_assets TO authenticated;

GRANT UPDATE (caption, credit, sort_order) ON public.archive_assets TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.archive_assets TO service_role;

CREATE INDEX archive_assets_entry_order ON public.archive_assets (entry_id, sort_order, id);

CREATE INDEX archive_assets_cleanup ON public.archive_assets (state, created_at);

CREATE POLICY archive_assets_update ON public.archive_assets
  FOR UPDATE
  TO authenticated
  USING (( SELECT public.is_admin() AS is_admin))
  WITH CHECK (( SELECT public.is_admin() AS is_admin));

CREATE TABLE public.archive_entries (
  id             uuid                     DEFAULT gen_random_uuid() NOT NULL,
  slug           text                     NOT NULL,
  title          text                     NOT NULL,
  recap          text                     DEFAULT ''::text NOT NULL,
  season         integer                  NOT NULL,
  date           date                     NOT NULL,
  status         text                     DEFAULT 'draft'::text NOT NULL,
  ever_published boolean                  DEFAULT false NOT NULL,
  tournament_id  bigint,
  vod_links      jsonb                    DEFAULT '[]'::jsonb NOT NULL,
  created_at     timestamp with time zone DEFAULT now() NOT NULL,
  updated_at     timestamp with time zone DEFAULT now() NOT NULL
);

CREATE POLICY archive_assets_read ON public.archive_assets
  FOR SELECT
  TO anon, authenticated
  USING ((((state = 'ready'::text) AND (EXISTS ( SELECT 1
   FROM public.archive_entries e
  WHERE ((e.id = archive_assets.entry_id) AND (e.status = 'published'::text))))) OR ( SELECT public.is_admin() AS is_admin)));

ALTER TABLE public.archive_entries
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.archive_entries
  ADD CONSTRAINT archive_entries_pkey PRIMARY KEY (id);

ALTER TABLE public.archive_assets
  ADD CONSTRAINT archive_assets_entry_id_fkey FOREIGN KEY (entry_id) REFERENCES public.archive_entries(id) ON DELETE RESTRICT;

ALTER TABLE public.archive_entries
  ADD CONSTRAINT archive_entries_recap_check CHECK (length(recap) <= 20000);

ALTER TABLE public.archive_entries
  ADD CONSTRAINT archive_entries_season_check CHECK (season >= 1000 AND season <= 9999);

ALTER TABLE public.archive_entries
  ADD CONSTRAINT archive_entries_slug_check CHECK (length(slug) <= 100 AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text);

ALTER TABLE public.archive_entries
  ADD CONSTRAINT archive_entries_slug_key UNIQUE (slug);

ALTER TABLE public.archive_entries
  ADD CONSTRAINT archive_entries_status_check CHECK (status = ANY (ARRAY['draft'::text, 'published'::text]));

ALTER TABLE public.archive_entries
  ADD CONSTRAINT archive_entries_title_check CHECK (length(btrim(title)) >= 1 AND length(btrim(title)) <= 160);

ALTER TABLE public.archive_entries
  ADD CONSTRAINT archive_entries_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.torneos(id) ON DELETE SET NULL;

ALTER TABLE public.archive_entries
  ADD CONSTRAINT archive_entries_vod_links_check CHECK (jsonb_typeof(vod_links) = 'array'::text AND jsonb_array_length(vod_links) <= 10);

GRANT SELECT ON public.archive_entries TO anon;

GRANT INSERT, SELECT, UPDATE ON public.archive_entries TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.archive_entries TO service_role;

CREATE INDEX archive_entries_tournament ON public.archive_entries (tournament_id);

CREATE INDEX archive_entries_season_date ON public.archive_entries (season, date DESC)
  WHERE status = 'published'::text;

CREATE TRIGGER archive_entry_guard
  BEFORE INSERT OR UPDATE ON public.archive_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.archive_entry_guard();

CREATE POLICY archive_entries_insert ON public.archive_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (( SELECT public.is_admin() AS is_admin));

CREATE POLICY archive_entries_read ON public.archive_entries
  FOR SELECT
  TO anon, authenticated
  USING (((status = 'published'::text) OR ( SELECT public.is_admin() AS is_admin)));

CREATE POLICY archive_entries_update ON public.archive_entries
  FOR UPDATE
  TO authenticated
  USING (( SELECT public.is_admin() AS is_admin))
  WITH CHECK (( SELECT public.is_admin() AS is_admin));

CREATE TABLE public.archive_media_state (
  id                integer                  NOT NULL,
  limit_bytes       bigint                   DEFAULT 104857600 NOT NULL,
  backup_run_id     text,
  backup_expires_at timestamp with time zone
);

ALTER TABLE public.archive_media_state
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.archive_media_state
  ADD CONSTRAINT archive_media_state_id_check CHECK (id = 1);

ALTER TABLE public.archive_media_state
  ADD CONSTRAINT archive_media_state_limit_bytes_check CHECK (limit_bytes >= 1 AND limit_bytes <= 104857600);

ALTER TABLE public.archive_media_state
  ADD CONSTRAINT archive_media_state_pkey PRIMARY KEY (id);

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.archive_media_state TO service_role;


-- Explicit ACLs: generated CREATE statements inherit hosted Supabase defaults.
revoke all on public.archive_entries,public.archive_assets,public.archive_media_state from anon,authenticated;
grant select on public.archive_entries,public.archive_assets to anon,authenticated;
grant insert,update on public.archive_entries to authenticated;
grant update(caption,credit,sort_order) on public.archive_assets to authenticated;
revoke execute on function public.archive_entry_guard(),public.reserve_archive_asset(uuid,text,integer,integer,integer,text,text),public.finalize_archive_asset(uuid),public.retire_archive_asset(uuid,uuid),public.claim_archive_cleanup(),public.finish_archive_cleanup(uuid[]),public.begin_archive_backup(text),public.end_archive_backup(text),public.reorder_archive_assets(uuid,uuid[]) from public,anon,authenticated;
grant execute on function public.archive_entry_guard(),public.reserve_archive_asset(uuid,text,integer,integer,integer,text,text),public.finalize_archive_asset(uuid),public.retire_archive_asset(uuid,uuid),public.claim_archive_cleanup(),public.finish_archive_cleanup(uuid[]),public.begin_archive_backup(text),public.end_archive_backup(text),public.reorder_archive_assets(uuid,uuid[]) to service_role;
-- No anonymous Storage SELECT: it would also permit callers to mint unbounded signed URLs.
-- Only the server service client may access objects; uploads are immutable (upsert:false).
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('archive-media','archive-media',false,2097152,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=2097152,allowed_mime_types=excluded.allowed_mime_types;
notify pgrst, 'reload schema';

insert into public.archive_media_state(id) values(1) on conflict(id) do nothing;

-- Serialize credit edits with publication, just like media finalization.
create function public.edit_archive_asset(p_entry_id uuid,p_id uuid,p_caption text,p_credit text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare entry_status text; result uuid;
begin
 select status into entry_status from public.archive_entries where id=p_entry_id for update;
 if entry_status='published' and (btrim(p_caption)='' or btrim(p_credit)='') then raise exception 'Completar leyenda y crédito'; end if;
 update public.archive_assets set caption=p_caption,credit=p_credit where id=p_id and entry_id=p_entry_id and state='ready' returning id into result;
 if result is null then raise exception 'Imagen no encontrada'; end if;
 return result;
end $$;
revoke update(caption,credit,sort_order) on public.archive_assets from authenticated;
revoke execute on function public.edit_archive_asset(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.edit_archive_asset(uuid,uuid,text,text) to service_role;
