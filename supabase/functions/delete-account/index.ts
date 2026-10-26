// Deletes the user's files and account. Database rows are removed by "on delete cascade".
import { serve, json, adminClient, requireUser } from "../_shared/common.ts";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

async function listAll(admin: SupabaseClient, bucket: string, prefix: string): Promise<string[]> {
  const { data } = await admin.storage.from(bucket).list(prefix, { limit: 1000 });
  const paths: string[] = [];
  for (const item of data ?? []) {
    const path = `${prefix}/${item.name}`;
    if (item.id) paths.push(path);
    else paths.push(...(await listAll(admin, bucket, path)));
  }
  return paths;
}

serve(async (req) => {
  const admin = adminClient();
  const user = await requireUser(req, admin);

  for (const bucket of ["avatars", "certificates", "interview-audio", "cv-uploads", "skill-evidence"]) {
    const paths = await listAll(admin, bucket, user.id);
    for (let i = 0; i < paths.length; i += 100) {
      await admin.storage.from(bucket).remove(paths.slice(i, i + 100));
    }
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) throw error;
  return json({ deleted: true });
});
