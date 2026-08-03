package ma.enset.userservice.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class TokenResponse {

    @JsonProperty("access_token")
    String accessToken;

    @JsonProperty("refresh_token")
    String refreshToken;

    @JsonProperty("expires_in")
    Long expiresIn;

    @JsonProperty("token_type")
    String tokenType;
}