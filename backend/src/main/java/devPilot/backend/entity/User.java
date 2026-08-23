package devPilot.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "users")
@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "github_id", unique = true, nullable = false)
    private Long githubId;

    @Column(name = "github_username", nullable = false, length = 255)
    private String gitHubUserName;

    private String displayName;
    private String email;
    private String avatarUrl;
    private String accessToken;
    private String tokenScope;

    private Instant createdAt;

    @PrePersist
    void onCreated() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
