# Secrets Management

This folder contains all sensitive configuration for the Tinder for Languages application.

## Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your actual values in `.env`

3. The `.env` file is gitignored and will never be committed

## Required Secrets

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `AWS_ACCESS_KEY_ID` | AWS IAM user access key | AWS Console → IAM → Users → Security credentials |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM user secret key | AWS Console → IAM → Users → Security credentials |
| `AWS_ACCOUNT_ID` | Your AWS account ID | AWS Console → Top right → Account ID |
| `POSTGRES_PASSWORD` | Database password | Generate a secure password |
| `SECRET_KEY` | Application secret key | Generate with `openssl rand -hex 32` |
| `OPENAI_API_KEY` | OpenAI API key (optional) | https://platform.openai.com/api-keys |

## Security Notes

- **NEVER** commit `.env` to git
- **NEVER** share these credentials
- Rotate credentials periodically
- Use AWS IAM roles in production when possible
