"""Token encryption utilities using Fernet symmetric encryption.

This module provides industry-standard token encryption/decryption functions
following patterns used by Auth0, AWS Secrets Manager, and other OAuth providers.

Fernet guarantees that a message encrypted using it cannot be manipulated or read
without the key. It uses AES 128 in CBC mode and PKCS7 padding, with HMAC for authentication.
"""

import os
from typing import Optional
from cryptography.fernet import Fernet, InvalidToken


def _get_cipher() -> Fernet:
    """Get Fernet cipher instance from environment variable.

    Returns:
        Fernet: Configured cipher instance

    Raises:
        ValueError: If ENCRYPTION_KEY environment variable is not set
    """
    encryption_key = os.getenv("ENCRYPTION_KEY")
    if not encryption_key:
        raise ValueError(
            "ENCRYPTION_KEY environment variable is not set. "
            "Generate one with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
        )
    return Fernet(encryption_key.encode())


def encrypt_token(token: str) -> str:
    """Encrypt a token string using Fernet symmetric encryption.

    This function is safe to use for OAuth access tokens, refresh tokens,
    and other sensitive credentials that need to be stored in a database.

    Args:
        token: The plaintext token to encrypt

    Returns:
        str: The encrypted token as a base64-encoded string

    Raises:
        ValueError: If ENCRYPTION_KEY is not configured

    Example:
        >>> encrypted = encrypt_token("user_access_token_abc123")
        >>> # Store encrypted in database
    """
    cipher = _get_cipher()
    encrypted_bytes = cipher.encrypt(token.encode())
    return encrypted_bytes.decode()


def decrypt_token(encrypted_token: str) -> Optional[str]:
    """Decrypt a token string that was encrypted with encrypt_token().

    This function safely handles decryption failures and returns None
    instead of raising an exception, following defensive programming practices.

    Args:
        encrypted_token: The encrypted token (base64-encoded string)

    Returns:
        Optional[str]: The decrypted plaintext token, or None if decryption fails

    Example:
        >>> decrypted = decrypt_token(encrypted_from_db)
        >>> if decrypted:
        >>>     # Use the decrypted token
        >>> else:
        >>>     # Token is invalid or corrupted, re-authenticate user
    """
    try:
        cipher = _get_cipher()
        decrypted_bytes = cipher.decrypt(encrypted_token.encode())
        return decrypted_bytes.decode()
    except (InvalidToken, ValueError, Exception) as e:
        # Log the error but don't expose details to prevent information leakage
        print(f"⚠️  Token decryption failed: {type(e).__name__}")
        return None
