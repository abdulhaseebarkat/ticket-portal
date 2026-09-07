package com.plantit.security;

import com.plantit.config.AuthProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;

/**
 * Issues and validates the signed session tokens for the one portal login
 * account. Puts the previously-unused `app.auth.token-secret` /
 * `token-expiration-minutes` config (left over from an earlier, never
 * finished auth attempt) to actual use.
 */
@Component
public class JwtService {
    private static final Logger log = LoggerFactory.getLogger(JwtService.class);
    private static final int MIN_KEY_BYTES = 32; // HMAC-SHA256 needs >= 256 bits

    private final AuthProperties authProperties;

    public JwtService(AuthProperties authProperties) {
        this.authProperties = authProperties;
        if ("change-me".equals(authProperties.getTokenSecret())) {
            log.warn("app.auth.token-secret (APP_AUTH_TOKEN_SECRET) is still the default 'change-me' value - "
                    + "set it to a long random value before deploying anywhere real.");
        }
    }

    public String generateToken(String email) {
        Instant now = Instant.now();
        Instant expiry = now.plusSeconds(authProperties.getTokenExpirationMinutes() * 60L);
        return Jwts.builder()
                .subject(email)
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiry))
                .signWith(signingKey())
                .compact();
    }

    /** Returns the token's subject (the account email) if valid and unexpired, otherwise null. */
    public String validateAndGetEmail(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(signingKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            return claims.getSubject();
        } catch (Exception e) {
            return null;
        }
    }

    private SecretKey signingKey() {
        byte[] keyBytes = authProperties.getTokenSecret().getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < MIN_KEY_BYTES) {
            byte[] padded = new byte[MIN_KEY_BYTES];
            System.arraycopy(keyBytes, 0, padded, 0, Math.min(keyBytes.length, MIN_KEY_BYTES));
            keyBytes = padded;
        }
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
