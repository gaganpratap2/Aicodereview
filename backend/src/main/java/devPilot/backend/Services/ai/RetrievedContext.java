package devPilot.backend.Services.ai;

import java.util.List;

import devPilot.backend.DTO.CitationDto;

public record RetrievedContext(
        List<CitationDto> citations,
        String contextText) {
}