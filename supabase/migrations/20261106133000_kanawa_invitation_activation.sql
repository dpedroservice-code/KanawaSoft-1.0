-- KanawaSoft 1.0 — convites ficam ativos imediatamente quando o email já chega confirmado.
CREATE OR REPLACE FUNCTION private.ks_redeem_team_invitation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_code text;
  v_invite public.ks_team_invitations%ROWTYPE;
  v_status text;
BEGIN
  v_code := nullif(new.raw_user_meta_data ->> 'invitation_code','');
  IF v_code IS NULL THEN RETURN new; END IF;

  SELECT * INTO v_invite
  FROM public.ks_team_invitations i
  WHERE i.token_hash = encode(extensions.digest(convert_to(v_code,'UTF8'),'sha256'),'hex')
    AND lower(i.email) = lower(new.email)
    AND i.accepted_at IS NULL
    AND i.expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Convite inválido, expirado ou associado a outro email.' USING ERRCODE = '42501';
  END IF;

  v_status := CASE WHEN new.email_confirmed_at IS NOT NULL THEN 'active' ELSE 'invited' END;

  INSERT INTO public.ks_company_memberships(company_id,user_id,role,status,permissions)
  VALUES (v_invite.company_id,new.id,v_invite.role,v_status,v_invite.permissions)
  ON CONFLICT (company_id,user_id) DO UPDATE
    SET role = EXCLUDED.role,
        status = EXCLUDED.status,
        permissions = EXCLUDED.permissions;

  UPDATE public.ks_team_invitations
  SET accepted_by = new.id, accepted_at = now()
  WHERE id = v_invite.id;

  RETURN new;
END;
$function$;
