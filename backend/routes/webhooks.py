from flask import Blueprint, request, jsonify
from utils.supabase_client import get_supabase
from datetime import datetime
import json

webhooks_bp = Blueprint('webhooks', __name__)

@webhooks_bp.route('/calendly', methods=['POST'])
def calendly_webhook():
    """Handle Calendly webhook events"""
    data = request.json
    event_type = data.get('event')

    try:
        print(f"[WEBHOOK] Received Calendly event: {event_type}")
        print(f"[WEBHOOK] Data: {json.dumps(data, indent=2)}")

        if event_type == 'invitee.created':
            # New booking created - store in bookings table
            from utils.supabase_client import get_supabase_admin
            admin_supabase = get_supabase_admin()
            
            payload = data.get('payload', {})
            invitee = payload.get('invitee', {})
            scheduled_event = payload.get('scheduled_event', {})
            event = payload.get('event', {})
            
            email = invitee.get('email')
            scheduled_time = scheduled_event.get('start_time')
            # Use invitee URI as the unique identifier
            invitee_uri = invitee.get('uri', '')
            calendly_event_id = invitee_uri.split('/')[-1] if invitee_uri and '/' in invitee_uri else invitee.get('uuid') or None
            
            # Extract event type slug from event URI (e.g., "30min" or "new-meeting")
            event_uri = event.get('uri', '') if isinstance(event, dict) else event
            event_type_slug = None
            if event_uri:
                # Event URI format: https://api.calendly.com/event_types/EVENT_TYPE_UUID
                # We need to get the slug from the event type, but we can extract from scheduled_event
                # Actually, we can get it from the scheduled_event URI or check the event type
                # For now, let's extract from the event URI if it contains the slug
                # Or we can check the scheduled_event's event_type
                event_type_info = scheduled_event.get('event_type', '')
                if isinstance(event_type_info, str) and '/' in event_type_info:
                    # Extract slug from event type URL if available
                    pass  # Will handle below
                elif isinstance(event_type_info, dict):
                    event_type_slug = event_type_info.get('slug') or event_type_info.get('name', '').lower().replace(' ', '-')
            
            # Alternative: Extract from scheduled_event URI if it contains the event type
            scheduled_event_uri = scheduled_event.get('uri', '')
            if not event_type_slug and scheduled_event_uri:
                # Try to get event type from Calendly API if needed
                # For now, we'll check bookings by matching the event URL pattern
                pass
            
            print(f"[WEBHOOK] Processing booking for email: {email}, scheduled_time: {scheduled_time}, invitee_id: {calendly_event_id}, event_type: {event_type_slug}")

            if not email or not scheduled_time:
                print(f"[WEBHOOK] Missing required data: email={email}, scheduled_time={scheduled_time}")
                return jsonify({'status': 'received', 'message': 'Missing required data'}), 200

            # Find user by email
            user_result = admin_supabase.table('users').select('id').eq('email', email).execute()
            
            if user_result.data and len(user_result.data) > 0:
                user_id = user_result.data[0]['id']
                
                # Check if booking already exists for this invitee (by calendly_event_id)
                existing = admin_supabase.table('bookings').select('*').eq('calendly_event_id', calendly_event_id).execute()
                
                if not existing.data or len(existing.data) == 0:
                    # Create new booking in database
                    booking_data = {
                        'user_id': user_id,
                        'calendly_event_id': calendly_event_id,
                        'scheduled_time': scheduled_time,
                        'status': 'confirmed',
                        'created_at': datetime.now().isoformat()
                    }
                    result = admin_supabase.table('bookings').insert(booking_data).execute()
                    print(f"[WEBHOOK] ✅ Created new booking for user {user_id}: {booking_data}")
                else:
                    # Update existing booking
                    admin_supabase.table('bookings').update({
                        'user_id': user_id,
                        'status': 'confirmed',
                        'scheduled_time': scheduled_time,
                    }).eq('id', existing.data[0]['id']).execute()
                    print(f"[WEBHOOK] ✅ Updated existing booking for user {user_id}")
            else:
                print(f"[WEBHOOK] ⚠️ User not found for email: {email} - booking not stored")

        elif event_type == 'invitee.canceled':
            # Booking cancelled
            print("[WEBHOOK] Booking cancelled")

        return jsonify({'status': 'received'}), 200

    except Exception as e:
        print(f"[WEBHOOK ERROR] {str(e)}")
        return jsonify({'error': str(e)}), 400
