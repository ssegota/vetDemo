import json
import boto3
import os

# Initialize Bedrock client
bedrock = boto3.client(service_name='bedrock-runtime', region_name='us-east-1')

def lambda_handler(event, context):
    try:
        # 1. Extract keywords from the request
        body = json.loads(event.get('body', '{}'))
        keywords = body.get('keywords', [])
        keywords_str = ", ".join(keywords)
        
        # 2. Read examples.text
        # In a real Amplify/Lambda environment, this file would be bundled with the function
        # or stored in an S3 bucket reachable by the Lambda.
        examples_path = os.path.join(os.path.dirname(__file__), 'examples.text')
        try:
            with open(examples_path, 'r') as f:
                examples_content = f.read()
        except FileNotFoundError:
            examples_content = "No examples available."

        # 3. Construct the prompt for Claude 3
        prompt_text = f"""
Based on the keywords ({keywords_str}) and the examples below, generate a narrative veterinary report.

EXAMPLES:
{examples_content}

USER KEYWORDS:
{keywords_str}

Please generate a professional, narrative veterinary report that follows the style of the examples provided.
"""

        # 4. Prepare Bedrock request
        # Using Claude 3 Sonnet (or Haiku)
        model_id = 'anthropic.claude-3-sonnet-20240229-v1:0'
        
        request_body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1000,
            "messages": [
                {
                    "role": "user",
                    "content": prompt_text
                }
            ]
        })

        # 5. Call Bedrock
        response = bedrock.invoke_model(
            modelId=model_id,
            body=request_body
        )

        # 6. Parse response
        response_body = json.loads(response.get('body').read())
        generated_report = response_body['content'][0]['text']

        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST'
            },
            'body': json.dumps({
                'report': generated_report
            })
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
