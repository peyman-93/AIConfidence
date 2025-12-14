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

        # Prepare survey data - support both new and legacy fields
        survey_data = {
            'user_id': user_id,
        }
        
        # New survey fields
        if data.get('full_name'):
            survey_data['full_name'] = data.get('full_name')
        if data.get('email'):
            survey_data['email'] = data.get('email')
        if data.get('age_range'):
            survey_data['age_range'] = data.get('age_range')
        if data.get('country'):
            survey_data['country'] = data.get('country')
        if data.get('linkedin_profile'):
            survey_data['linkedin_profile'] = data.get('linkedin_profile')
        if data.get('best_describes_you'):
            survey_data['best_describes_you'] = data.get('best_describes_you')
        if data.get('industry'):
            survey_data['industry'] = data.get('industry')
        if data.get('job_role'):
            survey_data['job_role'] = data.get('job_role')
        # Support legacy field name for backward compatibility
        if data.get('current_role'):
            survey_data['job_role'] = data.get('current_role')
        if data.get('years_experience'):
            survey_data['years_experience'] = data.get('years_experience')
        if data.get('how_did_you_hear'):
            survey_data['how_did_you_hear'] = data.get('how_did_you_hear')
        if data.get('referral_name'):
            survey_data['referral_name'] = data.get('referral_name')
        
        # Legacy fields (for backward compatibility)
        if data.get('goals'):
            survey_data['goals'] = data.get('goals')
        if data.get('challenges'):
            survey_data['challenges'] = data.get('challenges')
        if data.get('experience_level'):
            survey_data['experience_level'] = data.get('experience_level')
        if data.get('additional_notes'):
            survey_data['additional_notes'] = data.get('additional_notes')

        # Store survey responses
        supabase.table('surveys').insert(survey_data).execute()

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
