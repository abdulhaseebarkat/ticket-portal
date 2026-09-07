package com.plantit.integration.ai;

import com.plantit.integration.ai.model.ClassificationResult;

public interface ComplaintClassificationProvider {
    ClassificationResult classifyMessage(String message);
}
