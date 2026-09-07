package com.plantit.integration.ai.model;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClassificationResult {
    private boolean isComplaint;
    private String category;
    private String equipment;
    private String machine;
    private String equipmentReference;
    private String locationHint;
    private String intent;
    private String priority;
    private double confidence;
}
