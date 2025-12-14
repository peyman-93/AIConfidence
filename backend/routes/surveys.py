from flask import Blueprint, request, jsonify
from utils.supabase_client import get_supabase

surveys_bp = Blueprint('surveys', __name__)

@surveys_bp.route('/submit', methods=['POST'])
def submit_survey():
    """Submit survey responses"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    data = request.json

    try:
        supabase = get_supabase()
        user = supabase.auth.get_user(token)
        user_id = user.user.id

        # Store survey responses
        supabase.table('surveys').insert({
            'user_id': user_id,
            'goals': data.get('goals'),
            'challenges': data.get('challenges'),
            'experience_level': data.get('experience_level'),
            'additional_notes': data.get('additional_notes')
        }).execute()

        # Mark survey as completed
        supabase.table('users').update({
            'survey_completed': True
        }).eq('id', user_id).execute()

        return jsonify({'message': 'Survey submitted successfully'}), 201

    except Exception as e:
        import traceback
        print(f"[SURVEY ERROR] {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 400

@surveys_bp.route('/<user_id>', methods=['GET'])
def get_survey(user_id):
    """Get user's survey responses"""
    try:
        supabase = get_supabase()
        survey = supabase.table('surveys').select('*').eq('user_id', user_id).execute()
        return jsonify(survey.data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400
