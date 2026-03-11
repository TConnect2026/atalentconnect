const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://irfrhwtraxaepabpwdcu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyZnJod3RyYXhhZXBhYnB3ZGN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMzY5NDgsImV4cCI6MjA4MzkxMjk0OH0.Ud78lsz478HaWz-gyMgvePbCltaF_xBuKGig1vOLT-8'
);

async function check() {
  // Get a real search ID
  const { data: searches } = await supabase.from('searches').select('id, firm_id').limit(1);
  console.log('=== SEARCHES ===');
  console.log(JSON.stringify(searches, null, 2));

  if (!searches || searches.length === 0) {
    console.log('No searches found');
    return;
  }

  const searchId = searches[0].id;

  // Try the exact insert the component does
  const { data: insertResult, error: insertErr } = await supabase
    .from('documents')
    .insert({
      search_id: searchId,
      name: 'test-spec.pdf',
      type: 'position_spec',
      file_url: 'https://example.com/test.pdf',
    })
    .select()
    .single();

  console.log('\n=== INSERT TEST ===');
  if (insertErr) {
    console.log('Insert error:', insertErr.message);
    console.log('Details:', JSON.stringify(insertErr, null, 2));
  } else {
    console.log('Insert succeeded:', JSON.stringify(insertResult, null, 2));
    await supabase.from('documents').delete().eq('id', insertResult.id);
    console.log('Cleaned up test doc');
  }

  // Test storage upload with search path
  const testContent = Buffer.from('Hello test');
  const filePath = searchId + '/position-spec/test-upload.txt';
  const { error: uploadErr } = await supabase.storage.from('documents').upload(filePath, testContent);
  console.log('\n=== STORAGE UPLOAD TEST ===');
  if (uploadErr) {
    console.log('Upload error:', uploadErr.message);
  } else {
    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath);
    console.log('Upload succeeded, public URL:', publicUrl);
    await supabase.storage.from('documents').remove([filePath]);
  }

  // Check bucket details
  const { data: bucketFiles, error: listErr } = await supabase.storage.from('documents').list('', { limit: 5 });
  console.log('\n=== BUCKET LIST ===');
  if (listErr) console.log('List error:', listErr.message);
  else console.log('Files:', JSON.stringify(bucketFiles, null, 2));
}

check();
