package devPilot.backend.DTO;

import java.util.UUID;

public record UserResponse(
        Long id,
        String githubId,
        String githubUserName,
        String displayName,
        String avatarUrl

) {

}
