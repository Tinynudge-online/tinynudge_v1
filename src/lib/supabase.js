// lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://uaqbwsmuuvaukxurzdks.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhcWJ3c211dXZhdWt4dXJ6ZGtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNTI4NzEsImV4cCI6MjA3MDYyODg3MX0.V__PztLOgmJO40UE7Nf3OcQRYojURZsKvpH-hp-XurU'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)