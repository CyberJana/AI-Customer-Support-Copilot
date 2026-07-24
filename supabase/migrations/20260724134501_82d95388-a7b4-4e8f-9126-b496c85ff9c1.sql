
CREATE OR REPLACE FUNCTION public.apply_message_feedback(_message_id uuid, _delta integer)
RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.document_chunks c
  SET score = c.score + _delta
  FROM public.message_sources ms
  WHERE ms.message_id = _message_id
    AND ms.chunk_id = c.id
    AND c.user_id = auth.uid();

  UPDATE public.documents d
  SET needs_reindex = true
  WHERE d.user_id = auth.uid()
    AND d.id IN (
      SELECT c.document_id FROM public.document_chunks c
      JOIN public.message_sources ms ON ms.chunk_id = c.id
      WHERE ms.message_id = _message_id AND c.score <= -3
    );
END $$;
