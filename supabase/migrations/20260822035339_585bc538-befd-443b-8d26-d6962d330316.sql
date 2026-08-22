CREATE POLICY "certificados_auth_all" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'certificados') WITH CHECK (bucket_id = 'certificados');
CREATE POLICY "documentos_auth_all" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'documentos') WITH CHECK (bucket_id = 'documentos');
