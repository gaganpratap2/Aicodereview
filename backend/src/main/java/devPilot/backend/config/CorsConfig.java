package devPilot.backend.config;

// CORS (Cross-Origin Resource Sharing) is important when
// frontend and backend run on different origins.
//
// Example:
// Frontend: http://localhost:3000
// Backend:  http://localhost:8080
//
// CORS answers:
// "Is http://localhost:3000 allowed to access http://localhost:8080?"

import java.util.Arrays;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class CorsConfig {

    @Bean
    public CorsConfigurationSource corsConfigurationSource(
            @Value("${app.cors.allowed-origins}") String allowedOrigins) {

        // Read comma-separated origins from application.properties
        // or application.yml.
        //
        // Example:
        // app.cors.allowed-origins=http://localhost:3000,http://localhost:5173

        List<String> origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .toList();

        CorsConfiguration config = new CorsConfiguration();

        // Allowed frontend origins
        config.setAllowedOrigins(origins);

        // HTTP methods allowed from the frontend
        config.setAllowedMethods(
                List.of(
                        "GET",
                        "POST",
                        "PUT",
                        "PATCH",
                        "DELETE",
                        "OPTIONS"
                )
        );

        // Allow all request headers
        config.setAllowedHeaders(List.of("*"));

        // Required if you use cookies/session authentication.
        // Also relevant if the frontend sends credentials.
        config.setAllowCredentials(true);

        // Browser can cache the CORS preflight response for 1 hour.
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        // Apply this CORS configuration to all endpoints.
        source.registerCorsConfiguration("/**", config);

        return source;
    }
}
