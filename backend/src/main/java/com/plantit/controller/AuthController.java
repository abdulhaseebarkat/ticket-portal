package com.plantit.controller;

import com.plantit.dto.LoginRequest;
import com.plantit.dto.auth.ChangePasswordRequest;
import com.plantit.dto.auth.LoginResponse;
import com.plantit.entity.AdminAccount;
import com.plantit.repository.AdminAccountRepository;
import com.plantit.security.JwtService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AdminAccountRepository adminAccountRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthController(AdminAccountRepository adminAccountRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.adminAccountRepository = adminAccountRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        return adminAccountRepository.findByEmailIgnoreCase(request.getEmail())
                .filter(account -> passwordEncoder.matches(request.getPassword(), account.getPasswordHash()))
                .<ResponseEntity<?>>map(account -> ResponseEntity.ok(new LoginResponse(jwtService.generateToken(account.getEmail()), account.getEmail())))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Invalid email or password")));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(Map.of("email", authentication.getName()));
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(Authentication authentication, @Valid @RequestBody ChangePasswordRequest request) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        AdminAccount account = adminAccountRepository.findByEmailIgnoreCase(authentication.getName()).orElseThrow();
        if (!passwordEncoder.matches(request.getCurrentPassword(), account.getPasswordHash())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Current password is incorrect"));
        }
        account.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        account.setUpdatedAt(OffsetDateTime.now());
        adminAccountRepository.save(account);
        return ResponseEntity.ok(Map.of("message", "Password updated"));
    }
}
