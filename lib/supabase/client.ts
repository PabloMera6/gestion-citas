import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Email confirmation/recovery links must work even when the user
        // opens the email on a different browser/device from the one used
        // to register. PKCE ties the link to the original browser's
        // code_verifier, which caused: "code challenge does not match
        // previously saved code verifier".
        flowType: "implicit",
      },
    }
  );
}
