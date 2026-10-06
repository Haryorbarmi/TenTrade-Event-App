// Create an app user (there is no public sign-up).
// Usage: npm run create-user -- <email> <password> "<Full Name>" <super_admin|registrar>
import { createClient } from "@supabase/supabase-js";

const [email, password, name, role] = process.argv.slice(2);
if (!email || !password || !name || !["super_admin", "registrar"].includes(role)) {
  console.error('Usage: npm run create-user -- <email> <password> "<Full Name>" <super_admin|registrar>');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { name },
  app_metadata: { role },
});
if (error) {
  console.error(`Failed: ${error.message}`);
  process.exit(1);
}
console.log(`Created ${role} ${name} <${email}> (${data.user.id})`);
