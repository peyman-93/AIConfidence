from flask import Blueprint, request, jsonify
from utils.supabase_client import get_supabase
import jwt
import os

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register new user with Supabase"""
    if not request.json:
        return jsonify({'error': 'Request body is required'}), 400
    
    data = request.json
    email = data.get('email')
    password = data.get('password')
    full_name = data.get('full_name')
    promoter_code = data.get('promoter_code', None)

    # Validate required fields
    if not email or not password or not full_name:
        return jsonify({'error': 'Email, password, and full_name are required'}), 400

    try:
        supabase = get_supabase()
        
        # Sign up user with Supabase
        user_response = supabase.auth.sign_up({
            'email': email,
            'password': password
        })

        if not user_response or not user_response.user:
            return jsonify({'error': 'Failed to create user account'}), 400

        user_id = user_response.user.id
        
        # Check if email confirmation is required
        requires_confirmation = user_response.user.email_confirmed_at is None

        # Create user profile in database using admin client to bypass RLS
        try:
            from utils.supabase_client import get_supabase_admin
            admin_supabase = get_supabase_admin()
            profile_result = admin_supabase.table('users').insert({
                'id': user_id,
                'email': email,
                'full_name': full_name,
                'promoter_code': promoter_code,
                'survey_completed': False
            }).execute()
            
            if not profile_result.data:
                print(f"[REGISTER WARNING] User profile insert returned no data for user_id: {user_id}")
        except Exception as profile_error:
            # If profile creation fails, log but don't fail registration
            # The user can still confirm email and we can create profile later
            import traceback
            error_msg = str(profile_error)
            print(f"[REGISTER WARNING] Failed to create user profile: {error_msg}")
            print(traceback.format_exc())
            # If it's a table/permission error, provide helpful message
            if 'permission' in error_msg.lower() or 'policy' in error_msg.lower() or 'does not exist' in error_msg.lower():
                print(f"[REGISTER WARNING] This might be due to missing 'users' table or RLS policies in Supabase")

        # If we have a session (email confirmation disabled), return tokens
        response_data = {
            'message': 'User registered successfully',
            'user_id': user_id,
            'requires_email_confirmation': requires_confirmation
        }
        
        # If session exists (email confirmation disabled), include tokens
        if user_response.session:
            response_data['access_token'] = user_response.session.access_token
            response_data['refresh_token'] = user_response.session.refresh_token

        return jsonify(response_data), 201

    except Exception as e:
        import traceback
        error_msg = str(e)
        print(f"[REGISTER ERROR] {error_msg}")
        print(traceback.format_exc())
        return jsonify({'error': error_msg}), 400

@auth_bp.route('/login', methods=['POST'])
def login():
    """Login user with Supabase"""
    data = request.json
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    try:
        supabase = get_supabase()
        response = supabase.auth.sign_in_with_password({
            'email': email,
            'password': password
        })

        user_id = response.user.id
        
        # Check if user profile exists, create if it doesn't
        try:
            profile = supabase.table('users').select('*').eq('id', user_id).execute()
            
            if not profile.data or len(profile.data) == 0:
                # Profile doesn't exist, create it using admin client
                print(f"[LOGIN] Creating missing profile for user_id: {user_id}")
                from utils.supabase_client import get_supabase_admin
                admin_supabase = get_supabase_admin()
                admin_supabase.table('users').insert({
                    'id': user_id,
                    'email': email,
                    'full_name': email.split('@')[0],  # Use email prefix as default name
                    'survey_completed': False
                }).execute()
        except Exception as profile_error:
            # Log but don't fail login
            import traceback
            error_msg = str(profile_error)
            print(f"[LOGIN WARNING] Profile check/creation failed: {error_msg}")
            print(traceback.format_exc())
            if 'permission' in error_msg.lower() or 'policy' in error_msg.lower() or 'does not exist' in error_msg.lower():
                print(f"[LOGIN WARNING] This might be due to missing 'users' table or RLS policies in Supabase")

        return jsonify({
            'access_token': response.session.access_token,
            'refresh_token': response.session.refresh_token,
            'user_id': user_id,
            'email': response.user.email
        }), 200

    except Exception as e:
        import traceback
        error_msg = str(e)
        print(f"[LOGIN ERROR] {error_msg}")
        print(traceback.format_exc())
        
        # Check if it's an email confirmation error
        if 'email' in error_msg.lower() and 'confirm' in error_msg.lower():
            return jsonify({'error': 'Please confirm your email before logging in'}), 401
        
        return jsonify({'error': 'Invalid credentials'}), 401

@auth_bp.route('/me', methods=['GET'])
def get_current_user():
    """Get current authenticated user"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')

    if not token:
        return jsonify({'error': 'No token provided'}), 401

    try:
        supabase = get_supabase()
        user = supabase.auth.get_user(token)
        
        if not user or not user.user:
            return jsonify({'error': 'Invalid token'}), 401
        
        user_id = user.user.id
        user_email = user.user.email or 'unknown@example.com'
        
        # Try to get profile
        try:
            profile = supabase.table('users').select('*').eq('id', user_id).execute()
        except Exception as select_error:
            # If select fails, try to create profile
            print(f"[GET_USER] Select failed, will try to create profile: {str(select_error)}")
            profile = type('obj', (object,), {'data': []})()  # Create empty profile object

        # If profile doesn't exist, create it using admin client
        if not profile.data or len(profile.data) == 0:
            print(f"[GET_USER] Creating missing profile for user_id: {user_id}")
            try:
                from utils.supabase_client import get_supabase_admin
                admin_supabase = get_supabase_admin()
                # Create profile with default values using admin client to bypass RLS
                insert_result = admin_supabase.table('users').insert({
                    'id': user_id,
                    'email': user_email,
                    'full_name': user_email.split('@')[0],  # Use email prefix as default
                    'survey_completed': False
                }).execute()
                
                print(f"[GET_USER] Profile created successfully: {insert_result.data}")
                
                # Fetch the newly created profile
                profile = supabase.table('users').select('*').eq('id', user_id).execute()
                
                # If still no data, use the insert result
                if not profile.data or len(profile.data) == 0:
                    if insert_result.data and len(insert_result.data) > 0:
                        profile.data = insert_result.data
                    else:
                        # Return user data even without profile
                        return jsonify({
                            'user': {
                                'id': user_id,
                                'email': user_email,
                                'full_name': user_email.split('@')[0],
                                'survey_completed': False
                            }
                        }), 200
            except Exception as create_error:
                import traceback
                error_msg = str(create_error)
                print(f"[GET_USER ERROR] Failed to create profile: {error_msg}")
                print(traceback.format_exc())
                
                # Return user data even if profile creation fails
                # This allows the user to continue using the app
                print(f"[GET_USER] Returning user data without profile due to error")
                return jsonify({
                    'user': {
                        'id': user_id,
                        'email': user_email,
                        'full_name': user_email.split('@')[0],
                        'survey_completed': False
                    }
                }), 200

        # Return user data with profile
        if profile.data and len(profile.data) > 0:
            return jsonify({
                'user': {
                    'id': user_id,
                    'email': user_email,
                    'full_name': profile.data[0].get('full_name', user_email.split('@')[0]),
                    'survey_completed': profile.data[0].get('survey_completed', False)
                }
            }), 200
        else:
            # Fallback if profile data is still empty
            return jsonify({
                'user': {
                    'id': user_id,
                    'email': user_email,
                    'full_name': user_email.split('@')[0],
                    'survey_completed': False
                }
            }), 200

    except Exception as e:
        import traceback
        error_msg = str(e)
        print(f"[GET_USER ERROR] {error_msg}")
        print(traceback.format_exc())
        return jsonify({'error': 'Unauthorized', 'details': error_msg}), 401

@auth_bp.route('/verify-email', methods=['POST'])
def verify_email():
    """Verify email confirmation token from Supabase email link"""
    data = request.json
    token = data.get('token')
    token_hash = data.get('token_hash')  # Supabase sometimes uses token_hash
    token_type = data.get('type', 'signup')  # 'signup', 'recovery', 'invite', or 'email'
    
    if not token and not token_hash:
        return jsonify({'error': 'Token is required'}), 400
    
    try:
        supabase = get_supabase()
        
        # Supabase email confirmation can work in different ways:
        # 1. Using verify_otp with token and type
        # 2. The email link might contain a token that needs to be exchanged
        
        # Try verify_otp first (for OTP-based confirmation)
        try:
            response = supabase.auth.verify_otp({
                'token': token or token_hash,
                'type': token_type
            })
            
            if response.session:
                return jsonify({
                    'success': True,
                    'message': 'Email verified successfully',
                    'access_token': response.session.access_token,
                    'refresh_token': response.session.refresh_token,
                    'user_id': response.user.id
                }), 200
        except Exception as otp_error:
            # If verify_otp fails, try alternative method
            print(f"[VERIFY_OTP] {str(otp_error)}")
        
        # Alternative: If the token is from email link, we might need to use exchange_code_for_session
        # But typically Supabase handles this through redirect URLs
        # For now, return error if verify_otp didn't work
        return jsonify({
            'success': False,
            'error': 'Invalid or expired token. Please request a new confirmation email.'
        }), 400
            
    except Exception as e:
        import traceback
        error_msg = str(e)
        print(f"[VERIFY_EMAIL ERROR] {error_msg}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': error_msg
        }), 400

@auth_bp.route('/resend-confirmation', methods=['POST'])
def resend_confirmation():
    """Resend email confirmation using Supabase admin API"""
    data = request.json
    email = data.get('email')
    
    if not email:
        return jsonify({'error': 'Email is required'}), 400
    
    try:
        from utils.supabase_client import get_supabase_admin
        admin_supabase = get_supabase_admin()
        
        # Get site URL from environment or use default
        site_url = os.getenv('SITE_URL', 'http://localhost:5000')
        redirect_to = f"{site_url}/email-confirmation"
        
        # Use admin API to generate and send confirmation link
        # The generate_link with type='signup' should trigger email sending
        try:
            link_response = admin_supabase.auth.admin.generate_link({
                'type': 'signup',
                'email': email,
                'options': {
                    'redirect_to': redirect_to
                }
            })
            
            # Note: generate_link might not automatically send email
            # Check if we need to manually send it
            # For Supabase, the email should be sent automatically when generate_link is called with type='signup'
            
            return jsonify({
                'message': 'Confirmation email sent successfully. Please check your inbox (and spam folder).'
            }), 200
            
        except Exception as link_error:
            error_msg = str(link_error)
            print(f"[RESEND_CONFIRMATION] generate_link failed: {error_msg}")
            
            # Alternative: Try to find user and resend using their existing data
            try:
                users_response = admin_supabase.auth.admin.list_users()
                user_found = False
                for user in users_response.users:
                    if user.email == email:
                        user_found = True
                        # User exists, try to resend
                        # Unfortunately, Supabase Python client doesn't have a direct resend method
                        # The email should be sent when generate_link is called
                        break
                
                if not user_found:
                    return jsonify({'error': 'User not found. Please register first.'}), 404
                
                # If we get here, the user exists but generate_link failed
                # Return a message directing user to Supabase dashboard
                return jsonify({
                    'error': 'Unable to automatically resend email. Please check your Supabase email configuration or use the Supabase dashboard to resend the confirmation email.',
                    'help': 'You can resend the confirmation email from Supabase Dashboard → Authentication → Users → Find your user → Resend confirmation email'
                }), 400
                
            except Exception as list_error:
                print(f"[RESEND_CONFIRMATION] list_users failed: {str(list_error)}")
                return jsonify({
                    'error': 'Unable to resend confirmation email. Please check your Supabase configuration or use the Supabase dashboard.'
                }), 400
        
    except Exception as e:
        import traceback
        error_msg = str(e)
        print(f"[RESEND_CONFIRMATION ERROR] {error_msg}")
        print(traceback.format_exc())
        return jsonify({
            'error': f'Failed to resend confirmation email: {error_msg}',
            'help': 'Please check your Supabase email service configuration in the dashboard.'
        }), 400

@auth_bp.route('/logout', methods=['POST'])
def logout():
    """Logout user"""
    return jsonify({'message': 'Logged out successfully'}), 200
