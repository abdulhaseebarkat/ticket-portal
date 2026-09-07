package com.plantit.service.support;

import com.plantit.entity.Employee;
import com.plantit.entity.WhatsAppGroup;
import com.plantit.entity.WhatsAppMessage;
import com.plantit.integration.ai.model.ClassificationResult;
import lombok.Builder;
import lombok.Getter;

import java.time.OffsetDateTime;

/**
 * Everything ComplaintPipeline needs to apply one classified WhatsApp
 * message, regardless of which entry point it came from (the WhatsApp
 * Simulator, the Meta Cloud webhook, or the group bridge).
 */
@Getter
@Builder
public class IngestionContext {
    private ClassificationResult classification;
    private String messageText;
    private Employee sender;
    /** Display name to attribute this action to (employee name, or a raw phone/sender name fallback). */
    private String senderLabel;
    private boolean supportStaff;
    private WhatsAppGroup group;
    /** The raw message row already persisted for this event, so it can be linked to whichever complaint it concerns. */
    private WhatsAppMessage whatsAppMessage;
    private String quotedExternalMessageId;
    private OffsetDateTime now;
    private String complaintNumberPrefix;
}
