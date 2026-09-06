package ma.enset.portfolioservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import ma.enset.portfolioservice.enums.WalletType;

@Data
public class CreateWalletRequest {

    @NotBlank(message = "Wallet name is required")
    private String name;

    @NotNull(message = "Wallet type is required")
    private WalletType type;

    private String currency = "MAD";
}
