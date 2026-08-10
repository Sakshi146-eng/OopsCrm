import secrets
seckey = secrets.token_hex(32)  # 32 bytes = 256 bits for strong security
print(seckey)