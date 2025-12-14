from flask import Blueprint, request, jsonify
from utils.supabase_client import get_supabase
import requests
import os
from datetime import datetime

bookings_bp = Blueprint('bookings', __name__)

CALENDLY_API_URL = "https://api.calendly.com/v1"
CALENDLY_API_KEY = os.getenv("CALENDLY_API_KEY")

@bookings_bp.route('/config', methods=['GET'])
def get_calendly_config():
    """Get Calendly widget configuration (without exposing API key)
    Returns appropriate event type based on whether user has booked intro meeting"""
    try:
        from utils.supabase_client import get_supabase_admin
        admin_supabase = get_supabase_admin()
        
        calendly_username = os.getenv("CALENDLY_USERNAME")
        intro_event_slug = "30min"  # Introduction meeting slug
        coaching_event_slug = "new-meeting"  # 1:1 coaching meeting slug
        
        if not calendly_username:
            return jsonify({
                'error': 'Calendly not configured',
                'calendly_username': None,
                'calendly_event_type': None
            }), 200
        
        # Check if user is authenticated and has booked intro meeting
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        has_intro_booking = False
        
        if token:
            try:
                supabase = get_supabase()
                user = supabase.auth.get_user(token)
                user_id = user.user.id
                
                # Get user's bookings
                bookings_result = admin_supabase.table('bookings').select('*').eq('user_id', user_id).execute()
                bookings = bookings_result.data or []
                
                # Check if user has booked the intro meeting (30min)
                # Simple approach: Check if user has any booking, then verify it's for intro via Calendly API
                has_intro_booking = False
                
                if bookings and CALENDLY_API_KEY:
                    headers = {
                        'Authorization': f'Bearer {CALENDLY_API_KEY}',
                        'Content-Type': 'application/json'
                    }
                    
                    # Get user's email to check bookings via Calendly API
                    user_email = user.user.email
                    
                    try:
                        # Get scheduled events for this user's email
                        events_response = requests.get(
                            f"{CALENDLY_API_URL}/scheduled_events",
                            headers=headers,
                            params={'count': 100, 'status': 'active'}
                        )
                        
                        if events_response.status_code == 200:
                            events_data = events_response.json()
                            scheduled_events = events_data.get('collection', [])
                            
                            # Check each scheduled event to see if it's the intro meeting
                            for scheduled_event in scheduled_events:
                                event_type_info = scheduled_event.get('event_type', {})
                                
                                # Get event type slug
                                event_type_slug = None
                                if isinstance(event_type_info, dict):
                                    event_type_slug = event_type_info.get('slug', '')
                                elif isinstance(event_type_info, str):
                                    # If it's a URI, extract UUID and fetch event type
                                    event_type_uri = event_type_info
                                    event_type_uuid = event_type_uri.split('/')[-1] if '/' in event_type_uri else None
                                    
                                    if event_type_uuid:
                                        event_type_response = requests.get(
                                            f"{CALENDLY_API_URL}/event_types/{event_type_uuid}",
                                            headers=headers
                                        )
                                        if event_type_response.status_code == 200:
                                            event_type_data = event_type_response.json()
                                            event_type_slug = event_type_data.get('resource', {}).get('slug', '')
                                
                                # Check if this is the intro meeting and if user is an invitee
                                if event_type_slug == intro_event_slug:
                                    # Check if user is an invitee for this event
                                    event_uri = scheduled_event.get('uri', '')
                                    event_uuid = event_uri.split('/')[-1] if event_uri else None
                                    
                                    if event_uuid:
                                        invitees_response = requests.get(
                                            f"{CALENDLY_API_URL}/scheduled_events/{event_uuid}/invitees",
                                            headers=headers
                                        )
                                        
                                        if invitees_response.status_code == 200:
                                            invitees_data = invitees_response.json()
                                            invitees = invitees_data.get('collection', [])
                                            
                                            # Check if user's email matches any invitee
                                            for invitee in invitees:
                                                invitee_email = invitee.get('email', '').lower()
                                                if invitee_email == user_email.lower():
                                                    has_intro_booking = True
                                                    break
                                    
                                    if has_intro_booking:
                                        break
                                
                                if has_intro_booking:
                                    break
                    except Exception as api_error:
                        print(f"[CONFIG] Calendly API check failed: {str(api_error)}")
                        # Fallback: if user has any booking, assume intro might be done
                        # But default to showing intro meeting to be safe
                        has_intro_booking = False
                
            except Exception as e:
                # If auth fails, just return default (intro meeting)
                print(f"[CONFIG] Auth check failed: {str(e)}")
                has_intro_booking = False
        
        # Return appropriate event type
        # If user has booked intro meeting, show coaching meeting
        # Otherwise, show intro meeting
        event_type_slug = coaching_event_slug if has_intro_booking else intro_event_slug
        
        return jsonify({
            'calendly_username': calendly_username,
            'calendly_event_type': event_type_slug
        }), 200
    except Exception as e:
        import traceback
        print(f"[CONFIG ERROR] {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 400

@bookings_bp.route('/availability', methods=['GET'])
def get_calendly_availability():
    """Get available meeting slots from Calendly"""
    try:
        if not CALENDLY_API_KEY:
            return jsonify({'error': 'Calendly API not configured'}), 503
        
        headers = {
            'Authorization': f'Bearer {CALENDLY_API_KEY}',
            'Content-Type': 'application/json'
        }
        
        # Get your Calendly event type UUID (you need to set this)
        event_type_uuid = os.getenv("CALENDLY_EVENT_TYPE_UUID")
        
        if not event_type_uuid:
            return jsonify({'error': 'Calendly event type not configured'}), 503
        
        response = requests.get(
            f"{CALENDLY_API_URL}/event_types/{event_type_uuid}",
            headers=headers
        )
        
        if response.status_code != 200:
            return jsonify({'error': 'Failed to fetch Calendly availability'}), response.status_code
        
        return jsonify(response.json()), 200

    except Exception as e:
        # Don't expose internal error details
        import traceback
        print(f"[CALENDLY ERROR] {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': 'Failed to fetch availability'}), 400

@bookings_bp.route('/book', methods=['POST'])
def book_meeting():
    """Create a booking after Calendly widget handles it"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    data = request.json

    try:
        from utils.supabase_client import get_supabase_admin
        admin_supabase = get_supabase_admin()
        
        supabase = get_supabase()
        user = supabase.auth.get_user(token)
        user_id = user.user.id

        calendly_event_id = data.get('calendly_event_id')
        scheduled_time = data.get('scheduled_time')
        
        if not calendly_event_id or not scheduled_time:
            return jsonify({'error': 'Missing calendly_event_id or scheduled_time'}), 400

        # Check if booking already exists
        existing = admin_supabase.table('bookings').select('*').eq('calendly_event_id', calendly_event_id).execute()
        
        if existing.data and len(existing.data) > 0:
            # Update existing booking
            admin_supabase.table('bookings').update({
                'user_id': user_id,
                'status': 'confirmed',
                'scheduled_time': scheduled_time,
            }).eq('id', existing.data[0]['id']).execute()
            print(f"[BOOK] ✅ Updated existing booking for user {user_id}")
            return jsonify({
                'message': 'Booking updated successfully',
                'booking_id': existing.data[0]['id']
            }), 200
        else:
            # Create new booking
            booking = admin_supabase.table('bookings').insert({
                'user_id': user_id,
                'calendly_event_id': calendly_event_id,
                'scheduled_time': scheduled_time,
                'status': 'confirmed',
                'created_at': datetime.now().isoformat()
            }).execute()
            print(f"[BOOK] ✅ Created new booking for user {user_id}: {scheduled_time}")
            return jsonify({
                'message': 'Booking created successfully',
                'booking_id': booking.data[0]['id']
            }), 201

    except Exception as e:
        import traceback
        print(f"[BOOK ERROR] {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 400

@bookings_bp.route('', methods=['GET'])
def get_user_bookings():
    """Get all bookings for authenticated user"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')

    try:
        from utils.supabase_client import get_supabase_admin
        admin_supabase = get_supabase_admin()
        
        supabase = get_supabase()
        user = supabase.auth.get_user(token)
        user_id = user.user.id
        user_email = user.user.email

        # Get bookings from database
        bookings_result = admin_supabase.table('bookings').select('*').eq('user_id', user_id).order('scheduled_time', desc=False).execute()
        bookings = bookings_result.data or []

        # Also try to fetch from Calendly API and sync to database
        if CALENDLY_API_KEY and user_email:
            try:
                headers = {
                    'Authorization': f'Bearer {CALENDLY_API_KEY}',
                    'Content-Type': 'application/json'
                }
                
                print(f"[BOOKINGS] 🔍 Syncing bookings from Calendly API for email: {user_email}")
                
                # Get all scheduled events (without user filter - we'll filter by invitee email)
                # This approach works even if /users/me endpoint is not available
                events_response = requests.get(
                    f"{CALENDLY_API_URL}/scheduled_events",
                    headers=headers,
                    params={
                        'count': 100,
                        'status': 'active'
                    }
                )
                
                print(f"[BOOKINGS] Calendly API response status: {events_response.status_code}")
                
                if events_response.status_code == 401:
                    print(f"[BOOKINGS] ⚠️ Calendly API authentication failed - check CALENDLY_API_KEY")
                    # Don't raise - just log and continue with database bookings
                elif events_response.status_code == 404:
                    print(f"[BOOKINGS] ⚠️ Calendly API endpoint not found (404) - API key may lack permissions or endpoint structure changed")
                    # Don't raise - just log and continue with database bookings
                elif events_response.status_code == 200:
                    events_data = events_response.json()
                    scheduled_events = events_data.get('collection', [])
                    
                    # For each scheduled event, get the invitees and match by email
                    for scheduled_event in scheduled_events:
                        event_uri = scheduled_event.get('uri', '')
                        event_uuid = event_uri.split('/')[-1] if event_uri else None
                        
                        if not event_uuid:
                            continue
                        
                        # Get invitees for this event
                        invitees_response = requests.get(
                            f"{CALENDLY_API_URL}/scheduled_events/{event_uuid}/invitees",
                            headers=headers
                        )
                        
                        if invitees_response.status_code == 200:
                            invitees_data = invitees_response.json()
                            invitees = invitees_data.get('collection', [])
                            
                            # Find invitee matching user's email
                            for invitee in invitees:
                                invitee_email = invitee.get('email', '').lower()
                                
                                if invitee_email == user_email.lower():
                                    # Found matching invitee - extract booking info
                                    invitee_uri = invitee.get('uri', '')
                                    calendly_event_id = invitee_uri.split('/')[-1] if invitee_uri and '/' in invitee_uri else invitee.get('uuid') or None
                                    scheduled_time = scheduled_event.get('start_time')
                                    
                                    if scheduled_time and calendly_event_id:
                                        # Check if booking already exists
                                        existing = admin_supabase.table('bookings').select('*').eq('user_id', user_id).eq('calendly_event_id', calendly_event_id).execute()
                                        
                                        if not existing.data or len(existing.data) == 0:
                                            # Create new booking
                                            admin_supabase.table('bookings').insert({
                                                'user_id': user_id,
                                                'calendly_event_id': calendly_event_id,
                                                'scheduled_time': scheduled_time,
                                                'status': 'confirmed',
                                                'created_at': datetime.now().isoformat()
                                            }).execute()
                                            print(f"[BOOKINGS] ✅ Synced new booking from Calendly for user {user_id}: {scheduled_time}")
                                        break  # Found matching invitee, move to next event
                    
                    # Refresh bookings from database after sync
                    bookings_result = admin_supabase.table('bookings').select('*').eq('user_id', user_id).order('scheduled_time', desc=False).execute()
                    bookings = bookings_result.data or []
                    print(f"[BOOKINGS] ✅ Total bookings after sync: {len(bookings)}")
                else:
                    print(f"[BOOKINGS] ⚠️ Calendly API returned status {events_response.status_code}: {events_response.text[:200]}")
                            
            except Exception as cal_error:
                # If Calendly API fails, just use database bookings
                import traceback
                print(f"[BOOKINGS] Calendly API error (non-critical): {str(cal_error)}")
                print(traceback.format_exc())

        return jsonify(bookings), 200

    except Exception as e:
        import traceback
        print(f"[BOOKINGS ERROR] {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 400
