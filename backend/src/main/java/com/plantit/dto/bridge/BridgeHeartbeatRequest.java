package com.plantit.dto.bridge;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BridgeHeartbeatRequest {
    /** "connected" | "disconnected" | "logged_out" */
    @NotBlank
    private String status;
}
