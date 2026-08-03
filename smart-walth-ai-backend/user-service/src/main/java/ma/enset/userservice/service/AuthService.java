package ma.enset.userservice.service;

import lombok.extern.slf4j.Slf4j;
import ma.enset.userservice.dto.TokenResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@Service
@Slf4j
public class AuthService {

    @Value("${keycloak.admin.server-url}")
    private String keycloakUrl;

    @Value("${keycloak.admin.realm}")
    private String realm;

    @Value("${keycloak.login-client.client-id}")
    private String loginClientId;

    @Value("${keycloak.login-client.client-secret}")
    private String loginClientSecret;

    private final RestClient restClient = RestClient.create();

    public TokenResponse login(String username, String password) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("client_id", loginClientId);
        form.add("client_secret", loginClientSecret);
        form.add("grant_type", "password");
        form.add("username", username);
        form.add("password", password);

        return callTokenEndpoint(form, "Invalid username or password");
    }

    public TokenResponse refreshToken(String refreshToken) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("client_id", loginClientId);
        form.add("client_secret", loginClientSecret);
        form.add("grant_type", "refresh_token");
        form.add("refresh_token", refreshToken);

        return callTokenEndpoint(form, "Invalid or expired refresh token");
    }

    private TokenResponse callTokenEndpoint(MultiValueMap<String, String> form, String errorMessage) {
        String tokenUrl = keycloakUrl + "/realms/" + realm + "/protocol/openid-connect/token";

        try {
            Map<String, Object> response = restClient.post()
                    .uri(tokenUrl)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(Map.class);

            return TokenResponse.builder()
                    .accessToken((String) response.get("access_token"))
                    .refreshToken((String) response.get("refresh_token"))
                    .expiresIn(Long.valueOf(response.get("expires_in").toString()))
                    .tokenType((String) response.get("token_type"))
                    .build();

        } catch (HttpClientErrorException.Unauthorized | HttpClientErrorException.BadRequest e) {
            // Keycloak returns 400/401 for bad credentials or invalid/expired refresh token
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, errorMessage);
        } catch (Exception e) {
            log.error("Unexpected error calling Keycloak token endpoint", e);
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Authentication service unavailable");
        }
    }
}