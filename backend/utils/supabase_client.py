from supabase import create_client
import os

def get_supabase():
    """Get Supabase client, initializing it lazily"""
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    
    if not supabase_url or not supabase_key:
        raise ValueError(
            "Supabase credentials not found. Please set SUPABASE_URL and SUPABASE_KEY in your .env file."
        )
    
    return create_client(supabase_url, supabase_key)

# For backward compatibility, create client at module level
# but it will be recreated if env vars are loaded later
try:
    supabase = get_supabase()
except ValueError:
    # If env vars not loaded yet, create a placeholder that will fail with a clear error
    supabase = None

def get_supabase_admin():
    """Get admin client for server-side operations"""
    from supabase import create_client
    supabase_url = os.getenv("SUPABASE_URL")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not service_role_key:
        raise ValueError(
            "Supabase admin credentials not found. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file."
        )
    
    return create_client(supabase_url, service_role_key)
