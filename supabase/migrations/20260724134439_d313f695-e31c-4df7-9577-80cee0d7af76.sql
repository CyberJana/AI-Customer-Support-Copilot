
ALTER TABLE public.document_chunks ADD COLUMN IF NOT EXISTS score integer NOT NULL DEFAULT 0;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS needs_reindex boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.message_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  chunk_id uuid NOT NULL REFERENCES public.document_chunks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, chunk_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_sources TO authenticated;
GRANT ALL ON public.message_sources TO service_role;
ALTER TABLE public.message_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own message sources" ON public.message_sources
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.message_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  rating smallint NOT NULL CHECK (rating IN (-1, 1)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_feedback TO authenticated;
GRANT ALL ON public.message_feedback TO service_role;
ALTER TABLE public.message_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own feedback" ON public.message_feedback
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP FUNCTION IF EXISTS public.match_chunks(vector, integer);
CREATE FUNCTION public.match_chunks(query_embedding vector, match_count integer DEFAULT 5)
RETURNS TABLE(id uuid, document_id uuid, content text, similarity double precision, score integer)
LANGUAGE sql STABLE SET search_path TO 'public'
AS $$
  SELECT c.id, c.document_id, c.content,
         (1 - (c.embedding <=> query_embedding)) + LEAST(GREATEST(c.score, -5), 5) * 0.02 AS similarity,
         c.score
  FROM public.document_chunks c
  WHERE c.user_id = auth.uid()
  ORDER BY ((1 - (c.embedding <=> query_embedding)) + LEAST(GREATEST(c.score, -5), 5) * 0.02) DESC
  LIMIT match_count
$$;

CREATE OR REPLACE FUNCTION public.apply_message_feedback(_message_id uuid, _delta integer)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  UPDATE public.document_chunks c
  SET score = c.score + _delta
  FROM public.message_sources ms
  WHERE ms.message_id = _message_id
    AND ms.chunk_id = c.id
    AND c.user_id = _uid;

  UPDATE public.documents d
  SET needs_reindex = true
  WHERE d.user_id = _uid
    AND d.id IN (
      SELECT c.document_id FROM public.document_chunks c
      JOIN public.message_sources ms ON ms.chunk_id = c.id
      WHERE ms.message_id = _message_id AND c.score <= -3
    );
END $$;
REVOKE ALL ON FUNCTION public.apply_message_feedback(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_message_feedback(uuid, integer) TO authenticated;
