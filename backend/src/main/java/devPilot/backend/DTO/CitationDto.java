package devPilot.backend.DTO;


public record CitationDto(
        String filePath,
        Integer startLine,
        Integer endLine,
        String language) {
}