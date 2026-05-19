import { createClient }
from "@supabase/supabase-js";

const supabaseUrl =
    "https://ajuwfvliexkppmijmskw.supabase.co";

const supabaseAnonKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqdXdmdmxpZXhrcHBtaWptc2t3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNDYxMjksImV4cCI6MjA5NDYyMjEyOX0.13vx6B7u-7l-Q7cBaPciGBDRLQgimk2BXXmv3vh7n3A";

export const supabase =
    createClient(
        supabaseUrl,
        supabaseAnonKey
    );